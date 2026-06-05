import { jest } from '@jest/globals';

const targetModelNames = [
  'Item',
  'Inventory',
  'InventoryMovement',
  'Batch',
  'Order',
  'SalesHistory',
  'Return',
  'SalesOrder',
  'SalesInvoice',
  'PaymentReceived',
  'Product',
  'PurchaseOrder',
  'Package',
  'Transport',
  'Invoice',
  'Payment',
  'FinancialEvent',
  'JournalEntry',
  'AuditLog',
  'Customer',
  'FulfillmentOrder',
  'IncomingSupply',
  'DemandForecast',
  'AIInsight',
  'Wage',
];

const buildModelMock = () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
});

const targetModels = Object.fromEntries(
  targetModelNames.map((name) => [name, buildModelMock()]),
);

const userModel = buildModelMock();
const externalUserModel = buildModelMock();
const warehouseModel = buildModelMock();

const mongooseMock = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../config/config.js', () => ({
  conf: {
    mongoUri: 'mongodb://127.0.0.1:27017/smartstock_test',
    dbName: 'smartstock_test',
  },
}));
jest.unstable_mockModule('../models/index.js', () => ({
  ...targetModels,
  Warehouse: warehouseModel,
}));
jest.unstable_mockModule('../models/user.model.js', () => ({ User: userModel }));
jest.unstable_mockModule('../models/externalUsers.model.js', () => ({ ExternalUser: externalUserModel }));

const {
  clearDatabase,
  collectionsToClear,
  parseClearDatabaseArgs,
  preservedCollections,
} = await import('../clearDatabase.js');

const allModels = [...Object.values(targetModels), userModel, externalUserModel, warehouseModel];
const managedEnvKeys = [
  'CLEAR_DATABASE_ALLOW_PRODUCTION',
  'NODE_ENV',
];
const savedEnv = {};

const clearManagedEnv = () => {
  for (const key of managedEnvKeys) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
};

const restoreManagedEnv = () => {
  for (const key of managedEnvKeys) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
};

