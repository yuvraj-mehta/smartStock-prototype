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

## Health And Readiness

- Confirm liveness returns `200`: `curl -s http://localhost:3500/api/v1/health`.
- Confirm readiness returns `200` only after required config is present and MongoDB is connected: `curl -i http://localhost:3500/api/v1/health/ready`.
- If readiness returns `503`, inspect the response `readiness.checks.database` and `readiness.checks.config` fields before debugging route code.

## Account And Auth

- Create an admin with the local admin script or signup flow supported by the current branch.
- Log in as admin and confirm a token-backed session is stored.
- In a fresh browser session, open protected dashboard, product, inventory, returns, and finance pages and confirm they redirect or reject until login.
- Confirm unauthenticated API calls to product, inventory, order, returns, and finance endpoints return `401`.

## Dashboard

- Open the dashboard after login.
- Confirm summary widgets render without console errors.
- Confirm loading and empty states are readable when local data is minimal.

## Inventory And Orders

- Add a product with required dimensions, SKU, price, category, threshold, and shelf-life fields.
- Add inventory supply for the product and confirm invalid supply shapes are rejected before data changes.
- Confirm the inventory list shows the product, batch, warehouse, quantity, and value fields.
- Create an order for available inventory.
- Process the order and confirm package/order status changes are reflected in the UI.

## Returns

- Open the returns page and confirm an empty list is handled cleanly when no returns exist.
- For a delivered package, initiate a return with returned item details and a valid reason.
- Confirm the return list shows return number/status, package, product, order number, and processed-by details when available.
- Exercise schedule pickup, picked up, and process return flows when the current local data supports them.

## Finance

- Confirm unauthenticated requests to purchase-order, invoice, payment, and financial-report endpoints return `401`.
- After login, open finance views and confirm they either show local data or clear empty states.
- Confirm missing AI provider keys do not crash backend import or startup; AI-specific routes should return an intentional unavailable/error response only after authentication.

## Automated Smoke

- Run server tests when dependencies are installed: `cd server && npm test`.
- If dependencies are not installed, syntax-check new tests at minimum: `cd server && node --check tests/api-contracts.test.js`.

## Database Maintenance Guard

- Preview database cleanup only: `npm run db:clear:dry-run`.
- To clear local business data, run from `server`: `npm run db:clear -- --confirm-db <local-db-name>`.
- Confirm the cleanup summary preserves `users` and `externalusers`.
- Do not run destructive cleanup against shared, production, or protected database names.
