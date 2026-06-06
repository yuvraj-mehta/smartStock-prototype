import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Brain,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  KeyRound,
  Landmark,
  Layers,
  ListChecks,
  LockKeyhole,
  Package,
  PackageSearch,
  ReceiptText,
  Server,
  Settings,
  ShieldCheck,
  Truck,
  Undo2,
  Users,
} from 'lucide-react';

import { ROUTES } from '../constants';

const summaryCards = [
  {
    label: 'Stack',
    value: 'React + Express',
    helper: 'Vite client, versioned API, MongoDB persistence.',
  },
  {
    label: 'Access',
    value: 'Role gated',
    helper: 'Admin, staff, viewer, supplier, and transporter boundaries.',
  },
  {
    label: 'Stock source',
    value: 'Item-led stock',
    helper: 'Item status drives inventory and product availability.',
  },
  {
    label: 'Demo state',
    value: 'Used workflow',
    helper: 'Seeded orders, packages, transport, returns, payments, and insights.',
  },
  {
    label: 'Finance',
    value: 'Ledger backed',
    helper: 'Confirmed sale and payment events create journal entries.',
  },
  {
    label: 'Public docs',
    value: 'No login needed',
    helper: 'This page is available before authentication for reviewers.',
  },
];

const tableOfContents = [
  ['Overview', '#overview'],
  ['Architecture', '#architecture'],
  ['Data flow', '#data-flow'],
  ['Data ownership', '#data-ownership'],
  ['Roles', '#roles'],
  ['API map', '#api-map'],
  ['Demo data', '#demo-data'],
  ['Runbook', '#runbook'],
  ['Quality', '#quality'],
];

const architectureLayers = [
  {
    title: 'Client Shell',
    icon: Layers,
    description: 'The React app owns the public landing page, public documentation, login, authenticated layout, and role-aware module navigation.',
    details: ['React Router protects workflow routes.', 'Redux auth bootstrap restores sessions.', 'The navbar filters modules by role.'],
  },
  {
    title: 'API Boundary',
    icon: Server,
    description: 'The Express server mounts versioned route groups under /api/v1 and applies shared CORS, body parsing, validation, 404, and error handling.',
    details: ['Auth routes issue JWTs.', 'Domain routes require token checks.', 'Health routes stay public for deployment checks.'],
  },
  {
    title: 'Domain Services',
    icon: Settings,
    description: 'Business logic lives in controllers and services so pages do not decide inventory, finance, AI, or workflow rules.',
    details: ['Inventory sync derives from item state.', 'Finance writes use transactional events.', 'AI features read operational snapshots.'],
  },
  {
    title: 'Persistence',
    icon: Database,
    description: 'Mongoose models store the warehouse graph: users, warehouses, products, batches, items, orders, packages, returns, transports, and ledgers.',
    details: ['MongoDB is the system of record.', 'Warehouse assignment scopes records.', 'Seed scripts create repeatable demo state.'],
  },
];

const lifecycleSteps = [
  {
    label: 'Product intake',
    icon: PackageSearch,
    route: ROUTES.PRODUCTS,
    status: 'Catalog record created',
    effect: 'Defines SKU, category, dimensions, pricing, threshold, and active state.',
  },
  {
    label: 'Inventory stock',
    icon: Boxes,
    route: ROUTES.INVENTORY,
    status: 'Serialized items in stock',
    effect: 'Batch items become the live source of available quantity.',
  },
  {
    label: 'Order created',
    icon: ClipboardList,
    route: ROUTES.ORDERS,
    status: 'pending or processing',
    effect: 'Customer demand is captured before physical stock is allocated.',
  },
  {
    label: 'Package allocated',
    icon: Package,
    route: ROUTES.ORDERS,
    status: 'ready for dispatch',
    effect: 'Specific item IDs are reserved and linked to the package.',
  },
  {
    label: 'Transport assigned',
    icon: Truck,
    route: ROUTES.TRANSPORT,
    status: 'dispatched or in transit',
    effect: 'Forward delivery moves package state through transporter ownership.',
  },
  {
    label: 'Payment recorded',
    icon: ReceiptText,
    route: ROUTES.FINANCE,
    status: 'pending or completed',
    effect: 'Finance records receivables, customer payment, COGS, and journal entries.',
  },
  {
    label: 'Return handled',
    icon: Undo2,
    route: ROUTES.RETURNS,
    status: 'received or processed',
    effect: 'Reverse transport and item disposition update damaged or reusable stock.',
  },
  {
    label: 'AI review',
    icon: Brain,
    route: ROUTES.AI_ASSISTANT,
    status: 'forecast or insight active',
    effect: 'Demand and risk records guide reorder and operational review decisions.',
  },
];

