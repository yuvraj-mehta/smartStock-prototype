import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
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
    setActiveTab('manage'); // Switch to manage tab after creating
  };

  if (productsLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
      <span className="text-xl text-blue-700 font-semibold">Loading products...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <main className="w-full mx-auto px-4 py-10">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-8 flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-blue-500" />
          Order Management
        </h1>
        <div className="mb-8 flex gap-2 border-b border-blue-200">
          <button
            className={`px-6 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors duration-200 ${activeTab === 'create' ? 'bg-white text-blue-700 border-x border-t border-blue-300 -mb-px' : 'bg-blue-100 text-blue-500'}`}
            onClick={() => setActiveTab('create')}
          >
            Create Order
          </button>
          <button
            className={`px-6 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors duration-200 ${activeTab === 'manage' ? 'bg-white text-purple-700 border-x border-t border-purple-300 -mb-px' : 'bg-purple-100 text-purple-500'}`}
            onClick={() => setActiveTab('manage')}
          >
            Manage Orders
          </button>
        </div>
        <div className="glass-card rounded-2xl border shadow-xl flex flex-col py-8 px-6 animate-fade-in bg-white/80">
          {activeTab === 'create' && (
            <>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">Create New Order</h2>
              <OrderCreateForm products={products} onOrderCreated={handleOrderCreated} />
            </>
          )}
          {activeTab === 'manage' && (
            <>
              <h2 className="text-2xl font-bold text-purple-600 mb-4">All Orders</h2>
              <OrderList products={products} key={refreshOrders} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