describe('clearDatabase safety guard', () => {
  beforeEach(() => {
    clearManagedEnv();
    mongooseMock.connect.mockClear();
    mongooseMock.disconnect.mockClear();
    allModels.forEach((model) => {
      model.countDocuments.mockClear();
      model.deleteMany.mockClear();
      model.countDocuments.mockResolvedValue(0);
      model.deleteMany.mockResolvedValue({ deletedCount: 0 });
    });
  });

  afterEach(() => {
    restoreManagedEnv();
  });

  it('parses CLI arguments as dry-run unless execution is explicit', () => {
    expect(parseClearDatabaseArgs([])).toEqual({
      dryRun: true,
      confirmDbName: undefined,
      allowProtectedDatabase: false,
      allowProductionClear: false,
    });

    expect(parseClearDatabaseArgs([
      '--execute',
      '--confirm-db',
      'smartstock_test',
      '--allow-production-clear',
    ])).toEqual({
      dryRun: false,
      confirmDbName: 'smartstock_test',
      allowProtectedDatabase: false,
      allowProductionClear: true,
    });
  });

  it('dry-runs by default and never deletes collections', async () => {
    targetModels.Item.countDocuments.mockResolvedValue(7);
    userModel.countDocuments.mockResolvedValue(2);
    externalUserModel.countDocuments.mockResolvedValue(1);
    warehouseModel.countDocuments.mockResolvedValue(1);

    const result = await clearDatabase({ dryRun: true });

    expect(result).toEqual(
      expect.objectContaining({
        dryRun: true,
        databaseName: 'smartstock_test',
        targets: expect.arrayContaining([
          expect.objectContaining({ name: 'items', count: 7 }),
          expect.objectContaining({ name: 'financialevents', count: 0 }),
          expect.objectContaining({ name: 'journalentries', count: 0 }),
          expect.objectContaining({ name: 'inventorymovements', count: 0 }),
          expect.objectContaining({ name: 'transports', count: 0 }),
          expect.objectContaining({ name: 'invoices', count: 0 }),
          expect.objectContaining({ name: 'demandforecasts', count: 0 }),
          expect.objectContaining({ name: 'aiinsights', count: 0 }),
        ]),
        preserved: expect.arrayContaining([
          expect.objectContaining({ name: 'users', count: 2 }),
          expect.objectContaining({ name: 'externalusers', count: 1 }),
          expect.objectContaining({ name: 'warehouses', count: 1 }),
        ]),
      }),
    );
    expect(mongooseMock.connect).toHaveBeenCalledWith(
      'mongodb://127.0.0.1:27017/smartstock_test',
      { dbName: 'smartstock_test' },
    );
    Object.values(targetModels).forEach((model) => {
      expect(model.deleteMany).not.toHaveBeenCalled();
    });
    expect(userModel.deleteMany).not.toHaveBeenCalled();
    expect(externalUserModel.deleteMany).not.toHaveBeenCalled();
    expect(warehouseModel.deleteMany).not.toHaveBeenCalled();
    expect(mongooseMock.disconnect).toHaveBeenCalled();
  });

  it('keeps model registry entries either cleared or explicitly preserved', () => {
    const targetNames = collectionsToClear.map(([name]) => name);
    const preservedNames = preservedCollections.map(([name]) => name);

    expect(targetNames).not.toContain('users');
    expect(targetNames).not.toContain('externalusers');
    expect(targetNames).not.toContain('warehouses');
    expect(targetNames.filter((name) => preservedNames.includes(name))).toEqual([]);
    expect(preservedNames).toEqual(['users', 'externalusers', 'warehouses']);
  });

  it('refuses destructive deletion without matching database confirmation', async () => {
    await expect(clearDatabase({ dryRun: false, confirmDbName: 'wrong_db' }))
      .rejects
      .toThrow('without --confirm-db smartstock_test');

    expect(mongooseMock.connect).not.toHaveBeenCalled();
    Object.values(targetModels).forEach((model) => {
      expect(model.deleteMany).not.toHaveBeenCalled();
    });
  });

  it('refuses destructive deletion in production without a second explicit override', async () => {
    process.env.NODE_ENV = 'production';

    await expect(clearDatabase({ dryRun: false, confirmDbName: 'smartstock_test' }))
      .rejects
      .toThrow('NODE_ENV is production');

    expect(mongooseMock.connect).not.toHaveBeenCalled();
    Object.values(targetModels).forEach((model) => {
      expect(model.deleteMany).not.toHaveBeenCalled();
    });
  });

  it('allows production deletion only when confirmation and production override are both explicit', async () => {
    process.env.NODE_ENV = 'production';

    const result = await clearDatabase({
      dryRun: false,
      confirmDbName: 'smartstock_test',
      allowProductionClear: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        dryRun: false,
        databaseName: 'smartstock_test',
      }),
    );
    Object.values(targetModels).forEach((model) => {
      expect(model.deleteMany).toHaveBeenCalledWith({});
    });
    expect(userModel.deleteMany).not.toHaveBeenCalled();
    expect(externalUserModel.deleteMany).not.toHaveBeenCalled();
    expect(warehouseModel.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes only non-user collections when confirmation matches', async () => {
    targetModels.Item.deleteMany.mockResolvedValue({ deletedCount: 3 });

    const result = await clearDatabase({
      dryRun: false,
      confirmDbName: 'smartstock_test',
    });

    expect(result).toEqual(
      expect.objectContaining({
        dryRun: false,
        databaseName: 'smartstock_test',
        targets: expect.arrayContaining([
          expect.objectContaining({ name: 'items', deletedCount: 3 }),
        ]),
      }),
    );
    Object.values(targetModels).forEach((model) => {
      expect(model.deleteMany).toHaveBeenCalledWith({});
    });
    expect(userModel.deleteMany).not.toHaveBeenCalled();
    expect(externalUserModel.deleteMany).not.toHaveBeenCalled();
    expect(warehouseModel.deleteMany).not.toHaveBeenCalled();
    expect(mongooseMock.disconnect).toHaveBeenCalled();
  });
});
