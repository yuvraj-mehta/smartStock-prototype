import { jest } from '@jest/globals';

const ITEM_STATUSES = Object.freeze([
  'in_stock',
  'allocated',
  'packed',
  'shipped',
  'dispatched',
  'delivered',
  'returned',
  'damaged',
]);

const ITEM_HISTORY_ACTIONS = Object.freeze([
  'added',
  'allocated',
  'packed',
  'shipped',
  'dispatched',
  'delivered',
  'returned',
  'damaged',
]);

const Batch = {
  findById: jest.fn(),
};

const Inventory = {
  findOneAndUpdate: jest.fn(),
};

const InventoryMovement = {
  create: jest.fn(),
  insertMany: jest.fn(),
};

const Item = {
  aggregate: jest.fn(),
  bulkWrite: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
};

jest.unstable_mockModule('../models/batch.model.js', () => ({ Batch }));
jest.unstable_mockModule('../models/inventory.model.js', () => ({ Inventory }));
jest.unstable_mockModule('../models/inventoryMovement.model.js', () => ({ InventoryMovement }));
jest.unstable_mockModule('../models/item.model.js', () => ({
  Item,
  ITEM_HISTORY_ACTIONS,
  ITEM_STATUSES,
}));

let InventoryService;

const buildLeanQuery = (value) => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

const buildArrayQuery = (value) => {
  const query = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return query;
};

