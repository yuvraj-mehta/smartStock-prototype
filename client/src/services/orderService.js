// Order service: handles API calls for order management

import api from './api';
const API_BASE = '/order';
const ORDER_FETCH_LIMIT = 100;

const getOrdersFromResponse = (data) => (
  Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : null)
);

const getTotalPagesFromResponse = (data) => {
  const totalPages = Number(data?.totalPages);
  return Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
};

const assertOrdersPayload = (data) => {
  const orders = getOrdersFromResponse(data);

  if (!orders) {
    throw new Error('Order list response did not include an orders array.');
  }

  return orders;
};

export const createOrder = async (orderData) => {
  // orderData: { platformOrderId, items: [{productId, quantity}], notes }
  const res = await api.post(`${API_BASE}/create`, orderData);
  return res.data;
};


export const processOrder = async (orderId, notes = '') => {
  const res = await api.post(`${API_BASE}/process/${orderId}`, { notes });
  return res.data;
};


export const getAllOrders = async (params = {}) => {
  const { fetchAll = false, ...queryParams } = params;

  if (!fetchAll) {
    const res = await api.get(`${API_BASE}/all`, { params: queryParams });
    return res.data;
  }

  const limit = Number(queryParams.limit) || ORDER_FETCH_LIMIT;
  let page = Number(queryParams.page) || 1;
  let totalPages = 1;
  let lastResponse = null;
  const orders = [];

  do {
    const res = await api.get(`${API_BASE}/all`, {
      params: { ...queryParams, page, limit },
    });
    lastResponse = res.data;

    orders.push(...assertOrdersPayload(lastResponse));
    totalPages = getTotalPagesFromResponse(lastResponse);
    page += 1;
  } while (page <= totalPages);

  if (Array.isArray(lastResponse)) {
    return orders;
  }

  return {
    ...lastResponse,
    orders,
    total: Number(lastResponse?.total) || orders.length,
  };
};


export const getOrderById = async (orderId) => {
  const res = await api.get(`${API_BASE}/${orderId}`);
  return res.data;
};
