import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart3,
  Brain,
  ChevronDown,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  Package,
  PackageSearch,
  ReceiptText,
  Undo2,
  Settings,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { logout } from '../../app/slices/authSlice';
import { ROLE_ACCESS, ROUTES, USER_ROLES } from '../../constants';

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const hasAnyRole = (role, allowedRoles) => allowedRoles.includes(normalizeRole(role));

const getDisplayName = (user) => (
  user?.fullName || user?.name || user?.email || 'Account'
);

const getInitials = (user) => {
  const source = user?.fullName || user?.name || user?.email || 'SS';
  return source
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatRole = (role) => {
  const normalized = normalizeRole(role);
  const labels = {
    [USER_ROLES.ADMIN]: 'Admin',
    [USER_ROLES.STAFF]: 'Staff',
    [USER_ROLES.VIEWER]: 'Viewer read-only',
    [USER_ROLES.SUPPLIER]: 'External supplier',
    [USER_ROLES.TRANSPORTER]: 'External transporter',
  };

  return labels[normalized] || 'User';
};

const getNavSections = (user) => {
  const canUseStaffOperations = hasAnyRole(user?.role, ROLE_ACCESS.STAFF_WRITE);
  const canViewCatalog = hasAnyRole(user?.role, ROLE_ACCESS.INTERNAL_READ);
  const canUseAdminPanel = hasAnyRole(user?.role, ROLE_ACCESS.ADMIN_ONLY);

  return [
    {
      label: 'Overview',
      items: canUseStaffOperations
        ? [{ path: ROUTES.DASHBOARD, icon: BarChart3, label: 'Dashboard' }]
        : [],
    },
    {
      label: 'Operations',
      items: canUseStaffOperations
        ? [
          { path: ROUTES.INVENTORY, icon: Package, label: 'Inventory' },
          { path: ROUTES.ORDERS, icon: ClipboardList, label: 'Orders' },
          { path: ROUTES.RETURNS, icon: Undo2, label: 'Returns' },
          { path: ROUTES.TRANSPORT, icon: Truck, label: 'Transport' },
        ]
        : [],
    },
    {
      label: 'Records',
      items: canViewCatalog
        ? [
          { path: ROUTES.PRODUCTS, icon: PackageSearch, label: 'Product Catalog' },
          { path: ROUTES.DOCUMENTATION, icon: FileText, label: 'Documentation' },
        ]
        : [],
    },
    {
      label: 'Money',
      items: canUseStaffOperations
        ? [{ path: ROUTES.FINANCE, icon: ReceiptText, label: 'Finance' }]
        : [],
    },
    {
      label: 'Insights',
      items: canUseStaffOperations
        ? [{ path: ROUTES.AI_ASSISTANT, icon: Brain, label: 'AI Assistant' }]
        : [],
    },
    {
      label: 'Admin',
      items: canUseAdminPanel
        ? [{ path: ROUTES.ADMIN, icon: Users, label: 'Admin Console' }]
        : [],
    },
  ].filter(section => section.items.length > 0);
};

const isActivePath = (pathname, path) => {
  if (path === ROUTES.TRANSPORT) {
    return pathname.startsWith(ROUTES.TRANSPORT);
  }

  return pathname === path;
};

const NavLink = ({
  item,
  active,
  onClick,
  compactLabel = false,
  fullWidth = false,
}) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      title={item.label}
      className={[
        'inline-flex h-9 shrink-0 items-center rounded-md border font-medium transition-colors',
        compactLabel ? 'gap-1.5 px-2 text-xs xl:text-sm' : 'gap-2 px-2.5 text-sm',
        fullWidth ? 'w-full' : '',
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={compactLabel ? 'max-w-[7.5rem] truncate' : 'truncate'}>
        {item.label}
      </span>
    </Link>
  );
};

const NavigationBar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const navItems = getNavSections(user).flatMap((section) => section.items);
  const mobileNavigationId = useId();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Primary navigation">
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to={ROUTES.HOME} className="flex min-w-0 shrink-0 items-center gap-3" aria-label="SmartStock home">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm">
            <Package className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-lg font-semibold tracking-normal text-slate-950">
            SmartStock
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-start lg:flex">
          <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/70 p-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                item={item}
                active={isActivePath(location.pathname, item.path)}
                compactLabel
              />
            ))}
          </div>
        </div>

        <div className="ml-auto hidden shrink-0 lg:block">
          <UserSection />
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 lg:hidden"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls={mobileNavigationId}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div id={mobileNavigationId} className="border-t border-slate-200 bg-white lg:hidden">
          <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-3">
            <div className="grid gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  item={item}
                  active={isActivePath(location.pathname, item.path)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  fullWidth
                />
              ))}
            </div>
            <MobileUserSection onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </nav>
  );
};

function Avatar({ user, size = 'small' }) {
  const avatarUrl = user?.avatar || null;
  const sizeClass = size === 'large' ? 'h-11 w-11 text-base' : 'h-8 w-8 text-xs';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border border-slate-200 object-cover`}
      />
    );
  }

  return (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white`}>
      {getInitials(user)}
    </span>
  );
}

function UserSection() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!isAuthenticated || !user) {
    return (
      <Link
        to={ROUTES.LOGIN}
        className="inline-flex h-9 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        className="flex h-10 max-w-[210px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-left transition-colors hover:bg-slate-50"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={open ? 'Close account menu' : 'Open account menu'}
      >
        <Avatar user={user} />
        <span className="min-w-0">
          <span className="block max-w-[120px] truncate text-sm font-medium leading-5 text-slate-900">
            {getDisplayName(user)}
          </span>
          <span className="block text-xs leading-4 text-slate-500">
            {formatRole(user.role)}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          ref={dropdownRef}
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
            <Avatar user={user} size="large" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{getDisplayName(user)}</p>
              {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
            </div>
          </div>
          <div className="grid gap-1 p-2">
            <Link
              to={ROUTES.PROFILE}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Profile
            </Link>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                setOpen(false);
                dispatch(logout());
              }}
              disabled={loading}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileUserSection({ onNavigate }) {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return (
      <div className="mt-3 border-t border-slate-200 pt-3">
        <Link
          to={ROUTES.LOGIN}
          onClick={onNavigate}
          className="flex h-10 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-medium text-white"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
        <Avatar user={user} size="large" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{getDisplayName(user)}</p>
          {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
        </div>
      </div>
      <div className="mt-2 grid gap-1">
        <Link
          to={ROUTES.PROFILE}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Profile
        </Link>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            onNavigate();
            dispatch(logout());
          }}
          disabled={loading}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default NavigationBar;
