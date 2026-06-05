import { jest } from '@jest/globals';

const targetModelNames = [
  'Item',
  'Inventory',
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
  'Payment',
  'AuditLog',
  'Customer',
  'FulfillmentOrder',
  'IncomingSupply',
  'Wage',
  'Warehouse',
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
jest.unstable_mockModule('../models/index.js', () => targetModels);
jest.unstable_mockModule('../models/user.model.js', () => ({ User: userModel }));
jest.unstable_mockModule('../models/externalUsers.model.js', () => ({ ExternalUser: externalUserModel }));

const {
  clearDatabase,
  parseClearDatabaseArgs,
} = await import('../clearDatabase.js');

const allModels = [...Object.values(targetModels), userModel, externalUserModel];

describe('clearDatabase safety guard', () => {
  beforeEach(() => {
    mongooseMock.connect.mockClear();
    mongooseMock.disconnect.mockClear();
    allModels.forEach((model) => {
      model.countDocuments.mockClear();
      model.deleteMany.mockClear();
      model.countDocuments.mockResolvedValue(0);
      model.deleteMany.mockResolvedValue({ deletedCount: 0 });
    });
  });

  it('parses CLI arguments as dry-run unless execution is explicit', () => {
    expect(parseClearDatabaseArgs([])).toEqual({
      dryRun: true,
      confirmDbName: undefined,
      allowProtectedDatabase: false,
    });

    expect(parseClearDatabaseArgs(['--execute', '--confirm-db', 'smartstock_test'])).toEqual({
      dryRun: false,
      confirmDbName: 'smartstock_test',
      allowProtectedDatabase: false,
    });
  });

  it('dry-runs by default and never deletes collections', async () => {
    targetModels.Item.countDocuments.mockResolvedValue(7);
    userModel.countDocuments.mockResolvedValue(2);
    externalUserModel.countDocuments.mockResolvedValue(1);

    const result = await clearDatabase({ dryRun: true });

    expect(result).toEqual(
      expect.objectContaining({
        dryRun: true,
        databaseName: 'smartstock_test',
        targets: expect.arrayContaining([
          expect.objectContaining({ name: 'items', count: 7 }),
        ]),
        preserved: expect.arrayContaining([
          expect.objectContaining({ name: 'users', count: 2 }),
          expect.objectContaining({ name: 'externalusers', count: 1 }),
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
    expect(mongooseMock.disconnect).toHaveBeenCalled();
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
    expect(mongooseMock.disconnect).toHaveBeenCalled();
  });
});
