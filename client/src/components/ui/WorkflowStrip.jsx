import {
  ArrowRight,
  ClipboardList,
  PackageCheck,
  ReceiptText,
  RotateCcw,
} from 'lucide-react';

const workflowSteps = [
  {
    label: 'Supply',
    detail: 'Supply intake creates batch, inventory, and item records for the assigned warehouse.',
    icon: PackageCheck,
  },
  {
    label: 'Allocate',
    detail: 'Orders reserve in-stock items, synchronize batch availability, and create packages.',
    icon: ClipboardList,
  },
  {
    label: 'Reverse',
    detail: 'Returns move through approval, pickup, warehouse receipt, and item disposition.',
    icon: RotateCcw,
  },
  {
    label: 'Report',
    detail: 'Payments, sales history, and journal events feed finance and inventory reporting.',
    icon: ReceiptText,
  },
];

const WorkflowStrip = ({
  eyebrow = 'Operational workflow',
  title = 'The product is organized around a real warehouse data path.',
  description = 'Stock enters as item-level inventory, orders allocate it, returns reverse the movement, and finance reports on the resulting business events.',
  className = '',
}) => (
  <section className={className}>
    <div className="mb-6 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
    <div className="grid gap-3 lg:grid-cols-4">
      {workflowSteps.map(({ label, detail, icon: Icon }, index) => (
        <div key={label} className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {index < workflowSteps.length - 1 && (
            <ArrowRight className="absolute right-3 top-4 hidden h-4 w-4 text-slate-300 lg:block" />
          )}
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
              <h3 className="text-base font-semibold text-slate-950">{label}</h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
        </div>
      ))}
    </div>
  </section>
);

export default WorkflowStrip;
