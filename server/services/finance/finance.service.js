import mongoose from 'mongoose';
import { ApiError } from '../../middlewares/error.handler.js';
import {
  Batch,
  FINANCE_ACCOUNT_TYPES,
  FinancialEvent,
  Item,
  JournalEntry,
  SalesHistory,
} from '../../models/index.js';
import { FINANCIAL_EVENT_TYPES } from '../../models/financialEvent.model.js';
import { JOURNAL_ENTRY_DIRECTIONS } from '../../models/journalEntry.model.js';

const EPSILON = 0.000001;
const DEFAULT_CURRENCY = 'INR';

export const FINANCE_ACCOUNTS = Object.freeze({
  CASH: {
    accountType: 'asset',
    accountCode: '1000',
    accountName: 'Cash and Bank',
  },
  ACCOUNTS_RECEIVABLE: {
    accountType: 'asset',
    accountCode: '1100',
    accountName: 'Accounts Receivable',
  },
  INVENTORY_ASSET: {
    accountType: 'asset',
    accountCode: '1200',
    accountName: 'Inventory Asset',
  },
  ACCOUNTS_PAYABLE: {
    accountType: 'liability',
    accountCode: '2000',
    accountName: 'Accounts Payable',
  },
  SALES_REVENUE: {
    accountType: 'revenue',
    accountCode: '4000',
    accountName: 'Sales Revenue',
  },
  COST_OF_GOODS_SOLD: {
    accountType: 'expense',
    accountCode: '5000',
    accountName: 'Cost of Goods Sold',
  },
  INVENTORY_LOSS: {
    accountType: 'expense',
    accountCode: '5100',
    accountName: 'Inventory Damage and Loss',
  },
});

const runAggregate = (aggregate, session) => (session ? aggregate.session(session) : aggregate);
const runQuery = (query, session) => (session ? query.session(session) : query);

const createFinanceError = (statusCode, message) => new ApiError(statusCode, message);

const isBlank = (value) => value === undefined || value === null || value === '';

const normalizeCurrency = (currency = DEFAULT_CURRENCY) => String(currency || DEFAULT_CURRENCY).trim().toUpperCase();

const normalizeObjectId = (id) => {
  if (!id) return undefined;
  return id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id);
};

const normalizeId = (id) => (id?._id || id)?.toString();

const uniqueIds = (ids = []) => [
  ...new Set(ids.map(normalizeId).filter(Boolean)),
];

const requireValidObjectId = (id, label) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createFinanceError(400, `${label} must be a valid Mongo ID.`);
  }

  return normalizeObjectId(id);
};

const parseNonNegativeAmount = (value, label = 'Amount') => {
  if (isBlank(value)) {
    throw createFinanceError(400, `${label} is required.`);
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw createFinanceError(400, `${label} must be a non-negative number.`);
  }

  return amount;
};

const parsePositiveAmount = (value, label = 'Amount') => {
  const amount = parseNonNegativeAmount(value, label);
  if (amount <= 0) {
    throw createFinanceError(400, `${label} must be a positive number.`);
  }

  return amount;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseBoundaryDate = (value, boundary) => {
  const date = new Date(value);

  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    if (boundary === 'end') {
      date.setUTCHours(23, 59, 59, 999);
    } else {
      date.setUTCHours(0, 0, 0, 0);
    }
  }

  return date;
};

const assertKnownEventType = (eventType) => {
  if (!FINANCIAL_EVENT_TYPES.includes(eventType)) {
    throw createFinanceError(400, `Unsupported financial event type: ${eventType}.`);
  }
};

const assertKnownJournalDirection = (direction) => {
  if (!JOURNAL_ENTRY_DIRECTIONS.includes(direction)) {
    throw createFinanceError(400, `Unsupported journal direction: ${direction}.`);
  }
};

const assertKnownAccountType = (accountType) => {
  if (!FINANCE_ACCOUNT_TYPES.includes(accountType)) {
    throw createFinanceError(400, `Unsupported account type: ${accountType}.`);
  }
};

const normalizeDateRange = ({ startDate, endDate } = {}) => {
  if (!startDate && !endDate) return undefined;

  const createdAt = {};
  if (startDate) createdAt.$gte = parseBoundaryDate(startDate, 'start');
  if (endDate) createdAt.$lte = parseBoundaryDate(endDate, 'end');
  return createdAt;
};

