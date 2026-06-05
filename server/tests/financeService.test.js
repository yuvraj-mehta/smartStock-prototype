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

const FinancialEvent = jest.fn(function FinancialEvent(attrs) {
  Object.assign(this, attrs);
  this._id = 'event-1';
  this.eventNumber = 'FIN-TEST';
  this.save = jest.fn().mockResolvedValue(this);
});
FinancialEvent.find = jest.fn();

const JournalEntry = {
  insertMany: jest.fn(async (entries) => entries.map((entry, index) => ({
    ...entry,
    _id: `journal-${index + 1}`,
  }))),
  aggregate: jest.fn(),
  find: jest.fn(),
};

jest.unstable_mockModule('../models/index.js', () => ({
  FINANCE_ACCOUNT_TYPES,
  FinancialEvent,
  JournalEntry,
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

describe('FinanceService ledger foundation', () => {
  beforeAll(async () => {
    FinanceService = await import('../services/finance/finance.service.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    session.inTransaction.mockReturnValue(true);
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
