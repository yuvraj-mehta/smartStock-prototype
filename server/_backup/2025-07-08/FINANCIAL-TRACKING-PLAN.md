# Financial Tracking Enhancement Plan

## 1. Data Model Changes

### Batch Model
- Add fields:
  - `unitCost` (Number): Cost per unit for this batch
  - `totalCost` (Number): unitCost × quantity
  - `currency` (String, default: "INR" or "USD")
  - `purchaseOrderId` (ObjectId, ref: PurchaseOrder, optional)

### Inventory Model
- Optionally add:
  - `inventoryValue` (Number): Calculated as sum of batch totalCost for in-stock items

### Item Model
- Optionally add:
  - `purchasePrice` (Number): For per-item cost tracking (if needed for serialized items)

### New Models
- `PurchaseOrder`: supplierId, productId, quantity, unitCost, totalCost, status, paymentStatus, invoiceId
- `Invoice`: purchaseOrderId, amount, dueDate, paidDate, status
- `Payment`: invoiceId, amount, date, method, status
- `SalesOrder`, `SalesInvoice`, `PaymentReceived` for sales/revenue tracking

---

## 2. Controller Changes

### addInventorySupply
- Accept and validate `unitCost` in the request
- Calculate and store `totalCost` in the batch
- Link batch to a `PurchaseOrder` if available
- Update inventory value accordingly

### markDamagedInventory
- When marking items as damaged, calculate and record the financial loss (cost of damaged items)
- Optionally, update a `Loss` or `Adjustment` log/model

### Sales/Dispatch Logic (if present)
- On sale/dispatch, record sale price, cost, and calculate profit
- Update inventory value and COGS

### Payment Endpoints
- Add endpoints to record supplier payments and customer receipts
- Update payment status in `Invoice`/`PurchaseOrder`/`SalesInvoice`

---

## 3. Reporting Endpoints

- Add endpoints to:
  - Get inventory value (by warehouse, product, etc.)
  - Get COGS, profit/loss, outstanding payables/receivables
  - Get value of damaged/lost inventory

---

## 4. Audit & History

- Log all financial changes (who, when, what, value) in a dedicated audit/history model

---

## 5. Validation & Security

- Validate all financial fields (e.g., cost > 0)
- Restrict financial operations to authorized users

---

## 6. Testing

- Add tests for all new/updated endpoints and logic

---

## Summary Table


---

## Implementation Recommendation

**Proceed with phased implementation:**

1. **Start with model changes and inventory cost tracking.**
2. **Add purchasing, sales, and payment modules.**
3. **Implement reporting and audit features.**
4. **Test thoroughly at each step.**

This approach will minimize risk, ensure data integrity, and allow for incremental improvements without disrupting existing operations.

---

| Area         | Action Item                                                                 |
|--------------|-----------------------------------------------------------------------------|
| Models       | Add cost fields, purchase/sales/payment models                              |
| Controllers  | Track cost on add, sale, damage, payment; update inventory value, COGS      |
| Reporting    | Inventory value, COGS, profit, payables/receivables, loss                   |
| Audit        | Log all financial changes                                                   |
| Validation   | Data checks, permissions                                                    |
| Testing      | Test all financial flows                                                    |
