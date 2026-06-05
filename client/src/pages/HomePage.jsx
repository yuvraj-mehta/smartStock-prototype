import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ROUTES, USER_ROLES } from '../constants';

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const HomePage = () => {
  const { user } = useSelector((state) => state.auth);
  const role = normalizeRole(user?.role);
  const canUseOperations = [USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(role);
  const homeTiles = [
    {
      to: ROUTES.DASHBOARD,
      icon: '📊',
      label: 'Dashboard',
      caption: 'Overview & Analytics',
      className: 'bg-gradient-to-br from-blue-500 to-purple-500 text-white',
      visible: true,
    },
    {
      to: ROUTES.INVENTORY,
      icon: '📦',
      label: 'Inventory',
      caption: 'Stock & Tracking',
      className: 'bg-gradient-to-br from-green-400 to-blue-400 text-white',
      visible: canUseOperations,
    },
    {
      to: ROUTES.PRODUCTS,
      icon: '🛒',
      label: 'Products',
      caption: 'Manage Products',
      className: 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white',
      visible: canUseOperations,
    },
    {
      to: ROUTES.ORDERS,
      icon: '💰',
      label: 'Orders',
      caption: 'Sales Orders',
      className: 'bg-gradient-to-br from-pink-400 to-red-400 text-white',
      visible: canUseOperations,
    },
    {
      to: ROUTES.RETURNS,
      icon: '↩️',
      label: 'Returns',
      caption: 'Manage Returns',
      className: 'bg-gradient-to-br from-gray-400 to-gray-600 text-white',
      visible: canUseOperations,
    },
    {
      to: ROUTES.AI_ASSISTANT,
      icon: '🤖',
      label: 'AI Assistant',
      caption: 'Smart Insights',
      className: 'bg-gradient-to-br from-yellow-300 to-pink-300 text-gray-800',
      visible: canUseOperations,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
      <main className="max-w-5xl mx-auto px-4 py-12">
        <section className="bg-white/90 rounded-2xl shadow-xl border border-yellow-200 flex flex-col items-center py-12 px-6 mb-10 animate-fade-in">
          <h1 className="text-4xl font-extrabold text-yellow-500 mb-2 flex items-center gap-2">
            <span>👋</span> Welcome{user && user.fullName ? `, ${user.fullName}` : ''}!
          </h1>
          <p className="text-lg text-gray-700 mb-4 text-center max-w-2xl">
            This is your SmartStock Home. Here you can quickly access your dashboard, manage inventory, view sales, returns, and get AI-powered insights to optimize your business.
          </p>
          <div className="flex flex-wrap gap-6 justify-center mt-6">
            {homeTiles.filter(tile => tile.visible).map(tile => (
              <Link key={tile.to} to={tile.to} className="home-tile">
                <div className={`${tile.className} rounded-xl p-6 shadow-lg flex flex-col items-center w-44 h-36 hover:scale-105 transition-transform`}>
                  <span className="text-3xl mb-2">{tile.icon}</span>
                  <span className="font-bold text-lg">{tile.label}</span>
                  <span className="text-xs mt-1">{tile.caption}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="text-center text-gray-500 text-sm mt-8">
          <span>SmartStock &copy; {new Date().getFullYear()} &mdash; All rights reserved.</span>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
