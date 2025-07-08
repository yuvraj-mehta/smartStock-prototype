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

## Updated Implementation Roadmap (as of July 2025)

### Completed

- Model changes for purchasing, inventory, and payment tracking
- Controllers and endpoints for supply, damage, purchase, invoice, payment
- Audit logging for all financial actions
- Role-based authorization and field validation
- Basic reporting (inventory value)
- Automated tests for all major endpoints

### Next Steps (In Progress)

1. **Sales/Revenue Models & Logic**
   - Create `SalesOrder`, `SalesInvoice`, `PaymentReceived` models
   - Implement CRUD and business logic for sales/dispatch
   - On sale/dispatch, record sale price, cost, calculate profit, update inventory value and COGS
2. **Advanced Reporting Endpoints**
   - COGS (Cost of Goods Sold): Endpoint to calculate/report COGS over a period
   - Profit/Loss: Endpoint to report profit/loss by product, period, etc.
   - Payables/Receivables: Endpoints to report outstanding supplier/customer balances
   - Damaged/Lost Value: Endpoint to report value of damaged/lost inventory
3. **Testing & Documentation**
   - Add tests for new sales endpoints and advanced reports
   - Update API and user documentation for new features

---

| Area        | Action Item                                                            | Status                         |
| ----------- | ---------------------------------------------------------------------- | ------------------------------ |
| Models      | Add cost fields, purchase/sales/payment models                         | ✔️ (except sales, in progress) |
| Controllers | Track cost on add, sale, damage, payment; update inventory value, COGS | ✔️ (except sale, in progress)  |
| Reporting   | Inventory value, COGS, profit, payables/receivables, loss              | ✔️ (inventory); ⚠️ (others)    |
| Audit       | Log all financial changes                                              | ✔️                             |
| Validation  | Data checks, permissions                                               | ✔️                             |
| Testing     | Test all financial flows                                               | ✔️ (basic); ⚠️ (advanced)      |
| Audit       | Log all financial changes                                              |
| Validation  | Data checks, permissions                                               |
| Testing     | Test all financial flows                                               |
