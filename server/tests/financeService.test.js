import { jest } from '@jest/globals';
import mongoose from 'mongoose';

const FINANCIAL_EVENT_TYPES = Object.freeze([
  'inventory_receipt',
  'inventory_damage',
  'cogs_recognition',
  'supplier_invoice',
  'supplier_payment',
  'sales_invoice',
  'customer_payment',
  'manual_adjustment',
  'reversal',
]);

const JOURNAL_ENTRY_DIRECTIONS = Object.freeze(['debit', 'credit']);
const FINANCE_ACCOUNT_TYPES = Object.freeze(['asset', 'liability', 'equity', 'revenue', 'expense']);

const Batch = {
  find: jest.fn(),
};

const FinancialEvent = jest.fn(function FinancialEvent(attrs) {
  Object.assign(this, attrs);
  this._id = 'event-1';
  this.eventNumber = 'FIN-TEST';
  this.save = jest.fn().mockResolvedValue(this);
});
FinancialEvent.find = jest.fn();

const Item = {
  find: jest.fn(),
};

const JournalEntry = {
  insertMany: jest.fn(async (entries) => entries.map((entry, index) => ({
    ...entry,
    _id: `journal-${index + 1}`,
  }))),
  aggregate: jest.fn(),
  find: jest.fn(),
};

const SalesHistory = {
  findById: jest.fn(),
};

jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  FINANCE_ACCOUNT_TYPES,
  FinancialEvent,
  Item,
  JournalEntry,
  SalesHistory,
}));

jest.unstable_mockModule('../models/financialEvent.model.js', () => ({
  FINANCIAL_EVENT_TYPES,
}));

jest.unstable_mockModule('../models/journalEntry.model.js', () => ({
  JOURNAL_ENTRY_DIRECTIONS,
}));

let FinanceService;
const session = { id: 'session-1', inTransaction: jest.fn(() => true) };

const buildFindQuery = (value) => ({
  sort: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(value),
});

const buildModelQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(value),
});

