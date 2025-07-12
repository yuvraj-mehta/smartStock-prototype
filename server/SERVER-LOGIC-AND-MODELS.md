# SmartStock Server: Inventory & Financial Logic Overview

## Core Models

### Batch

- Tracks a batch of products received from a supplier.
- Fields: batchNumber, productId, warehouseId, supplierId, quantity, mfgDate, expDate, unitCost, totalCost, currency, purchaseOrderId, status.

### Inventory

- Tracks available stock by batch and warehouse.
- Fields: batchId, quantity, warehouseId, inventoryValue.

### Item

- Tracks individual serialized items (if needed).
- Fields: batchId, productId, serialNumber, currentWarehouseId, status, history, purchasePrice.

### PurchaseOrder

- Represents a procurement order to a supplier.
- Fields: supplierId, productId, quantity, unitCost, totalCost, status, paymentStatus, invoiceId.

### Invoice

- Represents a supplier invoice for a purchase order.
- Fields: purchaseOrderId, amount, dueDate, paidDate, status.

### Payment

- Tracks payments made to suppliers.
- Fields: invoiceId, amount, date, method, status.

### SalesOrder

- Represents a customer sales order.
- Fields: customerId, productId, quantity, unitPrice, totalPrice, status, salesInvoiceId.

### SalesInvoice

- Represents an invoice for a sales order.
- Fields: salesOrderId, amount, dueDate, paidDate, status.

### PaymentReceived

- Tracks payments received from customers.
- Fields: salesInvoiceId, amount, date, method, status.

### AuditLog

- Logs all financial and inventory changes for traceability.
- Fields: userId, action, entityType, entityId, value, details, timestamp.

---

## Core Business Logic & Flows

### 1. Inventory Supply

- Adds new stock via batches, updates inventory and item records.
- Records cost, total, and purchase order linkage.
- Audit log entry created.

### 2. Mark Damaged Inventory

- Marks items as damaged, calculates and logs financial loss.
- Updates item status/history and audit log.

### 3. Sales/Dispatch

- Deducts inventory and marks items as dispatched.
- Calculates COGS and profit for each sale.
- Updates inventory value and logs audit.

### 4. Purchase, Sales, Payment Flows

- Full CRUD for purchase orders, invoices, payments, sales orders, sales invoices, and payments received.
- All financial actions are logged.

### 5. Reporting

- Endpoints for:
  - Inventory value by warehouse/product
  - COGS and profit/loss over a period
  - Outstanding payables/receivables
  - Value of damaged/lost inventory

### 6. Validation & Security

- All sensitive endpoints require authentication and proper roles (admin, finance, sales, etc).
- All financial fields are validated for presence and positivity.

### 7. Testing

- Automated Jest tests for all major endpoints and flows.

---

## Recommendations for Further Robustness

- Add stock reservation/allocation logic.
- Implement manual stock adjustment/audit endpoints.
- Enhance returns/reverse logistics handling.
- Add support for stock transfers between locations.
- Implement expiry management and notifications.
- Expand edge-case and integration tests.
- Add API rate limiting and monitoring for production.

---

This document summarizes the server-side logic and data model relationships for SmartStock’s robust inventory and financial management system.
