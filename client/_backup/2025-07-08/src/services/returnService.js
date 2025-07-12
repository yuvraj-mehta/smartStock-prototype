// Return service: handles API calls for return management

import api from './api';
const API_BASE = '/return';

// Initiate a return
export const initiateReturn = async (data) => {
  // data: { packageId, returnedItems, returnReason, notes }
  const res = await api.post(`${API_BASE}/initiate`, data);
  return res.data;
};

// Schedule pickup for a return
export const scheduleReturnPickup = async (returnId, data) => {
  // data: { transporterId, notes }
  const res = await api.post(`${API_BASE}/schedule-pickup/${returnId}`, data);
  return res.data;
};

// Mark return as picked up
export const markReturnPickedUp = async (returnId, data) => {
  // data: { notes }
  const res = await api.post(`${API_BASE}/picked-up/${returnId}`, data);
  return res.data;
};

// Process return at warehouse
export const processReturn = async (returnId, data) => {
  // data: { notes }
  const res = await api.post(`${API_BASE}/process/${returnId}`, data);
  return res.data;
};

// Get all returns
export const getAllReturns = async (params = {}) => {
  const res = await api.get(`${API_BASE}/all`, { params });
  return res.data;
};

// Get return by ID
export const getReturnById = async (returnId) => {
  const res = await api.get(`${API_BASE}/${returnId}`);
  return res.data;
};