describe('FinanceService ledger foundation', () => {
  beforeAll(async () => {
    FinanceService = await import('../services/finance/finance.service.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    session.inTransaction.mockReturnValue(true);
    Batch.find.mockReturnValue(buildModelQuery([]));
    Item.find.mockReturnValue(buildModelQuery([]));
    SalesHistory.findById.mockReturnValue(buildModelQuery(null));
  });

  it('builds normalized journal lines with known account metadata', () => {
    const line = FinanceService.buildJournalLine({
      direction: 'debit',
      account: FinanceService.FINANCE_ACCOUNTS.INVENTORY_ASSET,
      amount: '1250.50',
      memo: 'Inventory receipt',
    });

    expect(line).toEqual({
      direction: 'debit',
      accountType: 'asset',
      accountCode: '1200',
      accountName: 'Inventory Asset',
      amount: 1250.5,
      memo: 'Inventory receipt',
      metadata: undefined,
    });
  });

  it('records balanced financial events and journal entries', async () => {
    const result = await FinanceService.recordFinancialEvent({
      eventType: 'inventory_receipt',
      amount: 500,
      currency: 'inr',
      session,
      source: {
        module: 'inventory',
        model: 'Batch',
      },
      journalEntries: [
        FinanceService.buildJournalLine({
          direction: 'debit',
          account: FinanceService.FINANCE_ACCOUNTS.INVENTORY_ASSET,
          amount: 500,
        }),
        FinanceService.buildJournalLine({
          direction: 'credit',
          account: FinanceService.FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE,
          amount: 500,
        }),
      ],
    });

    expect(FinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'inventory_receipt',
      amount: 500,
      currency: 'INR',
      journalEntryCount: 2,
      totalDebit: 500,
      totalCredit: 500,
    }));
    expect(FinancialEvent.mock.instances[0].save).toHaveBeenCalledWith({ session });
    expect(JournalEntry.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          financialEventId: 'event-1',
          lineNumber: 1,
          direction: 'debit',
          accountCode: '1200',
          amount: 500,
        }),
        expect.objectContaining({
          financialEventId: 'event-1',
          lineNumber: 2,
          direction: 'credit',
          accountCode: '2000',
          amount: 500,
        }),
      ],
      { session, ordered: true },
    );
    expect(result.event).toBe(FinancialEvent.mock.instances[0]);
    expect(result.journalEntries).toHaveLength(2);
  });

  it('records customer payments as cash debit and receivables credit', async () => {
    await FinanceService.recordCustomerPaymentEvent({
      amount: 250,
      salesInvoiceId: '507f1f77bcf86cd799439011',
      paymentReceivedId: '507f1f77bcf86cd799439012',
      warehouseId: '507f1f77bcf86cd799439015',
      actorId: '507f1f77bcf86cd799439014',
      session,
    });

    expect(FinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'customer_payment',
      amount: 250,
      referenceType: 'SalesInvoice',
      journalEntryCount: 2,
      totalDebit: 250,
      totalCredit: 250,
    }));
    expect(FinancialEvent.mock.calls[0][0].referenceId.toString()).toBe('507f1f77bcf86cd799439011');
    expect(FinancialEvent.mock.calls[0][0].source.documentId.toString()).toBe('507f1f77bcf86cd799439012');
    expect(JournalEntry.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          direction: 'debit',
          accountCode: '1000',
          accountName: 'Cash and Bank',
          amount: 250,
        }),
        expect.objectContaining({
          direction: 'credit',
          accountCode: '1100',
          accountName: 'Accounts Receivable',
          amount: 250,
        }),
      ],
      { session, ordered: true },
    );
  });

  it('records canonical order customer payments against order receivables', async () => {
    await FinanceService.recordCustomerPaymentEvent({
      amount: 180,
      orderId: '507f1f77bcf86cd799439031',
      paymentReceivedId: '507f1f77bcf86cd799439032',
      warehouseId: '507f1f77bcf86cd799439015',
      actorId: '507f1f77bcf86cd799439014',
      session,
    });

    expect(FinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'customer_payment',
      amount: 180,
      referenceType: 'Order',
      journalEntryCount: 2,
      totalDebit: 180,
      totalCredit: 180,
    }));
    expect(FinancialEvent.mock.calls[0][0].referenceId.toString()).toBe('507f1f77bcf86cd799439031');
    expect(FinancialEvent.mock.calls[0][0].source.documentId.toString()).toBe('507f1f77bcf86cd799439032');
    expect(JournalEntry.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          direction: 'debit',
          accountCode: '1000',
          accountName: 'Cash and Bank',
          amount: 180,
          referenceType: 'Order',
        }),
        expect.objectContaining({
          direction: 'credit',
          accountCode: '1100',
          accountName: 'Accounts Receivable',
          amount: 180,
          referenceType: 'Order',
        }),
      ],
      { session, ordered: true },
    );
  });

  it('records confirmed order sales as receivables debit and revenue credit', async () => {
    const deliveryDate = new Date('2026-01-10T00:00:00Z');
    const occurredAt = new Date('2026-01-20T00:00:00Z');

    await FinanceService.recordConfirmedSaleReceivableEvent({
      amount: 900,
      orderId: '507f1f77bcf86cd799439031',
      packageId: '507f1f77bcf86cd799439032',
      packageNumber: 'PKG-TEST',
      salesHistoryId: '507f1f77bcf86cd799439033',
      warehouseId: '507f1f77bcf86cd799439034',
      occurredAt,
      deliveryDate,
      actorId: '507f1f77bcf86cd799439035',
      session,
    });

    expect(FinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'sales_invoice',
      amount: 900,
      referenceType: 'Order',
      idempotencyKey: 'order-sale-confirmation-package:507f1f77bcf86cd799439032',
      memo: 'Confirmed sale receivable recorded',
      journalEntryCount: 2,
      totalDebit: 900,
      totalCredit: 900,
    }));
    expect(FinancialEvent.mock.calls[0][0].referenceId.toString()).toBe('507f1f77bcf86cd799439031');
    expect(FinancialEvent.mock.calls[0][0].source).toEqual(expect.objectContaining({
      module: 'sales',
      model: 'SalesHistory',
      documentNumber: 'PKG-TEST',
    }));
    expect(FinancialEvent.mock.calls[0][0].source.documentId.toString()).toBe('507f1f77bcf86cd799439033');
    expect(FinancialEvent.mock.calls[0][0].metadata).toEqual(expect.objectContaining({
      packageId: '507f1f77bcf86cd799439032',
      deliveryDate,
    }));
    expect(JournalEntry.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          direction: 'debit',
          accountCode: '1100',
          accountName: 'Accounts Receivable',
          amount: 900,
          referenceType: 'Order',
        }),
        expect.objectContaining({
          direction: 'credit',
          accountCode: '4000',
          accountName: 'Sales Revenue',
          amount: 900,
          referenceType: 'Order',
        }),
      ],
      { session, ordered: true },
    );
  });

  it('records confirmed order sale COGS from sales history item costs', async () => {
    const orderId = '507f1f77bcf86cd799439031';
    const packageId = '507f1f77bcf86cd799439032';
    const salesHistoryId = '507f1f77bcf86cd799439033';
    const itemIdOne = '507f1f77bcf86cd799439041';
    const itemIdTwo = '507f1f77bcf86cd799439042';
    const productId = '507f1f77bcf86cd799439043';
    const batchId = '507f1f77bcf86cd799439044';
    const deliveryDate = new Date('2026-01-10T00:00:00Z');
    const occurredAt = new Date('2026-01-20T00:00:00Z');

    SalesHistory.findById.mockReturnValue(buildModelQuery({
      products: [
        {
          productId,
          batchId,
          quantity: 2,
          itemIds: [itemIdOne, itemIdTwo],
        },
      ],
    }));
    Item.find.mockReturnValue(buildModelQuery([
      {
        _id: itemIdOne,
        productId,
        batchId: { _id: batchId, unitCost: 70 },
        purchasePrice: 80,
      },
      {
        _id: itemIdTwo,
        productId,
        batchId: { _id: batchId, unitCost: 70 },
      },
    ]));

    await FinanceService.recordConfirmedSaleReceivableEvent({
      amount: 900,
      orderId,
      packageId,
      packageNumber: 'PKG-TEST',
      salesHistoryId,
      warehouseId: '507f1f77bcf86cd799439034',
      occurredAt,
      deliveryDate,
      actorId: '507f1f77bcf86cd799439035',
      session,
    });

    expect(SalesHistory.findById).toHaveBeenCalledWith(salesHistoryId);
    expect(Item.find).toHaveBeenCalledWith({
      _id: { $in: [expect.any(mongoose.Types.ObjectId), expect.any(mongoose.Types.ObjectId)] },
    });
    expect(FinancialEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventType: 'cogs_recognition',
      amount: 150,
      referenceType: 'Order',
      idempotencyKey: `order-sale-cogs-package:${packageId}`,
      memo: 'Cost of goods sold recognized for confirmed sale',
      journalEntryCount: 2,
      totalDebit: 150,
      totalCredit: 150,
    }));
    expect(FinancialEvent.mock.calls[1][0].referenceId.toString()).toBe(orderId);
    expect(FinancialEvent.mock.calls[1][0].source).toEqual(expect.objectContaining({
      module: 'inventory',
      model: 'SalesHistory',
      documentNumber: 'PKG-TEST',
    }));
    expect(FinancialEvent.mock.calls[1][0].source.documentId.toString()).toBe(salesHistoryId);
    expect(FinancialEvent.mock.calls[1][0].metadata).toEqual(expect.objectContaining({
      packageId,
      deliveryDate,
      itemIds: [itemIdOne, itemIdTwo],
      batchIds: [batchId],
      productIds: [productId],
    }));
    expect(JournalEntry.insertMany).toHaveBeenNthCalledWith(
      2,
      [
        expect.objectContaining({
          direction: 'debit',
          accountCode: '5000',
          accountName: 'Cost of Goods Sold',
          amount: 150,
          referenceType: 'Order',
        }),
        expect.objectContaining({
          direction: 'credit',
          accountCode: '1200',
          accountName: 'Inventory Asset',
          amount: 150,
          referenceType: 'Order',
        }),
      ],
      { session, ordered: true },
    );
  });

  it('records damaged returned items as inventory loss against inventory asset', async () => {
    const returnId = '507f1f77bcf86cd799439051';
    const itemIdOne = '507f1f77bcf86cd799439052';
    const itemIdTwo = '507f1f77bcf86cd799439053';
    const productId = '507f1f77bcf86cd799439054';
    const batchId = '507f1f77bcf86cd799439055';

    Item.find.mockReturnValue(buildModelQuery([
      {
        _id: itemIdOne,
        productId,
        batchId: { _id: batchId, unitCost: 45 },
        purchasePrice: 55,
      },
      {
        _id: itemIdTwo,
        productId,
        batchId: { _id: batchId, unitCost: 45 },
      },
    ]));

    await FinanceService.recordInventoryDamageForItemsEvent({
      itemIds: [itemIdOne, itemIdTwo],
      referenceType: 'Return',
      referenceId: returnId,
      warehouseId: '507f1f77bcf86cd799439056',
      actorId: '507f1f77bcf86cd799439057',
      movementType: 'damage',
      notes: 'Return disposition damaged',
      session,
    });

    expect(FinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'inventory_damage',
      amount: 100,
      referenceType: 'Return',
      memo: 'Return disposition damaged',
      journalEntryCount: 2,
      totalDebit: 100,
      totalCredit: 100,
    }));
    expect(FinancialEvent.mock.calls[0][0].referenceId.toString()).toBe(returnId);
    expect(FinancialEvent.mock.calls[0][0].source).toEqual(expect.objectContaining({
      module: 'inventory',
      model: 'Return',
    }));
    expect(FinancialEvent.mock.calls[0][0].source.documentId.toString()).toBe(returnId);
    expect(FinancialEvent.mock.calls[0][0].metadata).toEqual(expect.objectContaining({
      itemIds: [itemIdOne, itemIdTwo],
      batchIds: [batchId],
      productIds: [productId],
      movementType: 'damage',
    }));
    expect(JournalEntry.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          direction: 'debit',
          accountCode: '5100',
          accountName: 'Inventory Damage and Loss',
          amount: 100,
          referenceType: 'Return',
        }),
        expect.objectContaining({
          direction: 'credit',
          accountCode: '1200',
          accountName: 'Inventory Asset',
          amount: 100,
          referenceType: 'Return',
        }),
      ],
      { session, ordered: true },
    );
  });

  it('rejects unbalanced journal entries before writing anything', async () => {
    await expect(FinanceService.recordFinancialEvent({
      eventType: 'manual_adjustment',
      amount: 500,
      session,
      journalEntries: [
        FinanceService.buildJournalLine({
          direction: 'debit',
          account: FinanceService.FINANCE_ACCOUNTS.INVENTORY_ASSET,
          amount: 500,
        }),
        FinanceService.buildJournalLine({
          direction: 'credit',
          account: FinanceService.FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE,
          amount: 400,
        }),
      ],
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Journal entries must balance.',
    });

    expect(FinancialEvent).not.toHaveBeenCalled();
    expect(JournalEntry.insertMany).not.toHaveBeenCalled();
  });

  it('rejects event amounts that do not match balanced journal totals', async () => {
    await expect(FinanceService.recordFinancialEvent({
      eventType: 'manual_adjustment',
      amount: 50,
      session,
      journalEntries: [
        FinanceService.buildJournalLine({
          direction: 'debit',
          account: FinanceService.FINANCE_ACCOUNTS.INVENTORY_ASSET,
          amount: 100,
        }),
        FinanceService.buildJournalLine({
          direction: 'credit',
          account: FinanceService.FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE,
          amount: 100,
        }),
      ],
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Financial event amount must match the journal total.',
    });

    expect(FinancialEvent).not.toHaveBeenCalled();
    expect(JournalEntry.insertMany).not.toHaveBeenCalled();
  });

  it('requires callers to provide a session so event and journal writes stay atomic', async () => {
    await expect(FinanceService.recordFinancialEvent({
      eventType: 'manual_adjustment',
      amount: 100,
      journalEntries: [
        FinanceService.buildJournalLine({
          direction: 'debit',
          account: FinanceService.FINANCE_ACCOUNTS.INVENTORY_ASSET,
          amount: 100,
        }),
        FinanceService.buildJournalLine({
          direction: 'credit',
          account: FinanceService.FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE,
          amount: 100,
        }),
      ],
    })).rejects.toMatchObject({
      statusCode: 500,
      message: 'Financial event recording requires a Mongo session.',
    });

    expect(FinancialEvent).not.toHaveBeenCalled();
    expect(JournalEntry.insertMany).not.toHaveBeenCalled();
  });

  it('requires the provided session to be inside an active transaction', async () => {
    session.inTransaction.mockReturnValue(false);

    await expect(FinanceService.recordFinancialEvent({
      eventType: 'manual_adjustment',
      amount: 100,
      session,
      journalEntries: [
        FinanceService.buildJournalLine({
          direction: 'debit',
          account: FinanceService.FINANCE_ACCOUNTS.INVENTORY_ASSET,
          amount: 100,
        }),
        FinanceService.buildJournalLine({
          direction: 'credit',
          account: FinanceService.FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE,
          amount: 100,
        }),
      ],
    })).rejects.toMatchObject({
      statusCode: 500,
      message: 'Financial event recording requires an active Mongo transaction.',
    });

    expect(FinancialEvent).not.toHaveBeenCalled();
    expect(JournalEntry.insertMany).not.toHaveBeenCalled();
  });

  it('expands date-only endDate filters to the full day for ledger account balances', async () => {
    JournalEntry.aggregate.mockResolvedValue([]);

    await FinanceService.getJournalAccountBalances({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      accountCodes: ['4000'],
    });

    expect(JournalEntry.aggregate.mock.calls[0][0][0]).toEqual({
      $match: {
        occurredAt: {
          $gte: new Date('2026-04-01T00:00:00.000Z'),
          $lte: new Date('2026-04-30T23:59:59.999Z'),
        },
        accountCode: { $in: ['4000'] },
      },
    });
  });

  it('returns signed profit and loss balances so reversal-only return periods are visible', async () => {
    JournalEntry.aggregate.mockResolvedValue([
      {
        accountCode: '4000',
        accountName: 'Sales Revenue',
        netCredit: -500,
        netDebit: 500,
      },
      {
        accountCode: '5000',
        accountName: 'Cost of Goods Sold',
        netDebit: -125,
        netCredit: 125,
      },
      {
        accountCode: '5100',
        accountName: 'Inventory Damage and Loss',
        netDebit: 40,
        netCredit: -40,
      },
    ]);

    const result = await FinanceService.getProfitAndLossFromJournal();

    expect(result).toEqual({
      revenue: -500,
      cogs: -125,
      inventoryLoss: 40,
      grossProfit: -375,
      netInventoryProfit: -415,
      balances: expect.any(Array),
    });
    expect(JournalEntry.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      {
        $match: {
          accountCode: { $in: ['4000', '5000', '5100'] },
        },
      },
    ]));
  });

  it('reverses only unreversed source events for a source document', async () => {
    const unreversedEvent = {
      _id: '507f1f77bcf86cd799439021',
      eventNumber: 'FIN-ORIGINAL-1',
      amount: 100,
      currency: 'INR',
      referenceType: 'SalesInvoice',
      referenceId: '507f1f77bcf86cd799439011',
    };
    const alreadyReversedEvent = {
      _id: '507f1f77bcf86cd799439022',
      eventNumber: 'FIN-ORIGINAL-2',
      amount: 50,
      currency: 'INR',
      referenceType: 'SalesInvoice',
      referenceId: '507f1f77bcf86cd799439011',
    };

    FinancialEvent.find
      .mockReturnValueOnce(buildFindQuery([unreversedEvent, alreadyReversedEvent]))
      .mockReturnValueOnce(buildFindQuery([
        { reversalOfEventId: alreadyReversedEvent._id },
      ]));
    JournalEntry.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue([
        {
          lineNumber: 1,
          direction: 'debit',
          accountType: 'asset',
          accountCode: '1000',
          accountName: 'Cash and Bank',
          amount: 100,
        },
        {
          lineNumber: 2,
          direction: 'credit',
          accountType: 'asset',
          accountCode: '1100',
          accountName: 'Accounts Receivable',
          amount: 100,
        },
      ]),
    });

    const reversals = await FinanceService.reverseUnreversedFinancialEventsForSource({
      eventType: 'customer_payment',
      sourceModel: 'PaymentReceived',
      sourceDocumentId: '507f1f77bcf86cd799439012',
      actorId: '507f1f77bcf86cd799439014',
      session,
    });

    expect(FinancialEvent.find).toHaveBeenNthCalledWith(1, {
      eventType: 'customer_payment',
      'source.model': 'PaymentReceived',
      'source.documentId': expect.any(mongoose.Types.ObjectId),
    });
    expect(FinancialEvent.find).toHaveBeenNthCalledWith(2, {
      eventType: 'reversal',
      reversalOfEventId: { $in: [unreversedEvent._id, alreadyReversedEvent._id] },
    });
    expect(JournalEntry.find).toHaveBeenCalledWith({ financialEventId: unreversedEvent._id });
    expect(FinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'reversal',
      amount: 100,
      totalDebit: 100,
      totalCredit: 100,
    }));
    expect(FinancialEvent).toHaveBeenCalledTimes(1);
    expect(FinancialEvent.mock.calls[0][0].reversalOfEventId.toString()).toBe(unreversedEvent._id);
    expect(reversals).toHaveLength(1);
  });
});
