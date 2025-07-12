
import api from './api';
const API_BASE = '/transport';


export const getAllTransports = async (params = {}) => {
  const { status, transportType, page = 1, limit = 10 } = params;
  const response = await api.get(`${API_BASE}/all`, {
    params: { status, transportType, page, limit }
  });
  return response.data;
};


export const getTransportById = async (id) => {
  const response = await api.get(`${API_BASE}/${id}`);
  return response.data;
};


export const getTransportsByPackageId = async (packageId) => {
  const response = await api.get(`${API_BASE}/package/${packageId}`);
  return response.data;
};


export const updateTransportStatus = async (id, { status, notes }) => {
  const response = await api.patch(`${API_BASE}/status/${id}`, { status, notes });
  return response.data;
};

// Assign a transporter to a package for delivery
export const assignTransport = async (packageId, transporterId, notes = '') => {
  const res = await api.post(`/order/assign-transport/${packageId}`, { transporterId, notes });
  return res.data;
};


