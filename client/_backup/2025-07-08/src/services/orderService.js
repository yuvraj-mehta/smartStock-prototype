// Order service: handles API calls for order management

import api from './api';
const API_BASE = '/order';


export const createOrder = async (orderData) => {
  // orderData: { platformOrderId, items: [{productId, quantity}], notes }
  const res = await api.post(`${API_BASE}/create`, orderData);
  return res.data;
};


export const processOrder = async (orderId, notes = '') => {
  const res = await api.post(`${API_BASE}/process/${orderId}`, { notes });
  return res.data;
};


export const getAllOrders = async () => {
  const res = await api.get(`${API_BASE}/all`);
  return res.data;
};


export const getOrderById = async (orderId) => {
  const res = await api.get(`${API_BASE}/${orderId}`);
  return res.data;
};