const buildLedgerMatch = ({
  startDate,
  endDate,
  warehouseId,
  eventTypes,
  referenceType,
  referenceId,
  accountCodes,
} = {}) => {
  const match = {};
  const occurredAt = normalizeDateRange({ startDate, endDate });

  if (occurredAt) {
    match.occurredAt = occurredAt;
  }

  if (warehouseId) {
    match.warehouseId = requireValidObjectId(warehouseId, 'Warehouse ID');
  }

  if (referenceType) {
    match.referenceType = referenceType;
  }

  if (referenceId) {
    match.referenceId = requireValidObjectId(referenceId, 'Reference ID');
  }

  if (Array.isArray(accountCodes) && accountCodes.length > 0) {
    match.accountCode = { $in: accountCodes.map((accountCode) => String(accountCode).toUpperCase()) };
  }

  if (Array.isArray(eventTypes) && eventTypes.length > 0) {
    match.eventType = { $in: eventTypes };
  }

  return match;
};

const buildEventMatch = ({
  startDate,
  endDate,
  warehouseId,
  eventTypes,
  referenceType,
  referenceId,
  sourceModel,
  sourceDocumentId,
} = {}) => {
  const match = {};
  const occurredAt = normalizeDateRange({ startDate, endDate });

  if (occurredAt) {
    match.occurredAt = occurredAt;
  }

  if (warehouseId) {
    match.warehouseId = requireValidObjectId(warehouseId, 'Warehouse ID');
  }

  if (Array.isArray(eventTypes) && eventTypes.length > 0) {
    match.eventType = { $in: eventTypes };
  }

  if (referenceType) {
    match.referenceType = referenceType;
  }

  if (referenceId) {
    match.referenceId = requireValidObjectId(referenceId, 'Reference ID');
  }

  if (sourceModel) {
    match['source.model'] = sourceModel;
  }

  if (sourceDocumentId) {
    match['source.documentId'] = requireValidObjectId(sourceDocumentId, 'Source document ID');
  }

  return match;
};

export const buildJournalLine = ({
  direction,
  account,
  amount,
  memo,
  metadata,
}) => {
  assertKnownJournalDirection(direction);

  if (!account) {
    throw createFinanceError(400, 'Journal account is required.');
  }

  const accountType = account.accountType;
  assertKnownAccountType(accountType);

  return {
    direction,
    accountType,
    accountCode: account.accountCode,
    accountName: account.accountName,
    amount: parsePositiveAmount(amount),
    memo,
    metadata,
  };
};

const normalizeJournalEntries = ({
  journalEntries,
  eventType,
  occurredAt,
  currency,
  warehouseId,
  source,
  referenceType,
  referenceId,
}) => {
  if (!Array.isArray(journalEntries) || journalEntries.length === 0) {
    throw createFinanceError(400, 'At least one journal entry is required.');
  }

  return journalEntries.map((entry, index) => {
    assertKnownJournalDirection(entry.direction);
    assertKnownAccountType(entry.accountType);

    return {
      lineNumber: index + 1,
      occurredAt,
      eventType,
      direction: entry.direction,
      accountType: entry.accountType,
      accountCode: entry.accountCode,
      accountName: entry.accountName,
      amount: parsePositiveAmount(entry.amount),
      currency,
      warehouseId,
      source,
      referenceType,
      referenceId,
      memo: entry.memo,
      metadata: entry.metadata,
    };
  });
};

const getJournalTotals = (journalEntries) => journalEntries.reduce(
  (totals, entry) => {
    if (entry.direction === 'debit') {
      totals.totalDebit += entry.amount;
    } else {
      totals.totalCredit += entry.amount;
    }

    return totals;
  },
  { totalDebit: 0, totalCredit: 0 }
);

const assertBalancedJournal = ({ totalDebit, totalCredit }) => {
  if (Math.abs(totalDebit - totalCredit) > EPSILON) {
    throw createFinanceError(400, 'Journal entries must balance.');
  }
};

