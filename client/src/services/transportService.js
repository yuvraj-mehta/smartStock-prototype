import api from './api';

const API_BASE = '/api/transport';

export const getAllTransports = async (params = {}) => {
  const { status, transportType, page = 1, limit = 10 } = params;
  const res = await axios.get(`${API_BASE}/all`, {
    params: { status, transportType, page, limit }
  });
  return res.data;
};

export const getTransportById = async (id) => {
  const res = await axios.get(`${API_BASE}/${id}`);
  return res.data;
};

export const getTransportsByPackageId = async (packageId) => {
  const res = await axios.get(`${API_BASE}/package/${packageId}`);
  return res.data;
};

export const updateTransportStatus = async (id, { status, notes }) => {
  const res = await axios.patch(`${API_BASE}/status/${id}`, { status, notes });
  return res.data;
};

// Assign a transporter to a package for delivery
export const assignTransport = async (packageId, transporterId, notes = '') => {
  const res = await api.post(`/order/assign-transport/${packageId}`, { transporterId, notes });
  return res.data;
};


