# SmartStock Data Flow

This document describes the main business data flows in the current server implementation. It is meant to help workers reason about where quantities, item states, and financial values are updated.

## Inventory Intake

1. A staff user submits supply through `/api/v1/inventory/add-supply`.
2. The controller requires a valid assigned warehouse on the authenticated user.
3. A `Batch` is created for the received product, supplier, warehouse, manufacturing date, expiry date, quantity, and unit cost.
4. An `IncomingSupply` record captures the receipt event.
5. An `Inventory` aggregate is created for the batch and warehouse.
6. One `Item` document is created per received unit with `status: "in_stock"` and a generated serial number.
7. The product supplier list may be updated, but product quantity is not treated as the live stock source.

Important invariant: received batch quantity and live available quantity can diverge after fulfillment, damage, or returns. Live availability comes from item status.

## Inventory Views

Inventory list responses group `Inventory` records by populated batch and product. For each batch, the controller counts related items by status:

- `in_stock`: available quantity.
- `damaged`: damaged quantity and damaged value.
- `delivered`: sold quantity and sold value.

This means the UI can show current stock even when aggregate inventory rows need synchronization.

## Order Processing

1. A staff user creates an order with platform order ID and requested product quantities.
2. Processing an order searches batches in FIFO order.
3. The controller allocates only `Item` records with `status: "in_stock"`.
4. Allocated items are updated to `status: "allocated"` with history entries.
5. `Inventory.quantity` and `Inventory.inventoryValue` are synchronized for each affected batch.
6. A `Package` is created with the allocated product, batch, quantity, and item IDs.
7. The order moves from `pending` to `processing`.

Concurrency guard: if an item changes status during allocation, the controller returns a conflict instead of over-allocating stock.

## Damage Handling

1. A staff user calls `/api/v1/inventory/mark-damaged` with batch, quantity, and optional reason.
2. The controller verifies batch access against the assigned warehouse.
3. It selects in-stock items from the batch.
4. Selected items move to `status: "damaged"` with history entries.
5. Inventory for the batch is synchronized from remaining in-stock item counts.
6. An audit log captures the financial loss.

Damage does not mutate `Product.quantity`; downstream reports should use item statuses and synchronized inventory values.

## Returns

Returns are tied back to package allocation data:

1. A return request references package items and requested return quantities.
2. The controller validates that return quantities do not exceed original package quantities.
3. Processing a return updates item states according to the return result.
4. Return list responses include package, product, order, and processed-by fields when populated.

The return route contract is covered by smoke tests so UI consumers can rely on the paged response shape.

## Finance Reporting

Finance endpoints read from purchase orders, invoices, payments, sales, inventory, and damaged item state. Inventory-value reporting should prefer the item-led current-stock model for live values and only use batch or inventory aggregates as supporting data.

## Readiness Flow

The API process can be alive before it is ready for traffic:

1. `/api/v1/health` always returns the liveness payload plus readiness state.
2. `/api/v1/health/ready` evaluates required config and Mongoose connection state.
3. A connected database and valid required config produce `status: "ready"` and HTTP `200`.
4. Missing config or a disconnected database produces `status: "not_ready"` and HTTP `503`.

Use `/api/v1/health/ready` for deployment readiness gates and `/api/v1/health` for uptime monitoring. Detailed readiness checks are available outside production; production responses are intentionally redacted.
