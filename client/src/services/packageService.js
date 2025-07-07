import api from './api';

// Get package(s) by orderId
export const getPackagesByOrderId = async (orderId) => {
  const res = await api.get(`/package/order/${orderId}`);
  return res.data;
};

// Update package status (e.g., for packing)
export const updatePackageStatus = async (packageId, status, notes) => {
  const res = await api.patch(`/package/status/${packageId}`,
    { status, notes }
  );
  return res.data;
};