const roleRows = [
  ['Admin', 'Full internal access', 'User management, external partners, product controls, inventory operations, workflow modules, finance, and reporting.'],
  ['Staff', 'Warehouse operations', 'Inventory intake, order processing, package dispatch, transport assignment, return handling, finance operations, and AI review.'],
  ['Viewer', 'Read-oriented access', 'Internal review role for catalog and warehouse-scoped operational data where the backend permits read-only access.'],
  ['Supplier', 'External partner record', 'Managed through external-user administration and associated with supply-side business records.'],
  ['Transporter', 'External delivery flow', 'Uses transporter login and can participate in transport-status workflows assigned to its warehouse.'],
];

const endpointGroups = [
  ['/api/v1/auth', 'Public login endpoints plus protected logout, change-password, and profile update actions.', 'Public for login, protected for account changes.'],
  ['/api/v1/user', 'Internal user creation, update, deletion, current-user reads, and administrative user lookup.', 'Admin-owned except current profile.'],
  ['/api/v1/external-user', 'Supplier and transporter administration for non-internal partner accounts.', 'Admin-owned.'],
  ['/api/v1/product', 'Product catalog, SKU metadata, pricing, dimensions, threshold, shelf life, and active status.', 'Internal read, admin write.'],
  ['/api/v1/item', 'Serialized stock records, item status, batch lookups, product lookups, and manual item updates.', 'Warehouse-scoped.'],
  ['/api/v1/inventory', 'Supply intake, inventory views, damage marking, and synchronized batch inventory records.', 'Internal workflow roles.'],
  ['/api/v1/order', 'Canonical customer order workflow from pending through sale confirmation or return.', 'Internal workflow roles.'],
  ['/api/v1/package', 'Allocated item IDs, package status, packed values, and fulfillment handoff.', 'Internal workflow roles.'],
  ['/api/v1/transport', 'Forward delivery and reverse logistics transport records plus status updates.', 'Internal and transporter-aware status flow.'],
  ['/api/v1/return', 'Return initiation, pickup scheduling, receipt, disposition, and processed return records.', 'Internal workflow roles.'],
  ['/api/v1/sales', 'Read-only sales history and retired manual sales recording endpoint.', 'Protected; manual POST is retired.'],
  ['/api/v1/sales-invoice', 'Sales invoice creation, reads, updates, and deletes.', 'Admin or staff.'],
  ['/api/v1/payment-received', 'Customer payment receipt creation, reads, updates, and deletes.', 'Admin or staff.'],
  ['/api/v1/purchase-order', 'Purchase order records for supply-side finance tracking.', 'Admin or staff.'],
  ['/api/v1/invoice', 'Supplier invoice records and update flow.', 'Admin or staff.'],
  ['/api/v1/payment', 'Outgoing payment records.', 'Admin or staff.'],
  ['/api/v1/financial-report', 'Inventory value, receivables, payables, COGS, profit, and damaged-stock reporting.', 'Admin reporting surface.'],
  ['/api/v1/inventory-analytics', 'Inventory prediction data used by analytics and AI modules.', 'Admin or staff.'],
  ['/api/v1/ai', 'Demand forecasts, AI insights, stock optimization, seasonal analysis, and JSON data analysis.', 'Admin or staff.'],
  ['/api/v1/health', 'Liveness and readiness checks for deployment and uptime monitoring.', 'Public.'],
];

