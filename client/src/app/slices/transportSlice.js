import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import * as transportService from '../../services/transportService';

const getErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.message || fallback
);

// Thunks
export const fetchAllTransports = createAsyncThunk(
  'transport/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const data = await transportService.getAllTransports(params);
      return data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch transports'));
    }
  },
);

export const fetchTransportById = createAsyncThunk(
  'transport/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await transportService.getTransportById(id);
      return data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch transport details'));
    }
  },
);

export const fetchTransportsByPackageId = createAsyncThunk(
  'transport/fetchByPackageId',
  async (packageId, { rejectWithValue }) => {
    try {
      const data = await transportService.getTransportsByPackageId(packageId);
      return data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch package transports'));
    }
  },
);

export const updateTransportStatus = createAsyncThunk(
  'transport/updateStatus',
  async ({ id, status, notes }, { rejectWithValue }) => {
    try {
      const data = await transportService.updateTransportStatus(id, { status, notes });
      return data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to update transport status'));
    }
  },
);

const transportSlice = createSlice({
  name: 'transport',
  initialState: {
    transports: [],
    transportDetails: null,
    loading: false,
    error: null,
    totalPages: 1,
    currentPage: 1,
    total: 0,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchAllTransports
      .addCase(fetchAllTransports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllTransports.fulfilled, (state, action) => {
        state.loading = false;
        state.transports = action.payload?.transports || [];
        state.totalPages = action.payload?.totalPages ?? 1;
        state.currentPage = Number(action.payload?.currentPage) || 1;
        state.total = action.payload?.total ?? state.transports.length;
      })
      .addCase(fetchAllTransports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchTransportById
      .addCase(fetchTransportById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransportById.fulfilled, (state, action) => {
        state.loading = false;
        state.transportDetails = action.payload?.transport || null;
      })
      .addCase(fetchTransportById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchTransportsByPackageId
      .addCase(fetchTransportsByPackageId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransportsByPackageId.fulfilled, (state, action) => {
        state.loading = false;
        state.transports = action.payload?.transports || [];
      })
      .addCase(fetchTransportsByPackageId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateTransportStatus
      .addCase(updateTransportStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTransportStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.transportDetails = action.payload?.transport || null;
      })
      .addCase(updateTransportStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default transportSlice.reducer;
