# SmartStock Architecture

This document captures the backend architecture that exists in this branch. It focuses on the API, persistence, operational checks, and the data ownership boundaries that matter for inventory and fulfillment work.

## Runtime Shape

SmartStock is split into a client app and an Express API server.

- Root scripts delegate to `client` and `server` package scripts.
- `server/app.js` builds the Express app, applies CORS and JSON middleware, mounts versioned API routes under `/api/v1`, and installs the shared 404 and error handlers.
- `server/server.js` validates required config, opens the MongoDB connection, starts scheduled jobs, then starts listening.
- MongoDB is accessed through Mongoose models in `server/models`.

## Reviewer System Map

The portfolio review path should be read as a working operations product, not as a landing-page-only prototype.

```text
Public Landing
  -> /login credential exchange
  -> React auth bootstrap and ProtectedRoute gates
  -> Authenticated Home / Dashboard / Workflow pages
  -> Express /api/v1 route groups
  -> Mongoose models and MongoDB domain records
```

The client surfaces map to these backend responsibilities:

| Client surface | Primary API boundary | Domain source of truth |
| --- | --- | --- |
| Login and auth bootstrap | `/api/v1/auth`, `/api/v1/user` | JWT session, user role, assigned warehouse |
| Dashboard and inventory | `/api/v1/inventory`, `/api/v1/inventory-analytics`, `/api/v1/ai` | `Item.status`, synchronized `Inventory`, batch and product metadata |
| Products and users | `/api/v1/product`, `/api/v1/user`, `/api/v1/external-user` | Product catalog, internal users, suppliers, transporters |
| Orders and packages | `/api/v1/order`, `/api/v1/package`, `/api/v1/transport` | Allocated items, packages, transport records |
| Returns | `/api/v1/return`, `/api/v1/transport` | Return record, package allocation, item disposition |
| Finance | `/api/v1/purchase-order`, `/api/v1/invoice`, `/api/v1/payment`, `/api/v1/financial-report`, `/api/v1/sales`, `/api/v1/sales-invoice`, `/api/v1/payment-received` | Purchase, sales, payment, journal, and reporting records |

## API Route Boundaries

The server exposes these primary route groups:

- `/api/v1/auth` and `/api/v1/user`: authentication, current user, and internal user administration.
- `/api/v1/external-user`: supplier and transporter administration for users outside the internal staff model.
- `/api/v1/product`: product catalog, SKU, pricing, dimensions, threshold, and shelf-life fields.
- `/api/v1/inventory`: supply intake, inventory views, damage marking, and real-time inventory status.
- `/api/v1/order`, `/api/v1/package`, `/api/v1/transport`, `/api/v1/return`: fulfillment and reverse-logistics workflow.
- `/api/v1/purchase-order`, `/api/v1/invoice`, `/api/v1/payment`, `/api/v1/financial-report`: finance tracking and reporting.
- `/api/v1/sales`: active read-only sales-history queries for confirmed package sales. Manual `POST /api/v1/sales/record` is retired and returns `410`.
- `/api/v1/sales-order`: retired legacy workflow surface. Create, read, update, and delete operations return `410` and point callers to the canonical `/api/v1/order` flow.
- `/api/v1/sales-invoice` and `/api/v1/payment-received`: active sales invoicing and revenue collection.
- `/api/v1/inventory-analytics` and `/api/v1/ai`: inventory analytics and AI-assisted insights.
- `/api/v1/health`: liveness and readiness diagnostics.

Most domain routes are token-protected through route-level middleware, including resource-root routes such as `/api/v1/product`, `/api/v1/item`, `/api/v1/order`, and `/api/v1/return`.

Internal API access is role-based and warehouse-scoped:

