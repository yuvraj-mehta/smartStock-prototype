import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Package } from 'lucide-react';
import { ROUTES, USER_ROLES } from '../../constants';

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const getFooterLinks = (role) => {
  const normalizedRole = normalizeRole(role);
  const canUseOperations = [USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(normalizedRole);
  const canUseAdmin = normalizedRole === USER_ROLES.ADMIN;

  return [
    ...(canUseOperations ? [{ to: ROUTES.DASHBOARD, label: 'Dashboard' }] : []),
    ...(canUseOperations ? [{ to: ROUTES.INVENTORY, label: 'Inventory' }] : []),
    ...(canUseOperations ? [{ to: ROUTES.ORDERS, label: 'Orders' }] : []),
    ...(canUseOperations ? [{ to: ROUTES.FINANCE, label: 'Finance' }] : []),
    ...(canUseAdmin ? [{ to: ROUTES.ADMIN, label: 'Admin' }] : []),
    { to: ROUTES.PROFILE, label: 'Profile' },
  ];
};

const Footer = () => {
  const { user } = useSelector((state) => state.auth);
  const footerLinks = getFooterLinks(user?.role);

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-slate-500 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
              <Package className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">SmartStock</p>
              <p className="truncate text-xs text-slate-500">
                Operational inventory workspace
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SmartStock.</span>
          <span>Portfolio-ready warehouse and order operations prototype.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
