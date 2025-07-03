import { useSelector } from "react-redux";

const HomePage = () => {
  const { user } = useSelector((state) => state.auth);
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
            <a href="/dashboard" className="home-tile">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-xl p-6 shadow-lg flex flex-col items-center w-44 h-36 hover:scale-105 transition-transform">
                <span className="text-3xl mb-2">📊</span>
                <span className="font-bold text-lg">Dashboard</span>
                <span className="text-xs mt-1">Overview & Analytics</span>
              </div>
            </a>
            <a href="/inventory" className="home-tile">
              <div className="bg-gradient-to-br from-green-400 to-blue-400 text-white rounded-xl p-6 shadow-lg flex flex-col items-center w-44 h-36 hover:scale-105 transition-transform">
                <span className="text-3xl mb-2">📦</span>
                <span className="font-bold text-lg">Inventory</span>
                <span className="text-xs mt-1">Stock & Tracking</span>
              </div>
            </a>
            <a href="/products" className="home-tile">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-400 text-white rounded-xl p-6 shadow-lg flex flex-col items-center w-44 h-36 hover:scale-105 transition-transform">
                <span className="text-3xl mb-2">🛒</span>
                <span className="font-bold text-lg">Products</span>
                <span className="text-xs mt-1">Manage Products</span>
              </div>
            </a>
            <a href="/sales" className="home-tile">
              <div className="bg-gradient-to-br from-pink-400 to-red-400 text-white rounded-xl p-6 shadow-lg flex flex-col items-center w-44 h-36 hover:scale-105 transition-transform">
                <span className="text-3xl mb-2">💰</span>
                <span className="font-bold text-lg">Sales</span>
                <span className="text-xs mt-1">Sales & Revenue</span>
              </div>
            </a>
            <a href="/returns" className="home-tile">
              <div className="bg-gradient-to-br from-gray-400 to-gray-600 text-white rounded-xl p-6 shadow-lg flex flex-col items-center w-44 h-36 hover:scale-105 transition-transform">
                <span className="text-3xl mb-2">↩️</span>
                <span className="font-bold text-lg">Returns</span>
                <span className="text-xs mt-1">Manage Returns</span>
              </div>
            </a>
            <a href="/ai-assistant" className="home-tile">
              <div className="bg-gradient-to-br from-yellow-300 to-pink-300 text-gray-800 rounded-xl p-6 shadow-lg flex flex-col items-center w-44 h-36 hover:scale-105 transition-transform">
                <span className="text-3xl mb-2">🤖</span>
                <span className="font-bold text-lg">AI Assistant</span>
                <span className="text-xs mt-1">Smart Insights</span>
              </div>
            </a>
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
