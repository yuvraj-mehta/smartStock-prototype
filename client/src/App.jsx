import { lazy, Suspense, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { bootstrapAuth } from './app/slices/authSlice';
import Layout from './components/layout/Layout';
import NotFound from './components/ui/NotFound';
import ProtectedRoute from './components/ui/ProtectedRoute';
import { ROLE_ACCESS, ROLE_DEFAULT_ROUTES, ROUTES } from './constants';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard.jsx'));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const DocumentationPage = lazy(() => import('./pages/DocumentationPage.jsx'));
const InventoryPage = lazy(() => import('./pages/InventoryPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage.jsx'));
const UserPage = lazy(() => import('./pages/UserPage.jsx'));
const TransportList = lazy(() => import('./components/features/TransportList'));
const TransportDetails = lazy(() => import('./components/features/TransportDetails'));
const ReturnList = lazy(() => import('./components/features/ReturnList'));
const OrderManagementPage = lazy(() => import('./pages/OrderManagementPage.jsx'));
const FinancePage = lazy(() => import('./pages/FinancePage.jsx'));

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const hasAnyRole = (role, allowedRoles) => allowedRoles.includes(normalizeRole(role));

const getDefaultAuthenticatedRoute = (user) => (
  ROLE_DEFAULT_ROUTES[normalizeRole(user?.role)] || ROUTES.PROFILE
);

const getPathnameFromPath = (path) => path.split(/[?#]/)[0];

const routeStartsWith = (pathname, route) => (
  pathname === route || pathname.startsWith(`${route}/`)
);

const canAccessPath = (user, path) => {
  const pathname = getPathnameFromPath(path);

  if ([ROUTES.PROFILE, ROUTES.UNAUTHORIZED].includes(pathname)) {
    return true;
  }

  if (pathname === ROUTES.ADMIN) {
    return hasAnyRole(user?.role, ROLE_ACCESS.ADMIN_ONLY);
  }

  if ([ROUTES.PRODUCTS, ROUTES.DOCUMENTATION].includes(pathname)) {
    return hasAnyRole(user?.role, ROLE_ACCESS.INTERNAL_READ);
  }

  if (
    [
      ROUTES.DASHBOARD,
      ROUTES.INVENTORY,
      ROUTES.ORDERS,
      ROUTES.FINANCE,
      ROUTES.RETURNS,
      ROUTES.AI_ASSISTANT,
    ].includes(pathname) ||
    routeStartsWith(pathname, ROUTES.TRANSPORT)
  ) {
    return hasAnyRole(user?.role, ROLE_ACCESS.STAFF_WRITE);
  }

  return false;
};

const getRedirectForAuthenticatedUser = (user, ...paths) => (
  paths.find(path => path && canAccessPath(user, path)) || getDefaultAuthenticatedRoute(user)
);

const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-sm font-medium text-gray-600">Loading...</div>
  </div>
);

const RouteFallback = () => (
  <div className="flex flex-1 items-center justify-center px-4 py-16">
    <div className="text-sm font-medium text-gray-600">Loading...</div>
  </div>
);

const renderLazyRoute = (Component) => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
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
  const { isAuthenticated, isBootstrapping, user } = useSelector((state) => state.auth);

  if (isBootstrapping) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultAuthenticatedRoute(user)} replace />;
  }

  return renderLazyRoute(LandingPage);
};

const LoginRoute = () => {
  const { isAuthenticated, isBootstrapping, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (isBootstrapping) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    const redirectPath = getRedirectForAuthenticatedUser(
      user,
      getLocationPath(location.state?.from),
      getRedirectQueryPath(location.search),
    );

    return <Navigate to={redirectPath} replace />;
  }

  return renderLazyRoute(LoginPage);
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
        <Route path={ROUTES.DOCUMENTATION} element={renderLazyRoute(DocumentationPage)} />

        <Route
          element={(
            <ProtectedRoute fallback={<AuthLoadingScreen />}>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route path={ROUTES.PROFILE} element={renderLazyRoute(UserPage)} />
          <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />
        </Route>

        <Route
          element={(
            <ProtectedRoute fallback={<AuthLoadingScreen />} requiredRoles={ROLE_ACCESS.INTERNAL_READ}>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route path={ROUTES.PRODUCTS} element={renderLazyRoute(ProductsPage)} />
        </Route>

        <Route
          element={(
            <ProtectedRoute fallback={<AuthLoadingScreen />} requiredRoles={ROLE_ACCESS.STAFF_WRITE}>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route path={ROUTES.DASHBOARD} element={renderLazyRoute(DashboardPage)} />
          <Route path={ROUTES.ORDERS} element={renderLazyRoute(OrderManagementPage)} />
          <Route path={ROUTES.FINANCE} element={renderLazyRoute(FinancePage)} />
          <Route path={ROUTES.INVENTORY} element={renderLazyRoute(InventoryPage)} />
          <Route path={ROUTES.RETURNS} element={renderLazyRoute(ReturnList)} />
          <Route path={ROUTES.AI_ASSISTANT} element={renderLazyRoute(AIAssistantPage)} />
          <Route path={ROUTES.TRANSPORT} element={renderLazyRoute(TransportList)} />
          <Route path={ROUTES.TRANSPORT_DETAILS} element={renderLazyRoute(TransportDetails)} />
        </Route>

        <Route
          element={(
            <ProtectedRoute fallback={<AuthLoadingScreen />} requiredRoles={ROLE_ACCESS.ADMIN_ONLY}>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route path={ROUTES.ADMIN} element={renderLazyRoute(AdminPage)} />
        </Route>

        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
