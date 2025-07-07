import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const LandingPage = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main>
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                <span className="text-2xl font-bold text-gray-900">SmartStock</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Driven Inventory
              <span className="text-blue-600 block">Management</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your inventory management with intelligent forecasting, real-time tracking,
              and automated insights that help you stay ahead of demand.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a href="/login">
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-lg shadow">
                  Get Started Free
                </button>
              </a>
              <button className="text-lg px-8 py-4 border border-blue-600 rounded-lg text-blue-600 bg-white hover:bg-blue-50">
                Watch Demo
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Reduce stockouts by up to 85%</span>
              </div>
              <div className="flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Cut inventory costs by 30%</span>
              </div>
              <div className="flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Save 15+ hours per week on manual tasks</span>
              </div>
              <div className="flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Improve forecast accuracy to 95%+</span>
              </div>
            </div>
          </div>
        </section>
        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Manage Inventory
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Powerful features designed to streamline your operations and boost efficiency
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Inventory Tracking</h3>
                <p className="text-gray-600 leading-relaxed">Real-time tracking across all your locations with intelligent alerts and notifications.</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Predictive Analytics</h3>
                <p className="text-gray-600 leading-relaxed">AI-powered forecasting to optimize stock levels and prevent stockouts.</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced Reporting</h3>
                <p className="text-gray-600 leading-relaxed">Comprehensive analytics and insights to drive better business decisions.</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Automated Reordering</h3>
                <p className="text-gray-600 leading-relaxed">Set smart reorder points and let AI handle your restocking automatically.</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Secure & Reliable</h3>
                <p className="text-gray-600 leading-relaxed">Enterprise-grade security with 99.9% uptime guarantee for your peace of mind.</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Assistant</h3>
                <p className="text-gray-600 leading-relaxed">Get instant insights and recommendations from our intelligent AI assistant.</p>
              </div>
            </div>
          </div>
        </section>
        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Inventory Management?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join businesses already using SmartStock to optimize their operations
            </p>
            <a href="/login">
              <button className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 rounded-lg shadow">
                Start Your Free Trial
              </button>
            </a>
            <p className="text-blue-100 text-sm mt-4">No credit card required • 14-day free trial</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
