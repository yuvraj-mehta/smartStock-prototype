import {
  ArrowRight,
  BarChart3,
  Boxes,
  Brain,
  ClipboardList,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  Truck,
  UserCircle,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import WorkflowStrip from '../components/ui/WorkflowStrip';
import { ROUTES, USER_ROLES } from '../constants';

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const operationsTiles = [
  {
    to: ROUTES.DASHBOARD,
    icon: BarChart3,
    label: 'Dashboard',
    caption: 'Inventory value, stock health, and alert pressure',
  },
  {
    to: ROUTES.INVENTORY,
    icon: Boxes,
    label: 'Inventory',
    caption: 'Receive supplies, track batches, and check availability',
  },
  {
    to: ROUTES.ORDERS,
    icon: ClipboardList,
    label: 'Orders',
    caption: 'Review sales orders, packages, and fulfillment state',
  },
  {
    to: ROUTES.FINANCE,
    icon: ReceiptText,
    label: 'Finance',
    caption: 'Record payments and review ledger-backed reports',
  },
  {
    to: ROUTES.RETURNS,
    icon: RotateCcw,
    label: 'Returns',
    caption: 'Approve, dispatch, receive, and disposition returns',
  },
  {
    to: ROUTES.TRANSPORT,
    icon: Truck,
    label: 'Transport',
    caption: 'Track delivery legs and reverse logistics assignments',
  },
  {
    to: ROUTES.PRODUCTS,
    icon: Settings,
    label: 'Products',
    caption: 'Maintain catalog, SKU details, and product controls',
  },
  {
    to: ROUTES.AI_ASSISTANT,
    icon: Brain,
    label: 'AI Assistant',
    caption: 'Demand forecasts, reorder guidance, and insight queries',
  },
];

const rolePathRows = [
  {
    role: 'Admin',
    path: '/login -> /dashboard -> /admin',
    detail: 'Reviews the full operations workspace, user administration, product controls, and finance/reporting surfaces.',
  },
  {
    role: 'Staff',
    path: '/login -> /dashboard',
    detail: 'Runs stock intake, order processing, package handoff, transport tracking, returns, and AI-supported planning.',
  },
  {
    role: 'Viewer / other',
    path: '/login -> /profile',
    detail: 'The backend supports read-only viewer APIs; the current client shell keeps non-ops roles on the profile route.',
  },
];

const HomePage = () => {
  const { user } = useSelector((state) => state.auth);
  const role = normalizeRole(user?.role);
  const canUseOperations = [USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(role);
  const visibleTiles = canUseOperations
    ? operationsTiles
    : [
      {
        to: ROUTES.PROFILE,
        icon: UserCircle,
        label: 'Profile',
        caption: 'Review your account details and access permissions',
      },
    ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                SmartStock workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Welcome{user?.fullName ? `, ${user.fullName}` : ''}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {canUseOperations
                  ? 'Start from the operational area you need: stock, orders, finance, transport, returns, or AI-supported inventory planning.'
                  : 'Your account is active. Available workspace areas depend on your assigned role and permissions.'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signed in as</p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{role || 'User'}</p>
                {user?.email && <p className="text-xs text-slate-500">{user.email}</p>}
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Workspace data</p>
                <p className="mt-1 text-sm font-semibold text-emerald-950">
                  {canUseOperations ? 'Live API routes' : 'Profile route'}
                </p>
                <p className="text-xs leading-5 text-emerald-700">
                  {canUseOperations
                    ? 'Tiles open protected pages backed by server data.'
                    : 'Operational demo pages require admin or staff access.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewer route map</p>
              <h2 className="text-base font-semibold text-slate-950">Role-based entry from login to workspace</h2>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {rolePathRows.map(({ role: rowRole, path, detail }) => (
              <div key={rowRole} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{rowRole}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{path}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleTiles.map(({ to, icon: Icon, label, caption }) => (
            <Link
              key={to}
              to={to}
              className="group flex min-h-[132px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-600 transition group-hover:border-slate-300 group-hover:text-slate-900">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">{label}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">{caption}</p>
              </div>
            </Link>
          ))}
        </section>

        {canUseOperations && (
          <WorkflowStrip
            className="mt-6"
            eyebrow="Reviewer walkthrough"
            title="Use the protected tiles in this lifecycle order."
            description="For a compact demo, open inventory first, process an order into package and transport state, handle a return, then review finance and AI signals."
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