const assertEventAmountMatchesJournal = (amount, { totalDebit }) => {
  if (Math.abs(amount - totalDebit) > EPSILON) {
    throw createFinanceError(400, 'Financial event amount must match the journal total.');
  }
};

const normalizeSource = (source = {}) => {
  if (!source || Object.keys(source).length === 0) return undefined;

  return {
    module: source.module,
    model: source.model,
    documentId: source.documentId ? requireValidObjectId(source.documentId, 'Source document ID') : undefined,
    documentNumber: source.documentNumber,
  };
};

export const recordFinancialEvent = async ({
  eventType,
  amount,
  occurredAt = new Date(),
  currency = DEFAULT_CURRENCY,
  warehouseId,
  actorId,
  source,
  referenceType,
  referenceId,
  reversalOfEventId,
  idempotencyKey,
  memo,
  metadata,
  journalEntries,
  session,
}) => {
  if (!session) {
    throw createFinanceError(500, 'Financial event recording requires a Mongo session.');
  }
  if (typeof session.inTransaction !== 'function' || !session.inTransaction()) {
    throw createFinanceError(500, 'Financial event recording requires an active Mongo transaction.');
  }

  assertKnownEventType(eventType);

  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedWarehouseId = warehouseId ? requireValidObjectId(warehouseId, 'Warehouse ID') : undefined;
  const normalizedReferenceId = referenceId ? requireValidObjectId(referenceId, 'Reference ID') : undefined;
  const normalizedOccurredAt = new Date(occurredAt);
  const normalizedSource = normalizeSource(source);
  const normalizedAmount = parseNonNegativeAmount(amount);
  const normalizedEntries = normalizeJournalEntries({
    journalEntries,
    eventType,
    occurredAt: normalizedOccurredAt,
    currency: normalizedCurrency,
    warehouseId: normalizedWarehouseId,
    source: normalizedSource,
    referenceType,
    referenceId: normalizedReferenceId,
  });
  const totals = getJournalTotals(normalizedEntries);

  assertBalancedJournal(totals);
  assertEventAmountMatchesJournal(normalizedAmount, totals);

  const event = new FinancialEvent({
    eventType,
    amount: normalizedAmount,
    occurredAt: normalizedOccurredAt,
    currency: normalizedCurrency,
    warehouseId: normalizedWarehouseId,
    actorId: actorId ? requireValidObjectId(actorId, 'Actor ID') : undefined,
    source: normalizedSource,
    referenceType,
    referenceId: normalizedReferenceId,
    reversalOfEventId: reversalOfEventId ? requireValidObjectId(reversalOfEventId, 'Reversal event ID') : undefined,
    idempotencyKey,
    journalEntryCount: normalizedEntries.length,
    totalDebit: totals.totalDebit,
    totalCredit: totals.totalCredit,
    memo,
    metadata,
  });

  await event.save({ session });

  const entries = await JournalEntry.insertMany(
    normalizedEntries.map((entry) => ({
      ...entry,
      financialEventId: event._id,
    })),
    { session, ordered: true }
  );

  return { event, journalEntries: entries };
};

export const recordInventoryReceiptEvent = async ({
  amount,
  quantity,
  productId,
  batchId,
  purchaseOrderId,
  supplierId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  session,
}) => recordFinancialEvent({
  eventType: 'inventory_receipt',
  amount,
  occurredAt,
  currency,
  warehouseId,
  actorId,
  referenceType: 'PurchaseOrder',
  referenceId: purchaseOrderId,
  source: {
    module: 'inventory',
    model: 'Batch',
    documentId: batchId,
  },
  memo: 'Inventory received into stock',
  metadata: {
    quantity,
    productId,
    batchId,
    supplierId,
  },
  journalEntries: [
    buildJournalLine({ direction: 'debit', account: FINANCE_ACCOUNTS.INVENTORY_ASSET, amount }),
    buildJournalLine({ direction: 'credit', account: FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE, amount }),
  ],
  session,
});

export const recordSupplierPaymentEvent = async ({
  amount,
  invoiceId,
  paymentId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  session,
}) => recordFinancialEvent({
  eventType: 'supplier_payment',
  amount,
  occurredAt,
  currency,
  warehouseId,
  actorId,
  referenceType: 'Invoice',
  referenceId: invoiceId,
  source: {
    module: 'procurement',
    model: 'Payment',
    documentId: paymentId,
  },
  memo: 'Supplier payment recorded',
  journalEntries: [
    buildJournalLine({ direction: 'debit', account: FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE, amount }),
    buildJournalLine({ direction: 'credit', account: FINANCE_ACCOUNTS.CASH, amount }),
  ],
  session,
});

