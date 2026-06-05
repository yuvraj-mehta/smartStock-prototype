# SmartStock Architecture

This document captures the backend architecture that exists in this branch. It focuses on the API, persistence, operational checks, and the data ownership boundaries that matter for inventory and fulfillment work.

## Runtime Shape

SmartStock is split into a client app and an Express API server.

- Root scripts delegate to `client` and `server` package scripts.
- `server/app.js` builds the Express app, applies CORS and JSON middleware, mounts versioned API routes under `/api/v1`, and installs the shared 404 and error handlers.
- `server/server.js` validates required config, opens the MongoDB connection, starts scheduled jobs, then starts listening.
- MongoDB is accessed through Mongoose models in `server/models`.

## API Route Boundaries

The server exposes these primary route groups:

- `/api/v1/auth` and `/api/v1/user`: authentication, current user, and user administration.
- `/api/v1/product`: product catalog, SKU, pricing, dimensions, threshold, and shelf-life fields.
- `/api/v1/inventory`: supply intake, inventory views, damage marking, and real-time inventory status.
- `/api/v1/order`, `/api/v1/package`, `/api/v1/transport`, `/api/v1/return`: fulfillment and reverse-logistics workflow.
- `/api/v1/purchase-order`, `/api/v1/invoice`, `/api/v1/payment`, `/api/v1/financial-report`: finance tracking and reporting.
- `/api/v1/sales`, `/api/v1/sales-order`, `/api/v1/sales-invoice`, `/api/v1/payment-received`: sales and revenue tracking.
- `/api/v1/inventory-analytics` and `/api/v1/ai`: inventory analytics and AI-assisted insights.
- `/api/v1/health`: liveness and readiness diagnostics.

Most domain routes are token-protected through route-level middleware. Public checks are intentionally limited to `/` and `/api/v1/health`.

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

`server/clearDatabase.js` is guarded because it deletes business data. It never deletes users or external users.

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

## Testing Entry Points

Run the backend smoke and contract tests:

```bash
npm test
```

The current tests cover public health contracts, unauthenticated route protection, validation contracts, finance route protection, returns list shape, and the guarded database-clear script.
