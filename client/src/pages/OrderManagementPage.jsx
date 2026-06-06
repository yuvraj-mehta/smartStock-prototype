import React, { useEffect, useState } from 'react';
import { ClipboardList, PackageCheck, Plus, RotateCcw } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { getAllProducts } from '../app/slices/productSlice';
import OrderCreateForm from '../components/features/OrderCreateForm';
import OrderList from '../components/features/OrderList';

const tabs = [
  { id: 'create', label: 'Create Order', icon: Plus },
  { id: 'manage', label: 'Manage Orders', icon: ClipboardList },
];

const getOrderTabId = (tabId) => `orders-tab-${tabId}`;
const getOrderPanelId = (tabId) => `orders-panel-${tabId}`;
const DEFAULT_ORDER_TAB = 'create';
const ORDER_TAB_IDS = new Set(tabs.map(({ id }) => id));

export default function OrderManagementPage() {
  const dispatch = useDispatch();
  const { products, loading: productsLoading } = useSelector((state) => state.products);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = ORDER_TAB_IDS.has(tabParam) ? tabParam : DEFAULT_ORDER_TAB;
  const [refreshOrders, setRefreshOrders] = useState(false);

  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  useEffect(() => {
    if (tabParam !== null && !ORDER_TAB_IDS.has(tabParam)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', DEFAULT_ORDER_TAB);
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, tabParam]);

  const handleTabChange = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    setSearchParams(nextParams);
  };

  const handleTabKeyDown = (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    handleTabChange(nextTab.id);
    requestAnimationFrame(() => document.getElementById(getOrderTabId(nextTab.id))?.focus());
  };

  const handleOrderCreated = () => {
    setRefreshOrders(r => !r);
    handleTabChange('manage');
  };

  if (productsLoading) return (
    <div className="flex min-h-[40vh] items-center justify-center bg-gray-50">
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm font-medium text-gray-700">Loading products...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              <RotateCcw className="h-3.5 w-3.5" />
              Order lifecycle
            </div>
            <h1 className="text-3xl font-semibold text-gray-950">Order Management</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Create customer orders, package allocated stock, and hand completed packages to transport.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            <PackageCheck className="h-4 w-4 text-blue-600" />
            {products?.length || 0} product records available
          </div>
        </div>

        <div
          className="mb-6 inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Order management sections"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={getOrderTabId(id)}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={getOrderPanelId(id)}
              tabIndex={activeTab === id ? 0 : -1}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => handleTabChange(id)}
              onKeyDown={handleTabKeyDown}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-950">
              {activeTab === 'create' ? 'New order' : 'Order queue'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'create'
                ? 'Add one or more products and optional warehouse notes.'
                : 'Advance each order through processing, packing, and dispatch assignment.'}
            </p>
          </div>
          <div
            id={getOrderPanelId(activeTab)}
            className="p-5 outline-none"
            role="tabpanel"
            aria-labelledby={getOrderTabId(activeTab)}
            tabIndex={0}
          >
            {activeTab === 'create' && (
              <OrderCreateForm products={products} onOrderCreated={handleOrderCreated} />
            )}
            {activeTab === 'manage' && (
              <OrderList products={products} key={refreshOrders} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
