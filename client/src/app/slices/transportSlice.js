import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// No default export from transportService.js, use named imports directly

// Thunks
export const fetchAllTransports = createAsyncThunk(
  'transport/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const data = await transportService.getAllTransports(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchTransportById = createAsyncThunk(
  'transport/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await transportService.getTransportById(id);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchTransportsByPackageId = createAsyncThunk(
  'transport/fetchByPackageId',
  async (packageId, { rejectWithValue }) => {
    try {
      const data = await transportService.getTransportsByPackageId(packageId);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateTransportStatus = createAsyncThunk(
  'transport/updateStatus',
  async ({ id, status, notes }, { rejectWithValue }) => {
    try {
      const data = await transportService.updateTransportStatus(id, { status, notes });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
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
    total: 0
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
        state.transports = action.payload.transports;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.total = action.payload.total;
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
        state.transportDetails = action.payload.transport;
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
        state.transports = action.payload.transports;
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
        state.transportDetails = action.payload.transport;
      })
      .addCase(updateTransportStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default transportSlice.reducer;