export const recordSupplierInvoiceEvent = async ({
  amount,
  invoiceId,
  purchaseOrderId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  session,
}) => recordFinancialEvent({
  eventType: 'supplier_invoice',
  amount,
  occurredAt,
  currency,
  warehouseId,
  actorId,
  referenceType: 'PurchaseOrder',
  referenceId: purchaseOrderId,
  source: {
    module: 'procurement',
    model: 'Invoice',
    documentId: invoiceId,
  },
  memo: 'Supplier invoice recorded',
  journalEntries: [
    buildJournalLine({ direction: 'debit', account: FINANCE_ACCOUNTS.INVENTORY_ASSET, amount }),
    buildJournalLine({ direction: 'credit', account: FINANCE_ACCOUNTS.ACCOUNTS_PAYABLE, amount }),
  ],
  session,
});

const buildSalesReceivableJournalEntries = (amount) => [
  buildJournalLine({ direction: 'debit', account: FINANCE_ACCOUNTS.ACCOUNTS_RECEIVABLE, amount }),
  buildJournalLine({ direction: 'credit', account: FINANCE_ACCOUNTS.SALES_REVENUE, amount }),
];

const buildCogsJournalEntries = (amount) => [
  buildJournalLine({ direction: 'debit', account: FINANCE_ACCOUNTS.COST_OF_GOODS_SOLD, amount }),
  buildJournalLine({ direction: 'credit', account: FINANCE_ACCOUNTS.INVENTORY_ASSET, amount }),
];

const buildInventoryDamageJournalEntries = (amount) => [
  buildJournalLine({ direction: 'debit', account: FINANCE_ACCOUNTS.INVENTORY_LOSS, amount }),
  buildJournalLine({ direction: 'credit', account: FINANCE_ACCOUNTS.INVENTORY_ASSET, amount }),
];

const getAllocationItemIds = (allocations = []) => uniqueIds(
  allocations.flatMap((allocation) => allocation?.itemIds || [])
);

const getAllocationBatchQuantitiesWithoutItems = (allocations = []) => {
  const quantitiesByBatchId = new Map();

  for (const allocation of allocations) {
    if (!allocation?.batchId || allocation?.itemIds?.length > 0) continue;

    const quantity = Number(allocation.quantity) || 0;
    if (quantity <= 0) continue;

    const batchId = normalizeId(allocation.batchId);
    quantitiesByBatchId.set(batchId, (quantitiesByBatchId.get(batchId) || 0) + quantity);
  }

  return quantitiesByBatchId;
};

const loadBatchUnitCosts = async (batchIds, session) => {
  const normalizedBatchIds = uniqueIds(batchIds);
  if (normalizedBatchIds.length === 0) return new Map();

  const batches = await runQuery(
    Batch.find({ _id: { $in: normalizedBatchIds.map((batchId) => requireValidObjectId(batchId, 'Batch ID')) } })
      .select('_id unitCost'),
    session
  );

  return new Map(
    batches.map((batch) => [normalizeId(batch._id), Number(batch.unitCost) || 0])
  );
};

const getPopulatedBatchUnitCost = (batch) => (
  batch && typeof batch === 'object' && !batch._bsontype && typeof batch.unitCost === 'number'
    ? batch.unitCost
    : undefined
);

const loadCostItems = async (itemIds, providedItems = [], session) => {
  const expectedItemIds = uniqueIds(itemIds);
  if (expectedItemIds.length === 0) return [];

  const providedItemsById = new Map(
    providedItems
      .map((item) => [normalizeId(item?._id), item])
      .filter(([id]) => Boolean(id))
  );
  const missingItemIds = expectedItemIds.filter((itemId) => !providedItemsById.has(itemId));

  if (missingItemIds.length > 0) {
    const loadedItems = await runQuery(
      Item.find({ _id: { $in: missingItemIds.map((itemId) => requireValidObjectId(itemId, 'Item ID')) } })
        .select('_id productId batchId purchasePrice')
        .populate('batchId', 'unitCost'),
      session
    );

    for (const item of loadedItems) {
      providedItemsById.set(normalizeId(item._id), item);
    }
  }

  const items = expectedItemIds.map((itemId) => providedItemsById.get(itemId)).filter(Boolean);
  if (items.length !== expectedItemIds.length) {
    throw createFinanceError(400, 'Unable to resolve inventory cost for all referenced items.');
  }

  return items;
};

