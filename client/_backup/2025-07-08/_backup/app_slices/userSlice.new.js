import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: false,
  error: null,
  message: null,
  users: [],
  selectedUser: null,
  totalUsers: 0,
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // Get all users
    getUsersRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getUsersSuccess(state, action) {
      state.loading = false;
      state.users = action.payload.users || [];
      state.totalUsers = action.payload.totalUsers || action.payload.users?.length || 0;
      state.message = action.payload.message;
    },
    getUsersFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Get single user
    getUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getUserSuccess(state, action) {
      state.loading = false;
      state.selectedUser = action.payload.user;
      state.message = action.payload.message;
    },
    getUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Create user
    createUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    createUserSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Add new user to the existing users array
      if (action.payload.user) {
        state.users.push(action.payload.user);
        state.totalUsers += 1;
      }
    },
    createUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Update user
    updateUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    updateUserSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Update user in the existing users array
      if (action.payload.user) {
        const index = state.users.findIndex(user => user._id === action.payload.user._id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
      }
    },
    updateUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Delete user
    deleteUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    deleteUserSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Remove user from the existing users array
      if (action.payload.userId) {
        state.users = state.users.filter(user => user._id !== action.payload.userId);
        state.totalUsers -= 1;
      }
    },
    deleteUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear messages
    clearUserMessages(state) {
      state.error = null;
      state.message = null;
    },

    // Reset user slice
    resetUserSlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.users = [];
      state.selectedUser = null;
      state.totalUsers = 0;
    },
  },
});

// Mock action creators - replace with your new backend integration
export const getAllUsers = () => async (dispatch) => {
  dispatch(userSlice.actions.getUsersRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock users data for now
    const mockUsers = [
      {
        _id: '1',
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        status: 'active',
        phone: '1234567890',
        wagePerHour: 15.0,
        shift: 'morning',
      },
      {
        _id: '2',
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        role: 'staff',
        status: 'active',
        phone: '0987654321',
        wagePerHour: 12.0,
        shift: 'evening',
      },
    ];

    dispatch(userSlice.actions.getUsersSuccess({
      users: mockUsers,
      totalUsers: mockUsers.length,
      message: 'Users fetched successfully.'
    }));
  } catch (error) {
    dispatch(userSlice.actions.getUsersFailed(error.message));
  }
};

export const getUserDetails = (userId) => async (dispatch) => {
  dispatch(userSlice.actions.getUserRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock user data for now
    const mockUser = {
      _id: userId,
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      phone: '1234567890',
      wagePerHour: 15.0,
      shift: 'morning',
    };

    dispatch(userSlice.actions.getUserSuccess({
      user: mockUser,
      message: 'User details fetched successfully.'
    }));
  } catch (error) {
    dispatch(userSlice.actions.getUserFailed(error.message));
  }
};

export const createUser = (userData) => async (dispatch) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock user creation
    const mockUser = {
      _id: Date.now().toString(),
      ...userData,
    };

    dispatch(userSlice.actions.createUserSuccess({
      user: mockUser,
      message: 'User created successfully.'
    }));
  } catch (error) {
    dispatch(userSlice.actions.createUserFailed(error.message));
  }
};

export const updateUser = (userId, userData) => async (dispatch) => {
  dispatch(userSlice.actions.updateUserRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock user update
    const mockUser = {
      _id: userId,
      ...userData,
    };

    dispatch(userSlice.actions.updateUserSuccess({
      user: mockUser,
      message: 'User updated successfully.'
    }));
  } catch (error) {
    dispatch(userSlice.actions.updateUserFailed(error.message));
  }
};

export const deleteUser = (userId) => async (dispatch) => {
  dispatch(userSlice.actions.deleteUserRequest());
  try {
    // TODO: Replace with new backend API call
    dispatch(userSlice.actions.deleteUserSuccess({
      userId: userId,
      message: 'User deleted successfully.'
    }));
  } catch (error) {
    dispatch(userSlice.actions.deleteUserFailed(error.message));
  }
};

export const createSupplier = (supplierData) => async (dispatch) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock supplier creation
    const mockSupplier = {
      _id: Date.now().toString(),
      ...supplierData,
      role: 'supplier',
    };

    dispatch(userSlice.actions.createUserSuccess({
      user: mockSupplier,
      message: 'Supplier created successfully.'
    }));
  } catch (error) {
    dispatch(userSlice.actions.createUserFailed(error.message));
  }
};

export const createTransporter = (transporterData) => async (dispatch) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock transporter creation
    const mockTransporter = {
      _id: Date.now().toString(),
      ...transporterData,
      role: 'transporter',
    };

    dispatch(userSlice.actions.createUserSuccess({
      user: mockTransporter,
      message: 'Transporter created successfully.'
    }));
  } catch (error) {
    dispatch(userSlice.actions.createUserFailed(error.message));
  }
};

export const { clearUserMessages, resetUserSlice } = userSlice.actions;
export default userSlice.reducer;
