import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * ProtectedRoute Component
 *
 * A higher-order component that protects routes based on authentication state.
 * Redirects unauthenticated users to the login page while preserving the intended destination.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The component to render if authenticated
 * @param {string[]} [props.requiredRoles] - Array of required roles for access
 * @param {string} [props.redirectTo="/login"] - Path to redirect to if not authenticated
 * @returns {React.ReactElement} The protected component or redirect
 */
const ProtectedRoute = ({
  children,
  fallback = null,
  requiredRoles = [],
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isBootstrapping, user } = useSelector(state => state.auth);
  const location = useLocation();

  const redirectPath = getRedirectPath(redirectTo, location);

  if (isBootstrapping) {
    return fallback;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectPath}
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access if required roles are specified
  if (requiredRoles.length > 0) {
    const userRole = user?.role?.toLowerCase();
    const allowedRoles = requiredRoles.map(role => role.toLowerCase());
    const hasRequiredRole = Boolean(userRole && allowedRoles.includes(userRole));

    if (!hasRequiredRole) {
      return (
        <Navigate
          to="/unauthorized"
          state={{ from: location }}
          replace
        />
      );
    }
  }

  return children || <Outlet />;
};

const getRedirectPath = (redirectTo, location) => {
  if (redirectTo !== '/login') {
    return redirectTo;
  }

  const currentPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;
  const params = new URLSearchParams({ redirect: currentPath });

  return `${redirectTo}?${params.toString()}`;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.node,
  requiredRoles: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
};

export default ProtectedRoute;