const calculateInventoryCostSnapshot = async ({
  amount,
  itemIds = [],
  items = [],
  allocations = [],
  session,
} = {}) => {
  if (!isBlank(amount)) {
    const normalizedAmount = parseNonNegativeAmount(amount, 'Inventory cost amount');
    return {
      amount: normalizedAmount,
      itemIds: uniqueIds(itemIds),
      batchIds: [],
      productIds: [],
    };
  }

  const explicitItemIds = uniqueIds([
    ...itemIds,
    ...items.map((item) => item?._id),
    ...getAllocationItemIds(allocations),
  ]);
  const costItems = await loadCostItems(explicitItemIds, items, session);
  const batchQuantityFallbacks = getAllocationBatchQuantitiesWithoutItems(allocations);
  const batchIdsNeedingCosts = [
    ...costItems
      .filter((item) => typeof item.purchasePrice !== 'number' && getPopulatedBatchUnitCost(item.batchId) === undefined)
      .map((item) => item.batchId),
    ...batchQuantityFallbacks.keys(),
  ];
  const batchUnitCosts = await loadBatchUnitCosts(batchIdsNeedingCosts, session);

  let totalCost = 0;
  const productIds = [];
  const batchIds = [];

  for (const item of costItems) {
    const batchId = normalizeId(item.batchId);
    const itemCost = typeof item.purchasePrice === 'number'
      ? item.purchasePrice
      : getPopulatedBatchUnitCost(item.batchId) ?? batchUnitCosts.get(batchId) ?? 0;

    totalCost += itemCost;
    if (item.productId) productIds.push(item.productId);
    if (item.batchId) batchIds.push(item.batchId);
  }

  for (const [batchId, quantity] of batchQuantityFallbacks.entries()) {
    totalCost += (batchUnitCosts.get(batchId) || 0) * quantity;
    batchIds.push(batchId);
  }

  return {
    amount: totalCost,
    itemIds: costItems.map((item) => normalizeId(item._id)),
    batchIds: uniqueIds(batchIds),
    productIds: uniqueIds(productIds),
  };
};

const resolveConfirmedSaleCogsSnapshot = async ({
  cogsAmount,
  cogsItemIds,
  cogsItems,
  allocatedItems,
  salesHistoryId,
  session,
}) => {
  if (!isBlank(cogsAmount)) {
    return calculateInventoryCostSnapshot({ amount: cogsAmount, itemIds: cogsItemIds, session });
  }

  let allocations = allocatedItems;
  if ((!Array.isArray(allocations) || allocations.length === 0) && salesHistoryId) {
    const salesHistory = await runQuery(
      SalesHistory.findById(salesHistoryId).select('products'),
      session
    );
    allocations = salesHistory?.products || [];
  }

  if ((!Array.isArray(allocations) || allocations.length === 0) && !cogsItemIds?.length && !cogsItems?.length) {
    return { amount: 0, itemIds: [], batchIds: [], productIds: [] };
  }

  return calculateInventoryCostSnapshot({
    itemIds: cogsItemIds,
    items: cogsItems,
    allocations,
    session,
  });
};

export const recordSalesInvoiceEvent = async ({
  amount,
  salesInvoiceId,
  salesOrderId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  session,
}) => recordFinancialEvent({
  eventType: 'sales_invoice',
  amount,
  occurredAt,
  currency,
  warehouseId,
  actorId,
  referenceType: 'SalesOrder',
  referenceId: salesOrderId,
  source: {
    module: 'sales',
    model: 'SalesInvoice',
    documentId: salesInvoiceId,
  },
  memo: 'Sales invoice issued',
  journalEntries: buildSalesReceivableJournalEntries(amount),
  session,
});

