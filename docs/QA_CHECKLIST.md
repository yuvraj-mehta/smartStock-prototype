# QA Checklist

Use this local smoke pass after backend or client integration changes. Do not rely on external AI, email, or hosted database services for this checklist.

## Setup

- Install root dependencies if present: `npm install`.
- Install server dependencies: `cd server && npm install`.
- Install client dependencies: `cd client && npm install`.
- Copy environment templates to local files as needed.
- Server env minimum: set `MONGO_URI`, `JWT_SECRET`, and `PORT`; leave `GEMINI_API_KEY` and `GOOGLE_API_KEY` unset to confirm AI features degrade safely.
- Start the backend locally: `cd server && npm run dev`.
- Start the client locally: `cd client && npm run dev`.
- Keep the browser devtools console open during manual client checks and treat uncaught errors as failures.

## Health And Readiness

- Confirm liveness returns `200`: `curl -s http://localhost:3500/api/v1/health`.
- Confirm readiness returns `200` only after required config is present and MongoDB is connected: `curl -i http://localhost:3500/api/v1/health/ready`.
- If readiness returns `503`, inspect the response `readiness.checks.database` and `readiness.checks.config` fields before debugging route code.

## Account And Auth

- Create an admin with the local admin script or signup flow supported by the current branch.
- Log in as admin and confirm a token-backed session is stored.
- In a fresh browser session, open protected dashboard, product, inventory, returns, and finance pages and confirm they redirect or reject until login.
- Confirm unauthenticated API calls to product, inventory, order, returns, and finance endpoints return `401`.
- Confirm staff-only inventory, order, return, purchase-order, invoice, and payment actions reject non-staff users.

## Dashboard

- Open the dashboard after login.
- Confirm summary widgets render without console errors.
- Confirm loading and empty states are readable when local data is minimal.
- Confirm dashboard inventory numbers match the inventory page for total stock, low stock, damaged stock, and stock value.

## Inventory And Orders

- Add a product with required dimensions, SKU, price, category, threshold, and shelf-life fields.
- Add inventory supply for the product and confirm invalid supply shapes are rejected before data changes.
- Confirm a purchase order receipt, when supplied, increments only the matching purchase order received quantity and never exceeds ordered quantity.
- Confirm the inventory list shows the product, batch, warehouse, quantity, available value, damaged count, damaged value, and sold count fields.
- Confirm product catalog quantity is not used as the live stock source after intake.
- Create an order for available inventory.
- Process the order and confirm item allocation reduces available stock and creates packages with the expected item IDs.
- Confirm concurrent or repeated processing of the same order does not over-allocate stock.
- Confirm package/order status changes are reflected in the UI.
- Mark stock damaged from an in-stock batch and confirm available stock, damaged count, and inventory value update together.

## Inventory Lifecycle Matrix

Run one complete local lifecycle with a small quantity, such as three units:

| Step | Expected item status | Expected aggregate result |
| --- | --- | --- |
| Supply intake | `in_stock` | Batch inventory quantity increases by received units. |
| Order processing | `allocated` | Available quantity decreases by allocated units. |
| Transport delivery | `delivered` | Sold or delivered state is visible without increasing available stock. |
| Damaged stock | `damaged` | Damaged count and damaged value increase. |
| Restockable return | `in_stock` | Available quantity increases only for accepted restock units. |
| Non-restock return | `damaged` | Available quantity does not increase. |

## Returns

- Open the returns page and confirm an empty list is handled cleanly when no returns exist.
- For a delivered package, initiate a return with returned item details and a valid reason.
- Confirm the return list shows return number/status, package, product, order number, and processed-by details when available.
- Exercise schedule pickup, picked up, and process return flows when the current local data supports them.
- Process one restockable return and one defective or damaged return; confirm their item dispositions and inventory effects differ.
- Confirm a return that references item IDs outside the original package is rejected.

## Finance

- Confirm unauthenticated requests to purchase-order, invoice, payment, and financial-report endpoints return `401`.
- After login, open finance views and confirm they either show local data or clear empty states.
- Confirm missing AI provider keys do not crash backend import or startup; AI-specific routes should return an intentional unavailable/error response only after authentication.
- Confirm invoice creation is tied to an existing purchase order and supplier.
- Confirm payment records reduce or settle invoice balance without mutating inventory quantities.
- Compare finance inventory valuation against the item-led inventory view after intake, damage, allocation, and return steps.

## Architecture Regression Checks

- Inventory availability is always derived from `Item.status === "in_stock"`.
- `Inventory.quantity` is a synchronized aggregate, not the allocation source of truth.
- `Product.quantity` is treated as deprecated for live stock.
- Every item status change writes enough history to trace the workflow that changed it.
- Purchase order receipt, invoice creation, payment recording, fulfillment, transport, and return processing stay inside their route boundaries.
- Retired or unsafe legacy endpoints return intentional errors instead of silently mutating stock.

## Automated Smoke

- Run server tests when dependencies are installed: `cd server && npm test`.
- If dependencies are not installed, syntax-check new tests at minimum: `cd server && node --check tests/api-contracts.test.js`.
- Run client smoke checks when dependencies are installed: `cd client && npm test`.
- For a faster client-only pass during iteration, run `cd client && npm run lint:quiet`.
- Before handing off UI changes, run `cd client && npm run build` to catch Vite integration failures.

## Database Maintenance Guard

- Preview database cleanup only: `npm run db:clear:dry-run`.
- To clear local business data, run from `server`: `npm run db:clear -- --confirm-db <local-db-name>`.
- Confirm the cleanup summary preserves `users` and `externalusers`.
- Do not run destructive cleanup against shared, production, or protected database names.