describe('InventoryService architecture contracts', () => {
  beforeAll(async () => {
    InventoryService = await import('../services/inventory/inventory.service.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unsupported item status transitions with allowed next statuses', () => {
    expect(() => {
      InventoryService.validateItemStatusTransition('delivered', 'allocated');
    }).toThrow('Invalid item status transition from delivered to allocated.');

    try {
      InventoryService.validateItemStatusTransition('delivered', 'allocated');
    } catch (error) {
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        fromStatus: 'delivered',
        toStatus: 'allocated',
        allowedStatuses: ['in_stock', 'returned', 'damaged'],
      });
    }
  });

  it('records status transition history and movement documents', async () => {
    const item = {
      _id: 'item-1',
      batchId: 'batch-1',
      productId: 'product-1',
      currentWarehouseId: 'warehouse-1',
      status: 'in_stock',
      history: [],
      save: jest.fn().mockResolvedValue({}),
    };
    const movement = { _id: 'movement-1' };
    InventoryMovement.create.mockResolvedValue([movement]);

    const result = await InventoryService.transitionItemStatus(item, 'allocated', {
      actorId: 'user-1',
      referenceType: 'Order',
      referenceId: 'order-1',
      notes: 'Allocated for order ORD-1',
      syncInventory: false,
    });

    expect(result).toMatchObject({
      item,
      movement,
      fromStatus: 'in_stock',
      toStatus: 'allocated',
      inventorySyncs: [],
    });
    expect(item.status).toBe('allocated');
    expect(item.history).toHaveLength(1);
    expect(item.history[0]).toMatchObject({
      action: 'allocated',
      location: 'warehouse-1',
      notes: 'Allocated for order ORD-1',
    });
    expect(item.history[0].date).toBeInstanceOf(Date);
    expect(item.save).toHaveBeenCalledWith({ session: undefined });
    expect(InventoryMovement.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          itemId: 'item-1',
          batchId: 'batch-1',
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          fromWarehouseId: 'warehouse-1',
          toWarehouseId: 'warehouse-1',
          fromStatus: 'in_stock',
          toStatus: 'allocated',
          action: 'allocated',
          movementType: 'allocation',
          quantity: 1,
          actorId: 'user-1',
          referenceType: 'Order',
          referenceId: 'order-1',
          notes: 'Allocated for order ORD-1',
        }),
      ],
      { session: undefined },
    );
    expect(Inventory.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('syncs inventory quantity and value from item state for a batch and warehouse', async () => {
    const inventory = { _id: 'inventory-1' };
    Item.countDocuments.mockResolvedValue(3);
    Item.find.mockReturnValue(buildLeanQuery([
      { purchasePrice: 100 },
      { purchasePrice: 125 },
      { purchasePrice: 150 },
    ]));
    Inventory.findOneAndUpdate.mockResolvedValue(inventory);

    const result = await InventoryService.syncInventoryForBatch('batch-1', 'warehouse-1');

    expect(Item.countDocuments).toHaveBeenCalledWith({
      batchId: 'batch-1',
      status: 'in_stock',
    });
    expect(Item.find).toHaveBeenCalledWith({
      batchId: 'batch-1',
      status: 'in_stock',
    });
    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      { batchId: 'batch-1', warehouseId: 'warehouse-1' },
      {
        $set: { quantity: 3, inventoryValue: 375 },
        $setOnInsert: { batchId: 'batch-1', warehouseId: 'warehouse-1' },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        session: undefined,
      },
    );
    expect(result).toEqual({
      batchId: 'batch-1',
      warehouseId: 'warehouse-1',
      quantity: 3,
      inventoryValue: 375,
      inventory,
    });
    expect(Batch.findById).not.toHaveBeenCalled();
  });

  it('syncs affected warehouses after item status transitions', async () => {
    const item = {
      _id: 'item-1',
      batchId: 'batch-1',
      productId: 'product-1',
      currentWarehouseId: 'warehouse-1',
      status: 'in_stock',
      history: [],
      save: jest.fn().mockResolvedValue({}),
    };
    InventoryMovement.create.mockResolvedValue([{ _id: 'movement-1' }]);
    Item.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);
    Item.find
      .mockReturnValueOnce(buildLeanQuery([]))
      .mockReturnValueOnce(buildLeanQuery([
        { purchasePrice: 50 },
        { purchasePrice: 75 },
      ]));
    Inventory.findOneAndUpdate
      .mockResolvedValueOnce({ _id: 'inventory-warehouse-1' })
      .mockResolvedValueOnce({ _id: 'inventory-warehouse-2' });

    const result = await InventoryService.transitionItemStatus(item, 'allocated', {
      toWarehouseId: 'warehouse-2',
    });

    expect(item.currentWarehouseId).toBe('warehouse-2');
    expect(result.inventorySyncs).toHaveLength(2);
    expect(Inventory.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { batchId: 'batch-1', warehouseId: 'warehouse-1' },
      expect.objectContaining({
        $set: { quantity: 0, inventoryValue: 0 },
      }),
      expect.objectContaining({ upsert: true, session: undefined }),
    );
    expect(Inventory.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { batchId: 'batch-1', warehouseId: 'warehouse-2' },
      expect.objectContaining({
        $set: { quantity: 2, inventoryValue: 125 },
      }),
      expect.objectContaining({ upsert: true, session: undefined }),
    );
    expect(Item.countDocuments).toHaveBeenNthCalledWith(1, {
      batchId: 'batch-1',
      currentWarehouseId: 'warehouse-1',
      status: 'in_stock',
    });
    expect(Item.countDocuments).toHaveBeenNthCalledWith(2, {
      batchId: 'batch-1',
      currentWarehouseId: 'warehouse-2',
      status: 'in_stock',
    });
  });

  it('syncs bulk status transitions by each item warehouse', async () => {
    const items = [
      {
        _id: 'item-1',
        batchId: 'batch-1',
        productId: 'product-1',
        currentWarehouseId: 'warehouse-1',
        status: 'delivered',
      },
      {
        _id: 'item-2',
        batchId: 'batch-1',
        productId: 'product-1',
        currentWarehouseId: 'warehouse-1',
        status: 'delivered',
      },
    ];

    Item.find
      .mockReturnValueOnce(buildArrayQuery(items))
      .mockReturnValueOnce(buildLeanQuery([
        { purchasePrice: 50 },
        { purchasePrice: 75 },
      ]));
    Item.bulkWrite.mockResolvedValue({ modifiedCount: 2 });
    InventoryMovement.insertMany.mockResolvedValue([{ _id: 'movement-1' }, { _id: 'movement-2' }]);
    Item.countDocuments.mockResolvedValue(2);
    Inventory.findOneAndUpdate.mockResolvedValue({ _id: 'inventory-warehouse-1' });

    const result = await InventoryService.transitionItemsStatus({
      itemIds: ['item-1', 'item-2'],
      fromStatus: 'delivered',
      toStatus: 'in_stock',
      warehouseId: 'warehouse-1',
    });

    expect(result.modifiedCount).toBe(2);
    expect(Item.countDocuments).toHaveBeenCalledWith({
      batchId: 'batch-1',
      currentWarehouseId: 'warehouse-1',
      status: 'in_stock',
    });
    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      { batchId: 'batch-1', warehouseId: 'warehouse-1' },
      expect.objectContaining({
        $set: { quantity: 2, inventoryValue: 125 },
      }),
      expect.objectContaining({ upsert: true, session: undefined }),
    );
  });
});