export const recordConfirmedSaleReceivableEvent = async ({
  amount,
  orderId,
  packageId,
  packageNumber,
  salesHistoryId,
  allocatedItems,
  cogsAmount,
  cogsItemIds,
  cogsItems,
  warehouseId,
  currency,
  occurredAt,
  deliveryDate,
  actorId,
  session,
}) => {
  const receivable = await recordFinancialEvent({
    eventType: 'sales_invoice',
    amount,
    occurredAt,
    currency,
    warehouseId,
    actorId,
    referenceType: 'Order',
    referenceId: orderId,
    idempotencyKey: packageId
      ? `order-sale-confirmation-package:${packageId.toString()}`
      : orderId
        ? `order-sale-confirmation:${orderId.toString()}`
        : undefined,
    source: {
      module: 'sales',
      model: 'SalesHistory',
      documentId: salesHistoryId,
      documentNumber: packageNumber,
    },
    memo: 'Confirmed sale receivable recorded',
    metadata: {
      packageId,
      deliveryDate,
    },
    journalEntries: buildSalesReceivableJournalEntries(amount),
    session,
  });

  const cogsSnapshot = await resolveConfirmedSaleCogsSnapshot({
    cogsAmount,
    cogsItemIds,
    cogsItems,
    allocatedItems,
    salesHistoryId,
    session,
  });

  if (cogsSnapshot.amount <= 0) {
    return {
      event: receivable.event,
      journalEntries: receivable.journalEntries,
      receivable,
      cogs: null,
    };
  }

  const cogs = await recordFinancialEvent({
    eventType: 'cogs_recognition',
    amount: cogsSnapshot.amount,
    occurredAt,
    currency,
    warehouseId,
    actorId,
    referenceType: 'Order',
    referenceId: orderId,
    idempotencyKey: packageId
      ? `order-sale-cogs-package:${packageId.toString()}`
      : orderId
        ? `order-sale-cogs:${orderId.toString()}`
        : undefined,
    source: {
      module: 'inventory',
      model: 'SalesHistory',
      documentId: salesHistoryId,
      documentNumber: packageNumber,
    },
    memo: 'Cost of goods sold recognized for confirmed sale',
    metadata: {
      packageId,
      deliveryDate,
      itemIds: cogsSnapshot.itemIds,
      batchIds: cogsSnapshot.batchIds,
      productIds: cogsSnapshot.productIds,
    },
    journalEntries: buildCogsJournalEntries(cogsSnapshot.amount),
    session,
  });

  return {
    event: receivable.event,
    journalEntries: receivable.journalEntries,
    receivable,
    cogs,
  };
};

export const recordCustomerPaymentEvent = async ({
  amount,
  salesInvoiceId,
  orderId,
  paymentReceivedId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  session,
}) => {
  if (Boolean(salesInvoiceId) === Boolean(orderId)) {
    throw createFinanceError(400, 'Customer payment must reference exactly one sales invoice or canonical order.');
  }

  const referenceType = orderId ? 'Order' : 'SalesInvoice';
  const referenceId = orderId || salesInvoiceId;

  return recordFinancialEvent({
    eventType: 'customer_payment',
    amount,
    occurredAt,
    currency,
    warehouseId,
    actorId,
    referenceType,
    referenceId,
    source: {
      module: 'sales',
      model: 'PaymentReceived',
      documentId: paymentReceivedId,
    },
    memo: 'Customer payment received',
    journalEntries: [
      buildJournalLine({ direction: 'debit', account: FINANCE_ACCOUNTS.CASH, amount }),
      buildJournalLine({ direction: 'credit', account: FINANCE_ACCOUNTS.ACCOUNTS_RECEIVABLE, amount }),
    ],
    session,
  });
};

export const recordCogsRecognitionEvent = async ({
  amount,
  salesOrderId,
  productId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  session,
}) => recordFinancialEvent({
  eventType: 'cogs_recognition',
  amount,
  occurredAt,
  currency,
  warehouseId,
  actorId,
  referenceType: 'SalesOrder',
  referenceId: salesOrderId,
  source: {
    module: 'inventory',
    model: 'SalesOrder',
    documentId: salesOrderId,
  },
  memo: 'Cost of goods sold recognized',
  metadata: {
    productId,
  },
  journalEntries: buildCogsJournalEntries(amount),
  session,
});

