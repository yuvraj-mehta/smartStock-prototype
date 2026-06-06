import api from './api';

const PAYMENT_RECEIVED_BASE = '/payment-received';
const FINANCIAL_REPORT_BASE = '/financial-report';

const assertArrayPayload = (data, context) => {
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error(`${context} response did not include an array.`);
};

export const getPaymentsReceived = async () => {
  const res = await api.get(PAYMENT_RECEIVED_BASE);
  return assertArrayPayload(res.data, 'Payment received list');
};

export const createPaymentReceived = async (paymentData) => {
  const res = await api.post(PAYMENT_RECEIVED_BASE, paymentData);
  return res.data;
};

export const updatePaymentReceived = async (paymentId, paymentData) => {
  const res = await api.put(`${PAYMENT_RECEIVED_BASE}/${encodeURIComponent(paymentId)}`, paymentData);
  return res.data;
};

export const deletePaymentReceived = async (paymentId) => {
  const res = await api.delete(`${PAYMENT_RECEIVED_BASE}/${encodeURIComponent(paymentId)}`);
  return res.data;
};

export const getInventoryValueReport = async () => {
  const res = await api.get(`${FINANCIAL_REPORT_BASE}/inventory-value`);
  return assertArrayPayload(res.data, 'Inventory value report');
};

export const getCOGSAndProfitReport = async (params = {}) => {
  const res = await api.get(`${FINANCIAL_REPORT_BASE}/cogs-profit`, { params });
  return res.data || {};
};

export const getOutstandingPayablesReport = async () => {
  const res = await api.get(`${FINANCIAL_REPORT_BASE}/payables`);
  return res.data || {};
};

export const getOutstandingReceivablesReport = async () => {
  const res = await api.get(`${FINANCIAL_REPORT_BASE}/receivables`);
  return res.data || {};
};

export const getDamagedLostValueReport = async () => {
  const res = await api.get(`${FINANCIAL_REPORT_BASE}/damaged-lost-value`);
  return res.data || {};
};

export const getFinancialReports = async (params = {}) => {
  const reportParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => Boolean(value)),
  );

  const [
    inventoryValue,
    cogsProfit,
    payables,
    receivables,
    damagedLostValue,
  ] = await Promise.all([
    getInventoryValueReport(),
    getCOGSAndProfitReport(reportParams),
    getOutstandingPayablesReport(),
    getOutstandingReceivablesReport(),
    getDamagedLostValueReport(),
  ]);

  return {
    inventoryValue,
    cogsProfit,
    payables,
    receivables,
    damagedLostValue,
  };
};
