import {
  ArrowRight,
  BarChart3,
  Boxes,
  Brain,
  ClipboardList,
  Database,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Server,
  ShieldCheck,
  UserCheck,
  Warehouse,
} from 'lucide-react';
import WorkflowStrip from '../components/ui/WorkflowStrip';

const previewMetrics = [
  { label: 'Stock value', value: 'INR 8.4L', icon: BarChart3 },
  { label: 'Low stock', value: '12', icon: Boxes },
  { label: 'Open orders', value: '31', icon: ClipboardList },
  { label: 'Returns', value: '4', icon: RotateCcw },
];

const previewFlows = [
  ['Package confirmation', 'Staff', 'Ready'],
  ['Return receipt', 'Transport', 'In transit'],
  ['Payment posting', 'Admin', 'Pending'],
];

const entryPathRows = [
  {
    icon: UserCheck,
    title: 'Reviewer entry',
    detail: 'Start at Landing, sign in through /login, then let auth routing open the right workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Role path',
    detail: 'Admin and staff reach operational pages; other signed-in roles fall back to profile in the current client shell.',
  },
  {
    icon: Database,
    title: 'Local demo data',
    detail: 'Use the server seed:dev script or assigned credentials; seeded data creates an admin, warehouse, products, batches, and items.',
  },
];

const capabilityRows = [
  { icon: Warehouse, label: 'Warehouse scope', detail: 'Internal users work inside assigned warehouse boundaries.' },
  { icon: PackageCheck, label: 'Item lifecycle', detail: 'Product, batch, item, package, order, and return state stay linked.' },
  { icon: ReceiptText, label: 'Financial reporting', detail: 'Operational actions connect to payment and ledger-backed reporting.' },
  { icon: Brain, label: 'Inventory intelligence', detail: 'AI surfaces demand, reorder, and alert guidance for staff review.' },
];

const systemLayers = [
  {
    icon: Boxes,
    title: 'React client',
    detail: 'Landing, login, home, and protected workflow pages use Redux auth state and React Router gates.',
  },
  {
    icon: Server,
    title: 'Express API',
    detail: 'Versioned /api/v1 routes separate auth, users, inventory, orders, packages, returns, transport, finance, and AI.',
  },
  {
    icon: Database,
    title: 'MongoDB domain data',
    detail: 'Mongoose models keep users, warehouses, products, batches, item status, packages, returns, payments, and journal events linked.',
  },
  {
    icon: LockKeyhole,
    title: 'Quality and guards',
    detail: 'JWT auth, role checks, warehouse scope, readiness endpoints, API contracts, and smoke builds protect the demo path.',
  },
];

const systemMapRows = [
  ['Auth entry', 'Landing -> /login -> POST /api/v1/auth/login', 'JWT session, role, assigned warehouse'],
  ['Inventory source', 'Inventory page -> /api/v1/inventory', 'Item.status is live stock; Inventory is a synchronized aggregate'],
  ['Fulfillment', 'Orders -> packages -> transport', 'In-stock items move to allocated, packaged, dispatched, delivered'],
  ['Reverse logistics', 'Returns -> pickup -> warehouse processing', 'Returned items become restocked or damaged through disposition'],
  ['Finance view', 'Payments, invoices, sales history, financial reports', 'Operational events become ledger and reporting signals'],
];

const techRows = [
  ['Frontend', 'React, Redux Toolkit, React Router, Tailwind CSS, Vite'],
  ['Backend', 'Node.js, Express, MongoDB/Mongoose, JWT auth'],
  ['Operations', 'Inventory, orders, returns, transport, finance events'],
  ['Quality', 'Jest, Supertest, API contracts, production build guard'],
];