const seededRows = [
  ['Products', '5 SKUs', 'Electronics, furniture, and apparel records with unit cost, price, thresholds, dimensions, shelf life, and active state.'],
  ['Inventory', '65 serialized items', 'Each item belongs to a product, batch, warehouse, status, history log, and purchase-price context.'],
  ['Orders', '7 lifecycle states', 'Pending, processing, packaged, dispatched, delivered, sale confirmed, and returned workflows are represented.'],
  ['Fulfillment', '5 packages and 5 transports', 'Forward delivery and reverse logistics data show the physical movement path of stock.'],
  ['Returns', '1 processed return', 'Returned item disposition shows damaged inventory exposure after reverse pickup and warehouse receipt.'],
  ['Finance', '2 payments and ledger events', 'Confirmed sale and completed customer payment produce finance events and journal entries.'],
  ['Intelligence', '2 forecasts and 2 insights', 'Forecast and risk records make AI pages useful immediately after sign-in.'],
];

const runbookRows = [
  ['Backend dev server', 'Starts the Express API with configured MongoDB and scheduled jobs.', 'cd server && npm run dev'],
  ['Frontend dev server', 'Starts Vite for the React client.', 'cd client && npm run dev'],
  ['Client smoke', 'Runs quiet lint and production smoke build with a local API URL.', 'cd client && npm test'],
  ['Backend tests', 'Runs Jest and Supertest coverage for routes, contracts, services, and guards.', 'cd server && npm test'],
  ['DB dry run', 'Prints target collection counts without deleting data.', 'cd server && npm run db:clear:dry-run'],
  ['Guarded DB clear', 'Deletes business data only after an exact database-name confirmation.', 'cd server && npm run db:clear -- --confirm-db smartstock'],
  ['Demo usage seed', 'Rebuilds products, inventory, workflow records, payments, finance events, forecasts, and insights.', 'cd server && npm run seed:demo-usage:dev'],
];

const dataOwnershipRows = [
  ['Item.status', 'Live stock truth', 'Available quantity is derived from item records, not from a standalone product counter.'],
  ['Inventory.quantity', 'Synchronized aggregate', 'Batch and warehouse inventory rows summarize in-stock item counts and values.'],
  ['Product.quantity', 'Display fallback', 'Kept for compatibility but should not be treated as the authoritative availability source.'],
  ['Package.allocatedItems', 'Fulfillment allocation', 'Links specific item IDs to an order package so physical stock movement is traceable.'],
  ['Transport.status', 'Movement state', 'Tracks forward and reverse legs after package handoff.'],
  ['Return.returnedItems', 'Reverse disposition', 'Records returned item IDs and disposition such as restock, damaged, defective, or quality issue.'],
  ['FinancialEvent', 'Ledger event source', 'Records finance activity with idempotency keys and journal entries.'],
  ['DemandForecast and AIInsight', 'Decision support', 'Stores generated forecast and recommendation records for later review.'],
];

const qualityRows = [
  ['Route protection', 'Tests verify unauthenticated requests, viewer read-only access, route ordering, and transport status auth paths.'],
  ['Finance invariants', 'Finance tests cover balanced journal entries, event validation, receivable/payment logic, and report calculations.'],
  ['Inventory transitions', 'Service tests validate item state movement and inventory synchronization behavior.'],
  ['Retired workflows', 'Legacy route tests ensure deprecated manual sales and sales-order flows return intentional responses.'],
  ['Frontend smoke', 'The client test script catches broken imports, route regressions, and Vite production-bundle failures.'],
  ['DB safety', 'The clear script has dry-run mode, protected database names, preserved identity collections, and exact-name confirmation.'],
];

const publicPrivateRows = [
  ['Public', 'Landing page, documentation page, health endpoints, readiness endpoint, login, and transporter login.'],
  ['Authenticated shell', 'Dashboard, inventory, products, orders, returns, transport, finance, AI assistant, profile, and admin console.'],
  ['Public documentation rule', 'This documentation is intentionally outside login, but it avoids exposing secrets, tokens, or live credentials.'],
];

