import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
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
  requiredRoles = [],
  redirectTo = '/login',
}) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access if required roles are specified
  if (requiredRoles.length > 0 && user?.role) {
    const hasRequiredRole = requiredRoles.includes(user.role);

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

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRoles: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
};

export default ProtectedRoute;