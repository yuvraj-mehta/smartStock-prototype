import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as returnService from '../../services/returnService';

export const fetchAllReturns = createAsyncThunk(
  'returns/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      return await returnService.getAllReturns(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const initiateReturn = createAsyncThunk(
  'returns/initiate',
  async (data, { rejectWithValue }) => {
    try {
      return await returnService.initiateReturn(data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const scheduleReturnPickup = createAsyncThunk(
  'returns/schedulePickup',
  async ({ returnId, data }, { rejectWithValue }) => {
    try {
      return await returnService.scheduleReturnPickup(returnId, data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const markReturnPickedUp = createAsyncThunk(
  'returns/markPickedUp',
  async ({ returnId, data }, { rejectWithValue }) => {
    try {
      return await returnService.markReturnPickedUp(returnId, data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const processReturn = createAsyncThunk(
  'returns/process',
  async ({ returnId, data }, { rejectWithValue }) => {
    try {
      return await returnService.processReturn(returnId, data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const returnSlice = createSlice({
  name: 'returns',
  initialState: {
    returns: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchAllReturns.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchAllReturns.fulfilled, (state, action) => {
        state.loading = false;
        state.returns = action.payload.returns || [];
      })
      .addCase(fetchAllReturns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch returns';
      })
      .addCase(initiateReturn.pending, state => { state.loading = true; state.error = null; })
      .addCase(initiateReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.returns.unshift(action.payload.return);
      })
      .addCase(initiateReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to initiate return';
      });
  }
});

export default returnSlice.reducer;
