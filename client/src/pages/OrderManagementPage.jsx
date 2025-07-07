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

  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  const handleOrderCreated = () => {
    setRefreshOrders(r => !r);
  };

  if (productsLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
      <span className="text-xl text-blue-700 font-semibold">Loading products...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-8 flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-blue-500" />
          Order Management
        </h1>
        <div className="grid md:grid-cols-2 gap-8">
          <section className="glass-card rounded-2xl border border-blue-200 shadow-xl flex flex-col py-8 px-6 animate-fade-in bg-white/80">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">Create New Order</h2>
            <OrderCreateForm products={products} onOrderCreated={handleOrderCreated} />
          </section>
          <section className="glass-card rounded-2xl border border-purple-200 shadow-xl flex flex-col py-8 px-6 animate-fade-in bg-white/80">
            <h2 className="text-2xl font-bold text-purple-600 mb-4">All Orders</h2>
            <OrderList products={products} key={refreshOrders} />
          </section>
        </div>
      </main>
    </div>
  );
}