const LandingPage = () => (
  <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#home" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">SmartStock</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Warehouse operations</p>
          </div>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          <a href="#workflow" className="hover:text-slate-950">Workflow</a>
          <a href="#demo-path" className="hover:text-slate-950">Demo path</a>
          <a href="#capabilities" className="hover:text-slate-950">Capabilities</a>
          <a href="#architecture" className="hover:text-slate-950">Architecture</a>
          <a href="#techstack" className="hover:text-slate-950">Stack</a>
          <a href="/documentation" className="hover:text-slate-950">Documentation</a>
        </nav>
        <a
          href="/login"
          className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </header>

    <main>
      <section id="home" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(460px,1fr)] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              SmartStock is a full-stack control plane for warehouse inventory operations.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              The project demonstrates role-scoped inventory management, order fulfillment, reverse logistics, payment recording, and ledger-backed reporting in one portfolio-ready SaaS prototype.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#workflow"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Review workflow
              </a>
              <a
                href="/documentation"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Read documentation
              </a>
            </div>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary demo route</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  Landing {'->'} Login {'->'} Operations workspace
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Admin and staff accounts enter the working product surface instead of a marketing shell.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data provenance</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">Preview here, live data after sign-in</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  The public card uses labeled demo values; authenticated pages read protected API data.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <div className="rounded-md border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Warehouse dashboard preview</p>
                  <p className="text-xs text-slate-500">Static sample values for reviewer orientation</p>
                </div>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                  Demo metrics
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
                {previewMetrics.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <Icon className="h-4 w-4 text-slate-500" />
                    <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Preview value</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 p-4">
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Flow</th>
                        <th className="px-3 py-2 font-semibold">Owner</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {previewFlows.map(([flow, owner, status]) => (
                        <tr key={flow}>
                          <td className="px-3 py-3 font-medium text-slate-800">{flow}</td>
                          <td className="px-3 py-3 text-slate-500">{owner}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              {status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Live metrics are available inside the authenticated dashboard and inventory pages after API-backed data loads.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <WorkflowStrip
            title="The workflow is shown as the same data path a warehouse reviewer will test."
            description="SmartStock is organized around item-level stock movement: supply creates sellable items, orders allocate them, returns decide disposition, and finance reports on the business events."
          />
        </div>
      </section>

      <section id="demo-path" className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role and demo entry path</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">How a portfolio reviewer should enter the product</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The public page is only an orientation layer. The real review path is the authenticated workspace, where routes are gated by role and backed by the Express API.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {entryPathRows.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Icon className="h-5 w-5 text-slate-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Built like an operations product</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The UI avoids a marketing-only shell and exposes the project's real backend boundaries: users, warehouses, inventory, order lifecycle, reverse logistics, and finance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {capabilityRows.map(({ icon: Icon, label, detail }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Icon className="h-5 w-5 text-slate-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-950">{label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System map</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">What the reviewer is actually looking at</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The portfolio story is strongest when the UI makes the client, API, domain data, and validation boundaries visible instead of hiding them behind broad feature cards.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            {systemLayers.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <Icon className="h-5 w-5 text-slate-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Reviewer question</th>
                  <th className="px-4 py-3 text-left font-semibold">Route or boundary</th>
                  <th className="px-4 py-3 text-left font-semibold">Source of truth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {systemMapRows.map(([question, boundary, truth]) => (
                  <tr key={question}>
                    <td className="px-4 py-4 font-semibold text-slate-800">{question}</td>
                    <td className="px-4 py-4 text-slate-600">{boundary}</td>
                    <td className="px-4 py-4 text-slate-500">{truth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="techstack" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Implementation stack</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A practical full-stack JavaScript application with production build checks and backend test coverage.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <tbody className="divide-y divide-slate-100 bg-white">
                {techRows.map(([label, detail]) => (
                  <tr key={label}>
                    <td className="w-44 bg-slate-50 px-4 py-4 font-semibold text-slate-700">{label}</td>
                    <td className="px-4 py-4 text-slate-600">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>SmartStock portfolio project</span>
        <span>Inventory, fulfillment, returns, transport, and finance</span>
      </div>
    </footer>
  </div>
);

export default LandingPage;
