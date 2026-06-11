import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeDollarSign,
  CheckCircle,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';

import { PAYMENT_METHODS, PAYMENT_STATUS, ROUTES, USER_ROLES } from '../constants';
import { getAllOrders } from '../services/orderService';
import {
  createPaymentReceived,
  deletePaymentReceived,
  getFinancialReports,
  getPaymentsReceived,
  updatePaymentReceived,
} from '../services/financeService';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

const paymentMethodOptions = Object.values(PAYMENT_METHODS);
const paymentStatusOptions = Object.values(PAYMENT_STATUS);

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const createInitialPaymentForm = () => ({
  targetType: 'order',
  targetId: '',
  amount: '',
  date: getTodayInputValue(),
  method: PAYMENT_METHODS.BANK,
  status: PAYMENT_STATUS.COMPLETED,
});

const initialReports = {
  inventoryValue: [],
  cogsProfit: {},
  payables: {},
  receivables: {},
  damagedLostValue: {},
};

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-IN', { dateStyle: 'medium' });
};

const formatLabel = (value) => (
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : '-'
);

const getApiErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
);

const getDocumentId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
};

const getCompactId = (value) => {
  const id = getDocumentId(value);
  if (!id) {
    return '-';
  }

  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(0, 8)}...${id.slice(-4)}`;
};

const getPaymentTarget = (payment) => {
  if (payment?.salesInvoiceId) {
    return {
      type: 'Sales invoice',
      id: getDocumentId(payment.salesInvoiceId),
      label: getCompactId(payment.salesInvoiceId),
    };
  }

  if (payment?.orderId) {
    const order = payment.orderId;
    const label = typeof order === 'object' && (order.orderNumber || order.platformOrderId)
      ? order.orderNumber || order.platformOrderId
      : getCompactId(order);

    return {
      type: 'Order',
      id: getDocumentId(order),
      label,
    };
  }

  return {
    type: 'Unknown',
    id: '',
    label: '-',
  };
};

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const sumInventoryValue = (inventoryValue) => (
  Array.isArray(inventoryValue)
    ? inventoryValue.reduce((sum, row) => sum + (Number(row?.totalInventoryValue) || 0), 0)
    : 0
);

const panelClass = 'rounded-lg border border-slate-200 bg-white p-5 shadow-sm';
const metricCardClass = 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';
const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

const statusToneClass = {
  [PAYMENT_STATUS.COMPLETED]: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  [PAYMENT_STATUS.PENDING]: 'border-amber-200 bg-amber-50 text-amber-700',
  [PAYMENT_STATUS.FAILED]: 'border-rose-200 bg-rose-50 text-rose-700',
};

const getStatusToneClass = (status) => (
  statusToneClass[status] || 'border-slate-200 bg-slate-50 text-slate-700'
);

const buildPaymentSummary = (paymentRows) => paymentRows.reduce((summary, payment) => {
  const status = payment.status || PAYMENT_STATUS.PENDING;
  const amount = Number(payment.amount) || 0;

  return {
    total: summary.total + 1,
    completed: summary.completed + (status === PAYMENT_STATUS.COMPLETED ? 1 : 0),
    pending: summary.pending + (status === PAYMENT_STATUS.PENDING ? 1 : 0),
    failed: summary.failed + (status === PAYMENT_STATUS.FAILED ? 1 : 0),
    completedValue: summary.completedValue + (status === PAYMENT_STATUS.COMPLETED ? amount : 0),
  };
}, {
  total: 0,
  completed: 0,
  pending: 0,
  failed: 0,
  completedValue: 0,
});

const getOrdersFromResponse = (data) => (
  Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : [])
);

const getOrderDisplayLabel = (order) => {
  const primary = order?.orderNumber || order?.platformOrderId || getCompactId(order?._id);
  const secondary = [
    order?.orderNumber && order?.platformOrderId ? order.platformOrderId : '',
    order?.orderStatus ? formatLabel(order.orderStatus) : '',
  ].filter(Boolean).join(' - ');

  return secondary ? `${primary} (${secondary})` : primary;
};

const getRouteWithQuery = (route, params) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

  return query.toString() ? `${route}?${query.toString()}` : route;
};

const SummaryMetric = ({ icon: Icon, label, value, helper, tone = 'text-blue-600' }) => (
  <div className={metricCardClass}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      </div>
      <span className={`rounded-md bg-slate-50 p-2 ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
    {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
  </div>
);