export const recordInventoryDamageEvent = async ({
  amount,
  itemId,
  productId,
  batchId,
  returnId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  session,
}) => recordFinancialEvent({
  eventType: 'inventory_damage',
  amount,
  occurredAt,
  currency,
  warehouseId,
  actorId,
  referenceType: returnId ? 'Return' : 'Item',
  referenceId: returnId || itemId,
  source: {
    module: 'inventory',
    model: itemId ? 'Item' : 'Batch',
    documentId: itemId || batchId,
  },
  memo: 'Inventory damage or loss recognized',
  metadata: {
    itemId,
    productId,
    batchId,
    returnId,
  },
  journalEntries: buildInventoryDamageJournalEntries(amount),
  session,
});

export const recordInventoryDamageForItemsEvent = async ({
  amount,
  itemIds,
  items,
  referenceType = 'Item',
  referenceId,
  warehouseId,
  currency,
  occurredAt,
  actorId,
  movementType,
  notes,
  session,
}) => {
  const costSnapshot = await calculateInventoryCostSnapshot({
    amount,
    itemIds,
    items,
    session,
  });

  if (costSnapshot.amount <= 0) {
    return null;
  }

  const normalizedItemIds = costSnapshot.itemIds;
  const normalizedReferenceId = referenceId || normalizedItemIds[0];

  return recordFinancialEvent({
    eventType: 'inventory_damage',
    amount: costSnapshot.amount,
    occurredAt,
    currency,
    warehouseId,
    actorId,
    referenceType,
    referenceId: normalizedReferenceId,
    source: {
      module: 'inventory',
      model: referenceType,
      documentId: normalizedReferenceId,
    },
    memo: notes || 'Inventory damage or loss recognized',
    metadata: {
      itemIds: normalizedItemIds,
      batchIds: costSnapshot.batchIds,
      productIds: costSnapshot.productIds,
      movementType,
    },
    journalEntries: buildInventoryDamageJournalEntries(costSnapshot.amount),
    session,
  });
};

export const recordReversalEvent = async ({
  originalEvent,
  actorId,
  occurredAt = new Date(),
  memo,
  session,
}) => {
  if (!originalEvent?._id) {
    throw createFinanceError(400, 'Original financial event is required.');
  }

  const originalEntries = await runQuery(
    JournalEntry.find({ financialEventId: originalEvent._id }).sort({ lineNumber: 1 }),
    session
  );

  return recordFinancialEvent({
    eventType: 'reversal',
    amount: originalEvent.amount,
    occurredAt,
    currency: originalEvent.currency,
    warehouseId: originalEvent.warehouseId,
    actorId,
    referenceType: originalEvent.referenceType,
    referenceId: originalEvent.referenceId,
    reversalOfEventId: originalEvent._id,
    memo: memo || `Reversal of ${originalEvent.eventNumber}`,
    journalEntries: originalEntries.map((entry) => ({
      direction: entry.direction === 'debit' ? 'credit' : 'debit',
      accountType: entry.accountType,
      accountCode: entry.accountCode,
      accountName: entry.accountName,
      amount: entry.amount,
      memo: `Reversal of line ${entry.lineNumber}`,
    })),
    session,
  });
};

export const listUnreversedFinancialEventsForSource = async ({
  eventType,
  sourceModel,
  sourceDocumentId,
  sourceModule,
  session,
}) => {
  if (eventType) {
    assertKnownEventType(eventType);
  }
  if (!sourceModel) {
    throw createFinanceError(400, 'Source model is required.');
  }

  const match = {
    'source.model': sourceModel,
    'source.documentId': requireValidObjectId(sourceDocumentId, 'Source document ID'),
  };

  if (eventType) {
    match.eventType = eventType;
  }
  if (sourceModule) {
    match['source.module'] = sourceModule;
  }

  const sourceEvents = await runQuery(
    FinancialEvent.find(match).sort({ occurredAt: 1, createdAt: 1 }),
    session
  );

  if (sourceEvents.length === 0) {
    return [];
  }

  const reversalEvents = await runQuery(
    FinancialEvent.find({
      eventType: 'reversal',
      reversalOfEventId: { $in: sourceEvents.map((event) => event._id) },
    }).sort({ occurredAt: 1, createdAt: 1 }),
    session
  );

  const reversedEventIds = new Set(
    reversalEvents
      .map((event) => event.reversalOfEventId?.toString())
      .filter(Boolean)
  );

  return sourceEvents.filter((event) => !reversedEventIds.has(event._id.toString()));
};

