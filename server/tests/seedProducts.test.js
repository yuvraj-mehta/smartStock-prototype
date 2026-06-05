import { jest } from '@jest/globals';

const warehouse = {
  _id: 'warehouse-1',
  warehouseName: 'Seed Warehouse',
};
const supplier = { _id: 'supplier-1' };

const Batch = {
  findOneAndUpdate: jest.fn(),
};
const ExternalUser = {
  findOneAndUpdate: jest.fn(),
};
const Inventory = {
  deleteMany: jest.fn(),
  findOneAndUpdate: jest.fn(),
};
const Item = {
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
};
const Product = {
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
};
const seedAdmin = jest.fn();

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashed-password'),
  },
}));
jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  ExternalUser,
  Inventory,
  Item,
  Product,
}));
jest.unstable_mockModule('../scripts/seedAdmin.js', () => ({
  seedAdmin,
}));

const { productSeeds, seedProducts } = await import('../scripts/seedProducts.js');

const managedEnvKeys = [
  'ALLOW_DEV_SEED_CREDENTIALS',
  'NODE_ENV',
  'SEED_SUPPLIER_PASSWORD',
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

describe('seedProducts', () => {
  let logSpy;
  let tableSpy;

  beforeEach(() => {
    clearManagedEnv();
    process.env.SEED_SUPPLIER_PASSWORD = 'unique-supplier-password-2026';

    seedAdmin.mockResolvedValue({ warehouse });
    ExternalUser.findOneAndUpdate.mockResolvedValue(supplier);
    Product.findOneAndUpdate.mockImplementation(async (query) => ({
      _id: `product-${query.sku}`,
      sku: query.sku,
    }));
    Product.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Batch.findOneAndUpdate.mockImplementation(async (query) => ({
      _id: `batch-${query.batchNumber}`,
      batchNumber: query.batchNumber,
    }));
    Item.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Item.findOne.mockResolvedValue(null);
    Item.create.mockResolvedValue({});
    Item.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Item.countDocuments.mockResolvedValue(3);
    Item.aggregate.mockResolvedValue([{ total: 300 }]);
    Inventory.findOneAndUpdate.mockResolvedValue({});
    Inventory.deleteMany.mockResolvedValue({ deletedCount: 0 });

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    tableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    restoreManagedEnv();
    logSpy.mockRestore();
    tableSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('keeps built-in product seed SKUs unique', () => {
    const skus = productSeeds.map((seed) => seed.sku);

    expect(new Set(skus).size).toBe(productSeeds.length);
  });

  it('reconciles seed items and inventory against the active admin warehouse', async () => {
    const result = await seedProducts();

    expect(result).toHaveLength(productSeeds.length);
    expect(seedAdmin).toHaveBeenCalledTimes(1);
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(productSeeds.length);
    expect(Batch.findOneAndUpdate).toHaveBeenCalledTimes(productSeeds.length);

    const staleSeedItemFilter = Item.deleteMany.mock.calls[0][0];
    expect(staleSeedItemFilter.$and.some((clause) => 'productId' in clause)).toBe(false);
    expect(staleSeedItemFilter.$and).toEqual(expect.arrayContaining([
      { serialNumber: { $regex: '^IPH15P-001-SEED-' } },
      { serialNumber: { $nin: expect.any(Array) } },
      { status: 'in_stock' },
    ]));

    expect(Item.countDocuments).toHaveBeenCalledWith(expect.objectContaining({
      currentWarehouseId: warehouse._id,
      status: 'in_stock',
    }));
    expect(Item.aggregate).toHaveBeenCalledWith([
      {
        $match: expect.objectContaining({
          currentWarehouseId: warehouse._id,
          status: 'in_stock',
        }),
      },
      { $group: { _id: null, total: { $sum: '$purchasePrice' } } },
    ]);
    expect(Inventory.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      warehouseId: { $ne: warehouse._id },
    }));
  });
});