const environmentRows = [
  ['Server config', 'MONGO_URI, DB_NAME, JWT_SECRET, CORS origin, AI provider keys, and optional mail/cloud settings.'],
  ['Client config', 'VITE_API_BASE_URL points the browser build to the deployed or local Express API.'],
  ['Production build guard', 'Plain production builds require an absolute API URL so deploys do not silently point at a relative API.'],
  ['Local smoke build', 'build:smoke supplies http://localhost:3500/api/v1 for local verification.'],
];

const moduleLinks = [
  { label: 'Dashboard', route: ROUTES.DASHBOARD, icon: BarChart3 },
  { label: 'Products', route: ROUTES.PRODUCTS, icon: PackageSearch },
  { label: 'Inventory', route: ROUTES.INVENTORY, icon: Boxes },
  { label: 'Orders', route: ROUTES.ORDERS, icon: ClipboardList },
  { label: 'Transport', route: ROUTES.TRANSPORT, icon: Truck },
  { label: 'Returns', route: ROUTES.RETURNS, icon: Undo2 },
  { label: 'Finance', route: ROUTES.FINANCE, icon: ReceiptText },
  { label: 'AI Assistant', route: ROUTES.AI_ASSISTANT, icon: Brain },
  { label: 'Admin Console', route: ROUTES.ADMIN, icon: Users },
];