export const reverseUnreversedFinancialEventsForSource = async ({
  eventType,
  sourceModel,
  sourceDocumentId,
  sourceModule,
  actorId,
  occurredAt = new Date(),
  memo,
  session,
}) => {
  const events = await listUnreversedFinancialEventsForSource({
    eventType,
    sourceModel,
    sourceDocumentId,
    sourceModule,
    session,
  });

  const reversals = [];
  for (const event of events) {
    const reversal = await recordReversalEvent({
      originalEvent: event,
      actorId,
      occurredAt,
      memo,
      session,
    });
    reversals.push(reversal);
  }

  return reversals;
};

export const listFinancialEvents = async ({
  limit = 100,
  skip = 0,
  session,
  ...filters
} = {}) => runQuery(
  FinancialEvent.find(buildEventMatch(filters))
    .sort({ occurredAt: -1, createdAt: -1 })
    .skip(Number(skip) || 0)
    .limit(Math.min(Number(limit) || 100, 500)),
  session
);

export const getFinancialEventSummary = async ({ session, ...filters } = {}) => runAggregate(
  FinancialEvent.aggregate([
    { $match: buildEventMatch(filters) },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          currency: '$currency',
        },
        eventCount: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
        totalDebit: { $sum: { $ifNull: ['$totalDebit', 0] } },
        totalCredit: { $sum: { $ifNull: ['$totalCredit', 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        eventType: '$_id.eventType',
        currency: '$_id.currency',
        eventCount: 1,
        totalAmount: 1,
        totalDebit: 1,
        totalCredit: 1,
      },
    },
    { $sort: { eventType: 1, currency: 1 } },
  ]),
  session
);

export const getJournalAccountBalances = async ({ session, ...filters } = {}) => runAggregate(
  JournalEntry.aggregate([
    { $match: buildLedgerMatch(filters) },
    {
      $group: {
        _id: {
          accountType: '$accountType',
          accountCode: '$accountCode',
          accountName: '$accountName',
          currency: '$currency',
        },
        debitTotal: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'debit'] }, '$amount', 0],
          },
        },
        creditTotal: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'credit'] }, '$amount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        accountType: '$_id.accountType',
        accountCode: '$_id.accountCode',
        accountName: '$_id.accountName',
        currency: '$_id.currency',
        debitTotal: 1,
        creditTotal: 1,
        netDebit: { $subtract: ['$debitTotal', '$creditTotal'] },
        netCredit: { $subtract: ['$creditTotal', '$debitTotal'] },
      },
    },
    { $sort: { accountCode: 1, currency: 1 } },
  ]),
  session
);

export const getProfitAndLossFromJournal = async ({ session, ...filters } = {}) => {
  const balances = await getJournalAccountBalances({
    ...filters,
    accountCodes: [
      FINANCE_ACCOUNTS.SALES_REVENUE.accountCode,
      FINANCE_ACCOUNTS.COST_OF_GOODS_SOLD.accountCode,
      FINANCE_ACCOUNTS.INVENTORY_LOSS.accountCode,
    ],
    session,
  });

  const getBalance = (accountCode) => balances.find((balance) => balance.accountCode === accountCode);
  const revenue = getBalance(FINANCE_ACCOUNTS.SALES_REVENUE.accountCode)?.netCredit || 0;
  const cogs = getBalance(FINANCE_ACCOUNTS.COST_OF_GOODS_SOLD.accountCode)?.netDebit || 0;
  const inventoryLoss = getBalance(FINANCE_ACCOUNTS.INVENTORY_LOSS.accountCode)?.netDebit || 0;

  return {
    revenue,
    cogs,
    inventoryLoss,
    grossProfit: revenue - cogs,
    netInventoryProfit: revenue - cogs - inventoryLoss,
    balances,
  };
};
