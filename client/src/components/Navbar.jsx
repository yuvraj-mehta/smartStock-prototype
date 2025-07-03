import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../app/slices/authSlice';
import {
  BarChart3,
  Package,
  Brain,
  Users,
  LogOut,
  Truck,
  Settings,
  Menu,
  X,
  RotateCcw
} from 'lucide-react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/products', icon: Settings, label: 'Products' },
    { path: '/sales', icon: BarChart3, label: 'Sales & Returns' },
    { path: '/ai-assistant', icon: Brain, label: 'AI Assistant' },
    { path: '/transport', icon: Truck, label: 'Transport' },
    { path: '/users', icon: Users, label: 'Admin' },
  ];
  const toggleMenu = () => setIsMobileMenuOpen((v) => !v);
  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8 w-full">
        {/* Logo - stick to extreme left */}
        <div className="flex items-center flex-shrink-0">
          <a href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SmartStock
            </span>
          </a>
        </div>
        {/* Desktop Navigation - center */}
        <div className="hidden lg:flex items-center justify-center flex-1 max-w-4xl">
          <div className="flex items-center gap-2 bg-gray-50/80 rounded-xl p-1 shadow-inner">
            {navItems.map(({ path, icon: Icon, label }, idx) => {
              const isActive = location.pathname === path;
              return (
                <a
                  key={path}
                  href={path}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${isActive ? 'bg-blue-600 text-white shadow-lg font-extrabold border-2 border-blue-700 scale-105' : 'text-gray-600 hover:text-blue-600 hover:bg-white hover:shadow-sm'}
                    ${idx !== 0 ? 'ml-1' : ''}`}
                  style={isActive ? { boxShadow: '0 4px 16px 0 rgba(37,99,235,0.18)' } : {}}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white drop-shadow' : ''}`} />
                  <span className="hidden xl:inline">{label}</span>
                </a>
              );
            })}
            {/* More menu removed, User Management is now on the navbar */}
          </div>
        </div>
        {/* User Info & Actions - stick to extreme right */}
        <div className="hidden lg:block">
          <UserSection />
        </div>
        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={toggleMenu}
            className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-2">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <a
                  key={path}
                  href={path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive ? 'bg-blue-600 text-white font-extrabold border-2 border-blue-700 scale-105 shadow-lg' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
                  style={isActive ? { boxShadow: '0 4px 16px 0 rgba(37,99,235,0.18)' } : {}}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white drop-shadow' : ''}`} />
                  <span>{label}</span>
                </a>
              );
            })}
            {/* Mobile User Section */}
            <MobileUserSection />
          </div>
        </div>
      )}
    </nav>
  );
};


// UserSection for desktop

function UserSection() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  if (!isAuthenticated || !user) {
    // Show Login button when logged out
    return (
      <a
        href="/login"
        className="px-4 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-150 border border-blue-600 shadow"
      >
        Login
      </a>
    );
  }
  const avatarUrl = user.avatar || null;
  const initials = user.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.name || user.email || '').slice(0, 2).toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // No custom dropdownStyle needed; use Tailwind classes for alignment

  return (
    <div className="hidden lg:flex items-center flex-shrink-0 relative">
      <button
        className="flex items-center px-2 py-1.5 rounded-full hover:bg-gray-100 transition-all duration-150 focus:outline-none group border border-transparent"
        onClick={() => setOpen((v) => !v)}
        ref={buttonRef}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gray-300 group-hover:border-blue-500 transition-all duration-150" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold text-base border border-gray-300 group-hover:border-yellow-500 transition-all duration-150">
            {initials}
          </div>
        )}
        <span className="ml-2 text-base font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-150">
          {user.fullName || user.name || user.email}
        </span>
        <svg className={`ml-1 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-all duration-150 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className="user-dropdown absolute right-0 top-full mt-2 min-w-[320px] bg-white rounded-xl shadow-2xl border border-gray-200 animate-fade-in flex flex-col p-0 z-50"
        >
          {/* Arrow pointer */}
          <div className="absolute -top-2 right-4 w-4 h-4 z-10">
            <svg width="16" height="16" viewBox="0 0 16 16" className="block mx-auto">
              <polygon points="8,0 16,16 0,16" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
            </svg>
          </div>
          <div className="flex flex-col items-center py-4 px-4 border-b border-gray-100 w-full">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover border border-gray-300" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold text-2xl border border-gray-300">
                {initials}
              </div>
            )}
            <span className="mt-2 text-lg font-semibold text-gray-900">{user.fullName || user.name || user.email}</span>
            {user.email && <span className="text-xs text-gray-500">{user.email}</span>}
          </div>
          <button
            className="flex items-center justify-center space-x-2 px-4 py-2 m-4 rounded-md text-base font-medium bg-yellow-400 text-white hover:bg-yellow-500 transition-all duration-150"
            onClick={() => { setOpen(false); dispatch(logout()); }}
            disabled={loading}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

// MobileUserSection for mobile menu
function MobileUserSection() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  if (!isAuthenticated || !user) return null;
  const avatarUrl = user.avatar || null;
  const initials = user.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.name || user.email || '').slice(0, 2).toUpperCase();
  return (
    <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
      <button
        className="w-full flex items-center space-x-3 px-4 py-3 rounded-full hover:bg-gray-100 transition-all duration-150 focus:outline-none border border-transparent"
        onClick={() => setOpen((v) => !v)}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-gray-300" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg border border-gray-300">
            {initials}
          </div>
        )}
        <span className="ml-2 text-base font-medium text-gray-800">{user.fullName || user.name || user.email}</span>
        <svg className={`ml-1 w-4 h-4 text-gray-400 transition-all duration-150 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <button
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-base font-medium bg-yellow-400 text-white hover:bg-yellow-500 transition-all duration-150"
        onClick={() => dispatch(logout())}
        disabled={loading}
      >
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </button>
      {open && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 mt-2 flex flex-col items-center animate-fade-in">
          <div className="flex flex-col items-center py-4 px-4 border-b border-gray-100 w-full">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover border border-gray-300" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold text-2xl border border-gray-300">
                {initials}
              </div>
            )}
            <span className="mt-2 text-lg font-semibold text-gray-900">{user.fullName || user.name || user.email}</span>
            {user.email && <span className="text-xs text-gray-500">{user.email}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;