const SectionHeader = ({ eyebrow, title, description }) => (
  <div className="mb-4">
    <p className="text-sm font-semibold uppercase text-blue-700">{eyebrow}</p>
    <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
    {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
  </div>
);

const InfoList = ({ items }) => (
  <div className="mt-3 grid gap-2">
    {items.map((item) => (
      <div key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <span>{item}</span>
      </div>
    ))}
  </div>
);

const DocumentationPage = () => (
  <div className="min-h-screen bg-slate-50">
    <section id="overview" className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-blue-700">Project Documentation</p>
                <h1 className="mt-1 text-3xl font-semibold text-slate-950">SmartStock operating reference</h1>
              </div>
            </div>
            <p className="mt-4 text-base leading-7 text-slate-600">
              A public reviewer-facing reference for the project architecture, role model,
              data ownership rules, operational data flow, API groups, seeded demo state,
              local commands, and quality checks.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={ROUTES.HOME}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Back to landing
              </Link>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign in to workspace
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {moduleLinks.slice(0, 4).map(({ label, route, icon: Icon }) => (
              <Link
                key={route}
                to={route}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.helper}</p>
            </div>
          ))}
        </div>

        <nav className="rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Documentation sections">
          <p className="mb-3 text-sm font-semibold text-slate-700">Jump to section</p>
          <div className="flex flex-wrap gap-2">
            {tableOfContents.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </section>

    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section id="architecture" className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Architecture"
            title="How the project is separated"
            description="The app is split into a protected React shell and a versioned Express API. Inventory and finance rules stay server-side, with MongoDB as the source of truth."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {architectureLayers.map((layer) => {
              const Icon = layer.icon;

              return (
              <div key={layer.title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-blue-700 ring-1 ring-slate-200">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold text-slate-950">{layer.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{layer.description}</p>
                <InfoList items={layer.details} />
              </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Public And Private"
            title="What is visible before login"
            description="The project exposes enough context for reviewers without exposing protected operational data."
          />
          <div className="divide-y divide-slate-200">
            {publicPrivateRows.map(([label, description]) => (
              <div key={label} className="grid gap-2 py-3 sm:grid-cols-[130px_1fr]">
                <div className="flex items-center gap-2 font-semibold text-slate-950">
                  <LockKeyhole className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  {label}
                </div>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="data-flow" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          eyebrow="Data Flow"
          title="Operational lifecycle"
          description="The seeded project state walks through the same workflow a warehouse team would use during daily operations."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {lifecycleSteps.map(({ label, icon: Icon, route, status, effect }) => (
            <Link
              key={label}
              to={route}
              className="group flex min-h-40 items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-700 ring-1 ring-slate-200 group-hover:text-blue-700">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-slate-950">{label}</p>
                <p className="mt-1 text-xs font-semibold uppercase text-blue-700">{status}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{effect}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="data-ownership" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          eyebrow="Data Ownership"
          title="Source-of-truth rules"
          description="These rules explain which model owns each important business fact and why the workflow stays consistent."
        />
        <div className="overflow-hidden rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Record</th>
                <th scope="col" className="px-4 py-3 font-semibold">Owns</th>
                <th scope="col" className="px-4 py-3 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {dataOwnershipRows.map(([record, owns, detail]) => (
                <tr key={record}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-blue-700">{record}</td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{owns}</td>
                  <td className="px-4 py-3 leading-6 text-slate-600">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="roles" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          eyebrow="Roles"
          title="Access boundaries"
          description="Routes and API calls are scoped by account type and warehouse assignment."
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {roleRows.map(([role, access, description]) => (
            <div key={role} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700" aria-hidden="true" />
                <p className="font-semibold text-slate-950">{role}</p>
              </div>
              <p className="mt-2 text-sm font-semibold uppercase text-slate-500">{access}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="api-map" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          eyebrow="API"
          title="Primary endpoint groups"
          description="The backend groups related responsibilities under versioned routes. Resource routes are token-protected unless explicitly public."
        />
        <div className="overflow-hidden rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Route group</th>
                <th scope="col" className="px-4 py-3 font-semibold">Responsibility</th>
                <th scope="col" className="px-4 py-3 font-semibold">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {endpointGroups.map(([route, description, access]) => (
                <tr key={route}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-blue-700">{route}</td>
                  <td className="px-4 py-3 leading-6 text-slate-600">{description}</td>
                  <td className="px-4 py-3 text-slate-600">{access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="demo-data" className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Seeded Demo"
            title="Current realistic data set"
            description="The demo database has enough activity to show the project as a used system instead of a blank prototype."
          />
          <div className="divide-y divide-slate-200">
            {seededRows.map(([label, count, description]) => (
              <div key={label} className="flex gap-3 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-950">{label}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-emerald-700">{count}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Reviewer Notes"
            title="How to evaluate the project"
            description="The fastest review path is to read this page first, then sign in and inspect the seeded operational modules."
          />
          <div className="grid gap-3">
            {moduleLinks.map(({ label, route, icon: Icon }) => (
              <Link
                key={route}
                to={route}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-blue-700 ring-1 ring-slate-200">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-slate-950">{label}</span>
                </span>
                <span className="text-sm font-semibold text-slate-500">Open</span>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section id="runbook" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Runbook"
            title="Useful local commands"
            description="Commands are listed by workflow so the project can be reset, seeded, and verified consistently."
          />
          <div className="grid gap-3">
            {runbookRows.map(([label, detail, command]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-950 p-4 text-white">
                <p className="text-sm font-semibold text-slate-100">{label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
                <code className="mt-3 block whitespace-pre-wrap break-words rounded-md bg-slate-900 px-3 py-2 text-sm text-blue-100">{command}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Environment"
            title="Configuration expectations"
            description="The repo has deliberate config guards so local and production builds do not drift silently."
          />
          <div className="divide-y divide-slate-200">
            {environmentRows.map(([label, detail]) => (
              <div key={label} className="flex gap-3 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-950">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="quality" className="grid gap-6 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Quality"
            title="Verification coverage"
            description="The project has checks for route contracts, core services, finance invariants, and frontend build health."
          />
          <div className="divide-y divide-slate-200">
            {qualityRows.map(([label, detail]) => (
              <div key={label} className="flex gap-3 py-3">
                <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-950">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Finance"
            title="Why the ledger matters"
            description="The finance layer keeps operational actions connected to reporting instead of showing disconnected payment forms."
          />
          <div className="grid gap-3">
            {[
              ['Confirmed sale', 'A delivered package can create a sales receivable event and COGS recognition.'],
              ['Customer payment', 'Completed receipts create cash and receivable journal entries.'],
              ['Reports', 'Inventory value, damaged stock, COGS, profit, receivables, and payables are derived from domain records.'],
              ['Transactions', 'Finance event helpers require active Mongo transactions for consistency.'],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  <p className="font-semibold text-slate-950">{label}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  </div>
);

export default DocumentationPage;
