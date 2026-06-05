import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard.jsx';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AIAssistantPage from './pages/AIAssistantPage.jsx';
import UserPage from './pages/UserPage.jsx';
import { Layout, NotFound, ProtectedRoute } from './components';
import TransportList from './components/features/TransportList';
import TransportDetails from './components/features/TransportDetails';
import ReturnList from './components/features/ReturnList';
import OrderManagementPage from './pages/OrderManagementPage.jsx';
import { bootstrapAuth } from './app/slices/authSlice';
import { ROUTES, USER_ROLES } from './constants';

const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-sm font-medium text-gray-600">Loading...</div>
  </div>
);

const getSafeRedirectPath = (path) => {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
    return null;
  }

  return path;
};

const getLocationPath = (location) => {
  if (!location?.pathname) {
    return null;
  }

  return getSafeRedirectPath(`${location.pathname}${location.search || ''}${location.hash || ''}`);
};

const getRedirectQueryPath = (search) => {
  const redirect = new URLSearchParams(search).get('redirect');
  return getSafeRedirectPath(redirect);
};

const RootRoute = () => {
  const { isAuthenticated, isBootstrapping } = useSelector((state) => state.auth);

  if (isBootstrapping) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return (
      <Layout>
        <HomePage />
      </Layout>
    );
  }

  return <LandingPage />;
};

const LoginRoute = () => {
  const { isAuthenticated, isBootstrapping } = useSelector((state) => state.auth);
  const location = useLocation();

  if (isBootstrapping) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    const redirectPath =
      getLocationPath(location.state?.from) ||
      getRedirectQueryPath(location.search) ||
      ROUTES.DASHBOARD;

    return <Navigate to={redirectPath} replace />;
  }

  return <LoginPage />;
};

const UnauthorizedPage = () => (
  <div className="flex flex-1 items-center justify-center px-4 py-16">
    <div className="max-w-md text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
      <p className="mt-3 text-sm text-gray-600">
        Your account does not have permission to view this page.
      </p>
    </div>
  </div>
);

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        <Route path={ROUTES.HOME} element={<RootRoute />} />
        <Route path={ROUTES.LOGIN} element={<LoginRoute />} />

        <Route
          element={(
            <ProtectedRoute fallback={<AuthLoadingScreen />}>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
          <Route path={ROUTES.ORDERS} element={<OrderManagementPage />} />
          <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
          <Route path={ROUTES.AI_ASSISTANT} element={<AIAssistantPage />} />
          <Route path={ROUTES.PROFILE} element={<UserPage />} />
          <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />
          <Route path="/returns" element={<ReturnList />} />
          <Route path="/transports" element={<TransportList />} />
          <Route path="/transports/:id" element={<TransportDetails />} />
        </Route>

        <Route
          element={(
            <ProtectedRoute fallback={<AuthLoadingScreen />} requiredRoles={[USER_ROLES.ADMIN]}>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route path={ROUTES.ADMIN} element={<AdminPage />} />
        </Route>

        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
