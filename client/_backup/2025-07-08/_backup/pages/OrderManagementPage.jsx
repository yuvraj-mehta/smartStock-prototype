import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAllProducts } from '../app/slices/productSlice';
import OrderCreateForm from '../components/features/OrderCreateForm';
import OrderList from '../components/features/OrderList';

export default function OrderManagementPage() {
  const dispatch = useDispatch();
  const { products, loading: productsLoading } = useSelector((state) => state.products);
  const [refreshOrders, setRefreshOrders] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  const handleOrderCreated = () => {
    setRefreshOrders(r => !r);
    setActiveTab('manage');
  };

  if (productsLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mr-4"></div>
      <span className="text-xl text-blue-700 font-semibold">Loading products...</span>
    </div>
  );

  const tabs = [
    {
      id: 'create', label: 'Create Order', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      )
    },
    {
      id: 'manage', label: 'Order Management', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                {/* Order Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Order Management</h1>
                <p className="text-blue-100 mt-1">Manage and track all orders efficiently</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(getAllProducts())}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5 9a7 7 0 0114 0v6a7 7 0 01-14 0V9z" /></svg>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center">
            <div className="flex bg-gray-100 rounded-lg p-1 my-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? (tab.id === 'create' ? 'bg-blue-600 text-white shadow-sm' : 'bg-purple-600 text-white shadow-sm') : 'text-gray-600 hover:text-blue-600 hover:bg-white'}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'create' && (
          <section className="bg-white rounded-2xl border border-blue-200 shadow-xl flex flex-col py-8 px-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-blue-600 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create New Order
            </h2>
            <OrderCreateForm products={products} onOrderCreated={handleOrderCreated} />
          </section>
        )}
        {activeTab === 'manage' && (
          <section className="bg-white rounded-2xl border border-purple-200 shadow-xl flex flex-col py-8 px-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-purple-600 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
              All Orders
            </h2>
            <OrderList products={products} key={refreshOrders} />
          </section>
        )}
      </div>
    </div>
  );
}
