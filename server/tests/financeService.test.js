import { jest } from '@jest/globals';

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

describe('FinanceService ledger foundation', () => {
  beforeAll(async () => {
    FinanceService = await import('../services/finance/finance.service.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(FinancialEvent.mock.instances[0].save).toHaveBeenCalledWith({ session: undefined });
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
      { session: undefined, ordered: true },
    );
    expect(result.event).toBe(FinancialEvent.mock.instances[0]);
    expect(result.journalEntries).toHaveLength(2);
  });

  it('rejects unbalanced journal entries before writing anything', async () => {
    await expect(FinanceService.recordFinancialEvent({
      eventType: 'manual_adjustment',
      amount: 500,
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
});
