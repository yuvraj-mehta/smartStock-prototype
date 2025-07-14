import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard.jsx';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AIAssistantPage from './pages/AIAssistantPage.jsx';
import UserPage from './pages/UserPage.jsx';
import { NotFound, Footer, NavigationBar } from './components';
import TransportList from './components/features/TransportList';
import TransportDetails from './components/features/TransportDetails';
import ReturnList from './components/features/ReturnList';
import OrderManagementPage from './pages/OrderManagementPage.jsx';

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      user = null;
    }
    // Only rehydrate if user is a valid object with at least an email or id
    if (token && user && (user.email || user.id)) {
      dispatch({
        type: 'auth/rehydrate',
        payload: { token, user },
      });
    }
  }, [dispatch]);

  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {isAuthenticated && <NavigationBar />}
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <HomePage /> : <LandingPage />} />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/products"
              element={isAuthenticated ? <ProductsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/orders"
              element={isAuthenticated ? <OrderManagementPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/inventory"
              element={isAuthenticated ? <InventoryPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin"
              element={isAuthenticated ? <AdminPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/ai-assistant"
              element={isAuthenticated ? <AIAssistantPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/profile"
              element={isAuthenticated ? <UserPage /> : <Navigate to="/login" replace />}
            />
            {/* Add more routes here as needed */}
            <Route
              path="/returns"
              element={isAuthenticated ? <ReturnList /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/transports"
              element={isAuthenticated ? <TransportList /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/transports/:id"
              element={isAuthenticated ? <TransportDetails /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        {isAuthenticated && <Footer />}
      </div>
    </Router>
  );
};

export default App;