- Internal roles are `admin`, `staff`, and `viewer`; all authenticated internal users must be assigned to a warehouse before they can use protected APIs.
- `viewer` is read-only for warehouse-scoped operational data: products, inventory, items, orders, packages, transports, and returns.
- `staff` can run day-to-day warehouse operations such as inventory intake, order processing, package dispatch, transport assignment, and return handling.
- `admin` owns user, external-user, product catalog, manual item-status, and administrative finance/reporting surfaces.
- `PATCH /api/v1/transport/status/:transportId` has a separate auth path that accepts `admin` and `staff` internal users plus active external transporters assigned to a warehouse.

The unauthenticated public surface is intentionally limited to:

- `GET /`
- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/transporter-login`

The auth POST endpoints are credential exchange endpoints, not resource roots.

## Client Entry Paths

Unauthenticated users land on the public orientation page. That page includes a small dashboard preview with static values that are labeled as demo metrics. The live values are inside authenticated routes after the client has a token and the API returns local data.

- Admin reviewer path: `Landing -> /login -> /dashboard`, with `/admin`, user management, product controls, finance, and operational workflow pages available through the protected shell.
- Staff reviewer path: `Landing -> /login -> /dashboard`, with inventory, orders, packages, returns, transport, finance, and AI-supported planning available for daily operations.
- Viewer and other signed-in path in the current client shell: `Landing -> /login -> /profile`. The backend has viewer read-only policies for warehouse-scoped data, but the current client route gates keep non-admin/non-staff users out of the main workflow pages.
- External transporter path: credential exchange uses `/api/v1/auth/transporter-login`, and transport status changes are handled by the dedicated transport-status auth path.

## Source Of Truth

Inventory availability is item-led:

- `Item.status === "in_stock"` is the source of truth for sellable inventory.
- `Inventory.quantity` is a synchronized aggregate for a batch and warehouse.
- `Product.quantity` is deprecated and should not be used as the primary availability source.
- Batch-level quantities capture received quantity and financial intake context; they are not the live stock count after allocation, damage, shipping, or return flows.

When a workflow changes item availability, the affected batch inventory aggregate should be synchronized from item status counts. Existing controllers use local `syncInventoryForBatch` helpers for that pattern.

## Operational Checks

The root endpoint is a minimal uptime response:

```text
GET /
```

The health route includes liveness plus readiness detail:

```text
GET /api/v1/health
```

The readiness endpoint returns `200` only when required config is present and Mongoose is connected:

```text
GET /api/v1/health/ready
```

If the API process is alive but not ready, `/api/v1/health/ready` returns `503` with failed checks for database and/or config. This lets uptime checks use `/api/v1/health` while deploy readiness checks use `/api/v1/health/ready`.

## Database Maintenance

`server/clearDatabase.js` is guarded because it deletes business data. It never deletes users, external users, or warehouses.

Default dry run:

```bash
npm run db:clear:dry-run
```

Destructive execution requires both `--execute` and an exact database confirmation:

```bash
cd server
npm run db:clear -- --confirm-db myapp
```

The script refuses protected database names such as `admin`, `config`, `local`, `prod`, and `production` unless explicitly overridden in code or environment. Prefer creating a fresh local database over clearing a shared one.

Seed scripts also refuse built-in development credentials by default. For a local-only seed with explicit development defaults, run:

```bash
cd server
npm run seed:dev
```

Use `ADMIN_PASSWORD` and `SEED_SUPPLIER_PASSWORD` with unique values for any shared or deployed database.

## Testing Entry Points

Run the backend smoke and contract tests:

```bash
cd server
npm test
```

The current tests cover public health contracts, unauthenticated route protection, validation contracts, finance route protection, viewer read-only route access, route ordering for parameterized routes, transport status auth, returns list shape, inventory-service transitions, finance ledger validation, retired legacy routes, and the guarded database-clear script.

Run the client smoke gate:

```bash
cd client
npm test
```

The client test script intentionally uses only installed tooling. It runs the quiet ESLint pass and a Vite production build with the local API URL supplied by the smoke script, which catches route import errors, broken React modules, and production bundling regressions without adding a browser or unit-test dependency. Normal deploy builds still require `VITE_API_BASE_URL` to be set to the absolute Express API URL.