const FinancePage = () => {
  const { user } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = normalizeRole(user?.role) === USER_ROLES.ADMIN;

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [paymentForm, setPaymentForm] = useState(createInitialPaymentForm);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionId, setActionId] = useState('');
  const [actionError, setActionError] = useState('');
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [paymentOrdersLoading, setPaymentOrdersLoading] = useState(false);
  const [paymentOrdersError, setPaymentOrdersError] = useState('');
  const [useManualTargetId, setUseManualTargetId] = useState(false);

  const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '' });
  const [reports, setReports] = useState(initialReports);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');

  const inventoryTotal = useMemo(
    () => sumInventoryValue(reports.inventoryValue),
    [reports.inventoryValue],
  );

  const paymentsSummary = useMemo(
    () => buildPaymentSummary(payments),
    [payments],
  );

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError('');

    try {
      const paymentRows = await getPaymentsReceived();
      setPayments(paymentRows);
    } catch (error) {
      setPayments([]);
      setPaymentsError(getApiErrorMessage(error, 'Failed to load received payments.'));
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadPaymentOrders = useCallback(async () => {
    setPaymentOrdersLoading(true);
    setPaymentOrdersError('');

    try {
      const data = await getAllOrders({ fetchAll: true, limit: 100 });
      setPaymentOrders(getOrdersFromResponse(data));
    } catch (error) {
      setPaymentOrders([]);
      setPaymentOrdersError(getApiErrorMessage(error, 'Order lookup failed. You can enter an order reference manually.'));
    } finally {
      setPaymentOrdersLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setReportsLoading(true);
    setReportsError('');

    try {
      const reportData = await getFinancialReports(reportFilters);
      setReports({ ...initialReports, ...reportData });
    } catch (error) {
      setReports(initialReports);
      setReportsError(getApiErrorMessage(error, 'Failed to load financial reports.'));
    } finally {
      setReportsLoading(false);
    }
  }, [isAdmin, reportFilters]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    loadPaymentOrders();
  }, [loadPaymentOrders]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const targetId = searchParams.get('targetId') || searchParams.get('orderId');
    if (!targetId) {
      return;
    }

    const targetType = searchParams.get('targetType') === 'salesInvoice' ? 'salesInvoice' : 'order';
    const targetIsInOrderLookup = paymentOrders.some(order => getDocumentId(order) === targetId);

    setPaymentForm(current => {
      if (current.targetType === targetType && current.targetId === targetId) {
        return current;
      }

      return {
        ...current,
        targetType,
        targetId,
      };
    });
    setUseManualTargetId(targetType !== 'order' || !targetIsInOrderLookup);
    setFormError('');
    setNotice(targetType === 'order'
      ? 'Payment form prefilled for the selected order.'
      : 'Payment form prefilled for the selected sales invoice.');
  }, [paymentOrders, searchParams]);

  const updatePaymentForm = (field, value) => {
    setPaymentForm((current) => ({ ...current, [field]: value }));
    setFormError('');
    setNotice('');
  };

  const handlePaymentTargetTypeChange = (targetType) => {
    setPaymentForm((current) => ({ ...current, targetType, targetId: '' }));
    setUseManualTargetId(targetType !== 'order');
    setFormError('');
    setNotice('');
  };

  const toggleManualTargetId = () => {
    setPaymentForm((current) => ({ ...current, targetId: '' }));
    setUseManualTargetId((current) => !current);
    setFormError('');
    setNotice('');
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setNotice('');

    const targetId = paymentForm.targetId.trim();
    const amount = Number(paymentForm.amount);

    if (!targetId) {
      setFormError(paymentForm.targetType === 'salesInvoice'
        ? 'Enter a sales invoice reference.'
        : 'Select an order or enter an order reference.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a positive payment amount.');
      return;
    }

    const targetField = paymentForm.targetType === 'salesInvoice' ? 'salesInvoiceId' : 'orderId';
    const payload = {
      [targetField]: targetId,
      amount,
      date: paymentForm.date,
      method: paymentForm.method,
      status: paymentForm.status,
    };

    setFormSaving(true);

    try {
      await createPaymentReceived(payload);
      setPaymentForm(createInitialPaymentForm());
      setUseManualTargetId(false);
      setNotice('Payment receipt saved.');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('targetType');
      nextParams.delete('targetId');
      nextParams.delete('orderId');
      setSearchParams(nextParams, { replace: true });
      await loadPayments();
      if (isAdmin) {
        await loadReports();
      }
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to save payment receipt.'));
    } finally {
      setFormSaving(false);
    }
  };

  const handlePaymentStatusChange = async (payment, status) => {
    if (!payment?._id || status === payment.status) {
      return;
    }

    setActionId(payment._id);
    setActionError('');
    setNotice('');

    try {
      await updatePaymentReceived(payment._id, { status });
      setNotice('Payment status updated.');
      await loadPayments();
      if (isAdmin) {
        await loadReports();
      }
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Failed to update payment status.'));
    } finally {
      setActionId('');
    }
  };

  const handleDeletePayment = async (payment) => {
    if (!payment?._id) {
      return;
    }

    setActionId(payment._id);
    setActionError('');
    setNotice('');

    try {
      await deletePaymentReceived(payment._id);
      setNotice('Payment receipt deleted.');
      await loadPayments();
      if (isAdmin) {
        await loadReports();
      }
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Failed to delete payment receipt.'));
    } finally {
      setActionId('');
    }
  };

  const handleRefreshReports = () => {
    loadReports();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Finance operations
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isAdmin ? 'Admin reporting enabled' : 'Staff receipt mode'}
              </span>
            </div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-950">
              <span className="rounded-lg bg-blue-600 p-2 text-white">
                <BadgeDollarSign className="h-6 w-6" />
              </span>
              Finance
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Receipts, settlement status, and ledger-backed financial exposure in one workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadPayments();
              loadPaymentOrders();
              if (isAdmin) {
                loadReports();
              }
            }}
            className={`${buttonClass} w-fit border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100`}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>

        {notice && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}
        {actionError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Finance summary">
          <SummaryMetric
            icon={Receipt}
            label="Receipts"
            value={paymentsSummary.total}
            helper={`${paymentsSummary.completed} completed, ${paymentsSummary.pending} pending`}
            tone="text-blue-600"
          />
          <SummaryMetric
            icon={Wallet}
            label="Completed Value"
            value={formatCurrency(paymentsSummary.completedValue)}
            helper={paymentsSummary.failed ? `${paymentsSummary.failed} failed receipt records` : 'Cleared customer receipts'}
            tone="text-emerald-600"
          />
          <SummaryMetric
            icon={Landmark}
            label="Inventory Value"
            value={formatCurrency(inventoryTotal)}
            helper={isAdmin ? 'Current report snapshot' : 'Visible to admins'}
            tone="text-slate-700"
          />
          <SummaryMetric
            icon={FileText}
            label="Profit / Loss"
            value={isAdmin ? formatCurrency(reports.cogsProfit?.profit) : 'Admin only'}
            helper={isAdmin ? 'Ledger-backed P&L' : 'Reports restricted'}
            tone={(Number(reports.cogsProfit?.profit) || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}
          />
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div id="record-payment" className={panelClass}>
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-blue-50 p-2 text-blue-600">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Record Payment Received</h2>
                <p className="mt-1 text-sm text-slate-500">Create a receipt against a canonical order or invoice.</p>
              </div>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handlePaymentSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="payment-target-type">Target</label>
                  <select
                    id="payment-target-type"
                    className={inputClass}
                    value={paymentForm.targetType}
                    onChange={(event) => handlePaymentTargetTypeChange(event.target.value)}
                  >
                    <option value="order">Canonical order</option>
                    <option value="salesInvoice">Sales invoice</option>
                  </select>
                </div>
                <div>
                  {paymentForm.targetType === 'order' && !useManualTargetId ? (
                    <>
                      <label className={labelClass} htmlFor="payment-target-id">Order</label>
                      <select
                        id="payment-target-id"
                        className={inputClass}
                        value={paymentForm.targetId}
                        onChange={(event) => updatePaymentForm('targetId', event.target.value)}
                        disabled={paymentOrdersLoading}
                        required
                      >
                        <option value="">{paymentOrdersLoading ? 'Loading orders...' : 'Select an order'}</option>
                        {paymentOrders.map((order, index) => {
                          const orderId = getDocumentId(order);
                          if (!orderId) {
                            return null;
                          }

                          return (
                            <option key={orderId || index} value={orderId}>
                              {getOrderDisplayLabel(order)}
                            </option>
                          );
                        })}
                      </select>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Select by order number; SmartStock stores the technical reference automatically.</span>
                        <button
                          type="button"
                          className="font-semibold text-blue-700 hover:text-blue-900"
                          onClick={toggleManualTargetId}
                        >
                          Use manual order reference
                        </button>
                      </div>
                      {paymentOrdersError && (
                        <div className="mt-1 text-xs font-medium text-rose-600">{paymentOrdersError}</div>
                      )}
                    </>
                  ) : (
                    <>
                      <label className={labelClass} htmlFor="payment-target-id">
                        {paymentForm.targetType === 'salesInvoice' ? 'Sales invoice reference' : 'Order reference'}
                      </label>
                      <input
                        id="payment-target-id"
                        className={inputClass}
                        value={paymentForm.targetId}
                        onChange={(event) => updatePaymentForm('targetId', event.target.value)}
                        placeholder={paymentForm.targetType === 'salesInvoice' ? 'Paste invoice record reference' : 'Paste order record reference'}
                        required
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {paymentForm.targetType === 'salesInvoice'
                            ? 'Sales invoice lookup is not exposed in this UI yet; use the reference from invoice records.'
                            : 'Manual entry is available for orders not returned by the lookup.'}
                        </span>
                        {paymentForm.targetType === 'order' && paymentOrders.length > 0 && (
                          <button
                            type="button"
                            className="font-semibold text-blue-700 hover:text-blue-900"
                            onClick={toggleManualTargetId}
                          >
                            Select from order list
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="payment-amount">Amount</label>
                  <input
                    id="payment-amount"
                    className={inputClass}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) => updatePaymentForm('amount', event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="payment-date">Date</label>
                  <input
                    id="payment-date"
                    className={inputClass}
                    type="date"
                    value={paymentForm.date}
                    onChange={(event) => updatePaymentForm('date', event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="payment-method">Method</label>
                  <select
                    id="payment-method"
                    className={inputClass}
                    value={paymentForm.method}
                    onChange={(event) => updatePaymentForm('method', event.target.value)}
                  >
                    {paymentMethodOptions.map((method) => (
                      <option key={method} value={method}>{formatLabel(method)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="payment-status">Status</label>
                  <select
                    id="payment-status"
                    className={inputClass}
                    value={paymentForm.status}
                    onChange={(event) => updatePaymentForm('status', event.target.value)}
                  >
                    {paymentStatusOptions.map((status) => (
                      <option key={status} value={status}>{formatLabel(status)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <button
                type="submit"
                className={`${buttonClass} bg-blue-600 text-white shadow-sm hover:bg-blue-700`}
                disabled={formSaving}
              >
                {formSaving ? 'Saving...' : 'Save Payment'}
              </button>
            </form>
          </div>

          <div className={panelClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-slate-100 p-2 text-slate-700">
                  <Landmark className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Financial Reports</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Reports require admin access; receipt operations are available to staff.
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleRefreshReports}
                  className={`${buttonClass} border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100`}
                  disabled={reportsLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {reportsLoading ? 'Loading...' : 'Reload'}
                </button>
              )}
            </div>

            {isAdmin ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="report-start-date">Start date</label>
                    <input
                      id="report-start-date"
                      className={inputClass}
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(event) => setReportFilters((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="report-end-date">End date</label>
                    <input
                      id="report-end-date"
                      className={inputClass}
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(event) => setReportFilters((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))}
                    />
                  </div>
                </div>

                {reportsError && (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {reportsError}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Inventory Value</div>
                    <div className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(inventoryTotal)}</div>
                  </div>
                  <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Outstanding Receivables</div>
                    <div className="mt-1 text-xl font-bold text-slate-950">
                      {formatCurrency(reports.receivables?.totalReceivables)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Outstanding Payables</div>
                    <div className="mt-1 text-xl font-bold text-slate-950">
                      {formatCurrency(reports.payables?.totalPayables)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Damaged / Lost Value</div>
                    <div className="mt-1 text-xl font-bold text-slate-950">
                      {formatCurrency(reports.damagedLostValue?.totalDamagedValue)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</div>
                      <div className="mt-1 font-bold text-slate-950">
                        {formatCurrency(reports.cogsProfit?.totalRevenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">COGS</div>
                      <div className="mt-1 font-bold text-slate-950">
                        {formatCurrency(reports.cogsProfit?.totalCOGS)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profit / Loss</div>
                      <div className={`mt-1 font-bold ${(Number(reports.cogsProfit?.profit) || 0) < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {formatCurrency(reports.cogsProfit?.profit)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                Admin access is required for financial report totals.
              </div>
            )}
          </div>
        </section>

        <section className={panelClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Received Payments</h2>
              <p className="mt-1 text-sm text-slate-500">Settlement records sorted by the finance API.</p>
            </div>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-600">
              {payments.length} records
            </span>
          </div>

          {paymentsError && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {paymentsError}
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Receipt</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Target</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Method</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paymentsLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan="7">Loading payments...</td>
                    </tr>
                  ) : payments.length > 0 ? (
                    payments.map((payment) => {
                      const target = getPaymentTarget(payment);
                      const rowActionLoading = actionId === payment._id;
                      const status = payment.status || PAYMENT_STATUS.PENDING;

                      return (
                        <tr key={payment._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-xs font-semibold text-blue-900" title={`Payment record ${payment._id}`}>
                            Receipt {getCompactId(payment._id)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-950">{target.type}</div>
                            <div className="font-mono text-xs text-slate-500" title={target.id}>{target.label}</div>
                            {target.type === 'Order' && target.id && (
                              <Link
                                to={getRouteWithQuery(ROUTES.ORDERS, { orderId: target.id })}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                View order
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{formatLabel(payment.method)}</td>
                          <td className="px-4 py-3">
                            <select
                              aria-label={`Payment status for ${getCompactId(payment._id)}`}
                              className={`rounded-md border px-2 py-1 text-sm font-semibold shadow-sm ${getStatusToneClass(status)}`}
                              value={status}
                              disabled={rowActionLoading}
                              onChange={(event) => handlePaymentStatusChange(payment, event.target.value)}
                            >
                              {paymentStatusOptions.map((status) => (
                                <option key={status} value={status}>{formatLabel(status)}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(payment.date)}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className={`${buttonClass} border border-rose-200 bg-white text-rose-700 shadow-sm hover:bg-rose-50`}
                              disabled={rowActionLoading}
                              onClick={() => handleDeletePayment(payment)}
                              title="Delete payment receipt"
                              aria-label={`Delete payment receipt ${getCompactId(payment._id)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan="7">
                        <div className="flex flex-col items-center gap-3">
                          <span>No received payments found.</span>
                          <a
                            href="#record-payment"
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                          >
                            <CreditCard className="h-4 w-4" />
                            Record payment
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FinancePage;
