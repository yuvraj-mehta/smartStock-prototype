import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  Filter,
  Gauge,
  LoaderCircle,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react';
import {
  fetchInventory,
  addInventorySupply,
  markDamagedInventory,
  fetchRealTimeInventoryStatus,
  trackBatchByNumber,
  clearInventoryMessages,
} from '../app/slices/inventorySlice';

// All inventory stats and UI are derived from Item status fields (in_stock, damaged, etc.)
// Do not use deprecated product/inventory quantity fields.
import { getAllProducts } from '../app/slices/productSlice';
import { fetchSuppliers } from '../app/slices/supplierSlice';
import { USER_ROLES } from '../constants';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultSupplyForm = () => {
  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);

  return {
    productId: '',
    supplierId: '',
    quantity: '',
    mfgDate: formatDateInput(today),
    expDate: formatDateInput(nextYear),
    unitCost: '',
    currency: 'INR',
    purchaseOrderId: '',
    notes: '',
  };
};

const getDefaultDamagedForm = () => ({
  productId: '',
  batchId: '',
  quantity: '',
  reason: '',
});

const formatCurrency = (value, currency = 'INR') => (
  Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
);

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN');
};

const formatCategory = (category) => (
  category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Uncategorized'
);

const panelClass = 'rounded-lg border border-slate-200 bg-white shadow-sm';
const fieldClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'mb-2 block text-sm font-medium text-slate-700';
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60';
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const toneClasses = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
};

const noticeConfig = {
  success: {
    Icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconClassName: 'text-emerald-600',
  },
  error: {
    Icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-800',
    iconClassName: 'text-red-600',
  },
  warning: {
    Icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    iconClassName: 'text-amber-600',
  },
  info: {
    Icon: AlertCircle,
    className: 'border-blue-200 bg-blue-50 text-blue-800',
    iconClassName: 'text-blue-600',
  },
};

const inventoryTabs = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'stock', label: 'Stock Management', icon: PackageOpen },
  { id: 'add-supply', label: 'Add Supply', icon: Plus },
  { id: 'mark-damaged', label: 'Mark Damaged', icon: AlertTriangle },
  { id: 'tracking', label: 'Batch Tracking', icon: Barcode },
];

const DEFAULT_INVENTORY_TAB = 'overview';
const INVENTORY_TAB_IDS = new Set(inventoryTabs.map(({ id }) => id));
const getInventoryTabId = (tabId) => `inventory-tab-${tabId}`;
const getInventoryPanelId = (tabId) => `inventory-panel-${tabId}`;

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const getStatusMeta = (quantity) => {
  const count = Number(quantity) || 0;

  if (count === 0) {
    return {
      label: 'Out of Stock',
      Icon: XCircle,
      className: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    };
  }

  if (count < 10) {
    return {
      label: 'Low Stock',
      Icon: AlertTriangle,
      className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    };
  }

  return {
    label: 'In Stock',
    Icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  };
};

function Notice({ type = 'info', title, children, onDismiss }) {
  const config = noticeConfig[type] || noticeConfig.info;
  const Icon = config.Icon;

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${config.className}`} role={type === 'error' ? 'alert' : 'status'}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconClassName}`} />
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className={title ? 'mt-1 text-sm leading-6' : 'text-sm leading-6'}>{children}</div>
        </div>
        {onDismiss && (
          <button
            type="button"
            className="rounded-md p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100"
            onClick={onDismiss}
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, detail, tone = 'blue' }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border p-2 ${toneClasses[tone] || toneClasses.blue}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, tone = 'blue', detail }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className={`rounded-md border p-2 ${toneClasses[tone] || toneClasses.blue}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {detail && <p className="mt-3 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function StatusBadge({ quantity }) {
  const status = getStatusMeta(quantity);
  const Icon = status.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.label}
    </span>
  );
}

function DetailTile({ label, value, tone = 'slate', mono = false }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</p>
    </div>
  );
}

const InventoryPage = () => {
  const dispatch = useDispatch();
  const {
    products = [],
    loading,
    error,
    message,
    realTimeStatus,
    batchTracking,
    totalInventoryValue,
    totalDamagedValue,
    totalSoldValue,
  } = useSelector(state => state.inventory);
  const { user } = useSelector(state => state.auth);
  const canRefreshInventory = [USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(normalizeRole(user?.role));
  const { products: allProducts = [] } = useSelector(state => state.products);
  const { suppliers: supplierRows = [], loading: suppliersLoading } = useSelector(state => state.suppliers);

  const inventoryProducts = Array.isArray(products) ? products : [];
  const productOptions = Array.isArray(allProducts) ? allProducts : [];
  const supplierOptions = Array.isArray(supplierRows) ? supplierRows : [];

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = INVENTORY_TAB_IDS.has(tabParam) ? tabParam : DEFAULT_INVENTORY_TAB;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const [supplyForm, setSupplyForm] = useState(getDefaultSupplyForm);
  const [damagedForm, setDamagedForm] = useState(getDefaultDamagedForm);
  const [financialLoss, setFinancialLoss] = useState(null);
  const [addSupplyDetails, setAddSupplyDetails] = useState(null);
  const [localNotice, setLocalNotice] = useState(null);
  const [batchTrackingForm, setBatchTrackingForm] = useState({
    batchNumber: '',
  });

  useEffect(() => {
    dispatch(fetchInventory());
    dispatch(getAllProducts());
    dispatch(fetchRealTimeInventoryStatus());
    dispatch(fetchSuppliers());
  }, [dispatch]);

  useEffect(() => {
    if (tabParam !== null && !INVENTORY_TAB_IDS.has(tabParam)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', DEFAULT_INVENTORY_TAB);
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, tabParam]);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        dispatch(clearInventoryMessages());
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, error, dispatch]);

  const availableBatches = useMemo(() => {
    if (!damagedForm.productId) return [];
    const selectedProduct = inventoryProducts.find(p => p.product?._id === damagedForm.productId);
    return selectedProduct ? (selectedProduct.batches || []).filter(batch => Number(batch.quantity) > 0) : [];
  }, [damagedForm.productId, inventoryProducts]);

  const selectedDamageBatch = useMemo(() => (
    availableBatches.find(batch => batch.batchId === damagedForm.batchId)
  ), [availableBatches, damagedForm.batchId]);

  const selectedSupplyProduct = useMemo(() => (
    productOptions.find(product => product._id === supplyForm.productId)
  ), [productOptions, supplyForm.productId]);

  const inventoryCategories = useMemo(() => (
    Array.from(
      new Set(inventoryProducts.map(item => item.product?.productCategory).filter(Boolean)),
    ).sort()
  ), [inventoryProducts]);

  const stockedProducts = useMemo(() => (
    inventoryProducts.filter(item => item?.product?._id && Number(item.totalQuantity) > 0)
  ), [inventoryProducts]);

  const recentBatches = useMemo(() => (
    inventoryProducts
      .flatMap(item => (item.batches || []).slice(0, 2).map(batch => ({
        batchNumber: batch.batchNumber,
        productName: item.product?.productName || 'Unnamed product',
        batchId: batch.batchId,
      })))
      .slice(0, 10)
  ), [inventoryProducts]);

  const supplyPrerequisites = useMemo(() => {
    const missing = [];
    if (productOptions.length === 0) {
      missing.push('Create at least one product before adding supply.');
    }
    if (supplierOptions.length === 0 && !suppliersLoading) {
      missing.push('Create or load at least one supplier before adding supply.');
    }
    return missing;
  }, [productOptions.length, supplierOptions.length, suppliersLoading]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return inventoryProducts.filter((item) => {
      const product = item.product || {};
      const matchesSearch = !query ||
        product.productName?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'all' || product.productCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [inventoryProducts, searchTerm, selectedCategory]);

  const inventoryStats = useMemo(() => ({
    totalItems: inventoryProducts.reduce((sum, p) => sum + (Number(p.totalQuantity) || 0), 0),
    totalProducts: inventoryProducts.length,
    lowStockItems: inventoryProducts.filter(p => Number(p.totalQuantity) < 10).length,
    outOfStockItems: inventoryProducts.filter(p => Number(p.totalQuantity) === 0).length,
    damagedItems: inventoryProducts.reduce((sum, p) => (
      sum + (p.batches || []).reduce((batchSum, batch) => (
        batchSum + (Number(batch.damagedQuantity) || 0)
      ), 0)
    ), 0),
  }), [inventoryProducts]);

  const handleTabChange = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    setSearchParams(nextParams);
    setLocalNotice(null);
  };

  const handleTabKeyDown = (event) => {
    const currentIndex = inventoryTabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % inventoryTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + inventoryTabs.length) % inventoryTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = inventoryTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = inventoryTabs[nextIndex];
    handleTabChange(nextTab.id);
    requestAnimationFrame(() => document.getElementById(getInventoryTabId(nextTab.id))?.focus());
  };

  const toggleRow = (productId) => {
    setExpandedRows((currentRows) => {
      const nextRows = new Set(currentRows);
      if (nextRows.has(productId)) {
        nextRows.delete(productId);
      } else {
        nextRows.add(productId);
      }
      return nextRows;
    });
  };

  const handleAddSupply = async (e) => {
    e.preventDefault();
    setLocalNotice(null);
    setAddSupplyDetails(null);

    const { productId, supplierId, quantity, mfgDate, expDate, unitCost } = supplyForm;

    if (supplyPrerequisites.length > 0) {
      setLocalNotice({
        type: 'warning',
        title: 'Supply setup needed',
        message: supplyPrerequisites.join(' '),
      });
      return;
    }

    if (!productId || !supplierId || !quantity || !mfgDate || !expDate || !unitCost) {
      setLocalNotice({
        type: 'error',
        title: 'Supply form incomplete',
        message: 'Select a product and supplier, then enter quantity, manufacturing date, expiry date, and unit cost.',
      });
      return;
    }
    if (Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setLocalNotice({
        type: 'error',
        title: 'Invalid quantity',
        message: 'Quantity must be a positive number.',
      });
      return;
    }
    if (Number.isNaN(Number(unitCost)) || Number(unitCost) <= 0) {
      setLocalNotice({
        type: 'error',
        title: 'Invalid unit cost',
        message: 'Unit cost must be a positive number.',
      });
      return;
    }

    const payload = {
      ...supplyForm,
      quantity: Number(supplyForm.quantity),
      supplierId: String(supplyForm.supplierId),
      unitCost: Number(supplyForm.unitCost),
      currency: supplyForm.currency || 'INR',
      purchaseOrderId: supplyForm.purchaseOrderId || undefined,
    };
    const result = await dispatch(addInventorySupply(payload));
    if (result) {
      setAddSupplyDetails({
        batchId: result.batchId,
        itemsCreated: result.itemsCreated,
        totalCost: result.totalCost,
        currency: result.currency,
        purchaseOrderId: result.purchaseOrderId,
        message: result.message,
      });
      setSupplyForm(getDefaultSupplyForm());
    } else {
      setAddSupplyDetails(null);
    }
  };

  const handleMarkDamaged = async (e) => {
    e.preventDefault();
    setLocalNotice(null);

    if (!damagedForm.productId || !damagedForm.batchId || !damagedForm.quantity || !damagedForm.reason) {
      setLocalNotice({
        type: 'error',
        title: 'Damage report incomplete',
        message: 'Select a product and batch, then enter the quantity and reason for damage.',
      });
      return;
    }

    const damagedQuantity = Number(damagedForm.quantity);
    const maxQuantity = Number(selectedDamageBatch?.quantity) || 0;

    if (Number.isNaN(damagedQuantity) || damagedQuantity <= 0) {
      setLocalNotice({
        type: 'error',
        title: 'Invalid damage quantity',
        message: 'Quantity to mark as damaged must be a positive number.',
      });
      return;
    }

    if (maxQuantity > 0 && damagedQuantity > maxQuantity) {
      setLocalNotice({
        type: 'error',
        title: 'Quantity exceeds batch stock',
        message: `This batch has ${formatNumber(maxQuantity)} units available.`,
      });
      return;
    }

    const payload = {
      batchId: damagedForm.batchId,
      quantity: damagedQuantity,
      reason: damagedForm.reason,
    };
    const result = await dispatch(markDamagedInventory(payload));
    if (result && typeof result.financialLoss !== 'undefined') {
      setFinancialLoss(result.financialLoss);
    } else {
      setFinancialLoss(null);
    }
    setDamagedForm(getDefaultDamagedForm());
  };

  const handleBatchTracking = async (e) => {
    e.preventDefault();
    setLocalNotice(null);

    const batchNumber = batchTrackingForm.batchNumber.trim();
    if (!batchNumber) {
      setLocalNotice({
        type: 'error',
        title: 'Batch number required',
        message: 'Enter a batch number or choose one from the recent batch list.',
      });
      return;
    }

    await dispatch(trackBatchByNumber(batchNumber));
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total items" value={formatNumber(inventoryStats.totalItems)} icon={PackageOpen} detail={`${formatNumber(inventoryStats.totalProducts)} product types`} />
        <MetricCard title="Product types" value={formatNumber(inventoryStats.totalProducts)} icon={BarChart3} tone="slate" detail="Grouped by SKU" />
        <MetricCard title="Low stock" value={formatNumber(inventoryStats.lowStockItems)} icon={AlertTriangle} tone="amber" detail="Below operational threshold" />
        <MetricCard title="Out of stock" value={formatNumber(inventoryStats.outOfStockItems)} icon={XCircle} tone="red" detail="Needs replenishment" />
        <MetricCard title="Damaged items" value={formatNumber(inventoryStats.damagedItems)} icon={AlertCircle} tone="red" detail="Reported across batches" />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Inventory value" value={formatCurrency(totalInventoryValue)} icon={Warehouse} tone="emerald" detail="Current stock valuation" />
        <MetricCard title="Goods sold value" value={formatCurrency(totalSoldValue)} icon={CheckCircle2} tone="blue" detail="Recorded sold inventory" />
        <MetricCard title="Damaged value" value={formatCurrency(totalDamagedValue)} icon={AlertCircle} tone="amber" detail="Estimated lost value" />
      </section>

      <section className={`${panelClass} p-5`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <SectionHeader icon={ClipboardList} title="Quick actions" detail="Jump into the most common inventory workflows." />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => handleTabChange('add-supply')}
            className="flex min-h-24 items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-100"
          >
            <span className="rounded-md border border-blue-200 bg-white p-2 text-blue-700">
              <Plus className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-blue-900">Add New Supply</span>
              <span className="mt-1 block text-sm text-blue-700">Restock products into inventory</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('mark-damaged')}
            className="flex min-h-24 items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-left transition hover:border-red-300 hover:bg-red-100"
          >
            <span className="rounded-md border border-red-200 bg-white p-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-red-900">Mark Damaged</span>
              <span className="mt-1 block text-sm text-red-700">Report loss against a batch</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('tracking')}
            className="flex min-h-24 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100"
          >
            <span className="rounded-md border border-slate-200 bg-white p-2 text-slate-700">
              <Barcode className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-950">Track Batch</span>
              <span className="mt-1 block text-sm text-slate-600">Inspect item status and movement</span>
            </span>
          </button>
        </div>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-4">
          <SectionHeader icon={Warehouse} title="Recent inventory overview" detail="Latest products with batch-backed quantities." tone="slate" />
        </div>
        <div className="p-5">
          {inventoryProducts.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No inventory batches yet"
              detail="Create product records and add supply to start tracking stock by batch."
              action={(
                <button type="button" className={primaryButtonClass} onClick={() => handleTabChange('add-supply')}>
                  <Plus className="h-4 w-4" />
                  Add Supply
                </button>
              )}
            />
          ) : (
            <>
              <div className="space-y-3">
                {inventoryProducts.slice(0, 5).map((item) => {
                  const product = item.product || {};
                  return (
                    <div key={product._id} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                          <PackageOpen className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950" title={product.productName}>{product.productName || 'Unnamed product'}</p>
                          <p className="mt-1 truncate font-mono text-xs text-slate-500" title={product.sku}>{product.sku || 'No SKU'}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {formatNumber(item.totalQuantity)}
                          <span className="ml-1 font-normal text-slate-500">units</span>
                        </p>
                        <div className="mt-1">
                          <StatusBadge quantity={item.totalQuantity} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('stock')}
                className="mt-4 w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                View complete inventory
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );

  const renderStockTab = () => (
    <div className="space-y-6">
      <section className={`${panelClass} p-5`}>
        <div className="mb-4">
          <SectionHeader icon={Search} title="Search and filter products" detail="Find SKU-level inventory and expand rows to inspect batches." />
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_240px_auto]">
          <label className="relative block">
            <span className="sr-only">Search products by name or SKU</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${fieldClass} pl-10`}
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Filter by category</span>
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`${fieldClass} pl-10`}
            >
              <option value="all">All categories</option>
              {inventoryCategories.map(category => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => dispatch(fetchInventory())}
            className={secondaryButtonClass}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        {filteredProducts.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Boxes}
              title={inventoryProducts.length === 0 ? 'No inventory available' : 'No products match these filters'}
              detail={inventoryProducts.length === 0
                ? 'Add supply after products and suppliers are available to populate this stock table.'
                : 'Adjust the search term or category filter to return inventory records.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total Quantity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredProducts.map((item, index) => {
                  const product = item.product || {};
                  const isExpanded = expandedRows.has(product._id);
                  return (
                    <React.Fragment key={product._id || product.sku || product.productName || index}>
                      <tr className="transition hover:bg-slate-50">
                        <td className="max-w-[300px] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
                              <PackageOpen className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950" title={product.productName}>
                                {product.productName || 'Unnamed product'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {(item.batches || []).length} batch{(item.batches || []).length !== 1 ? 'es' : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex max-w-[180px] items-center rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-700">
                            <span className="truncate">{product.sku || 'No SKU'}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex max-w-[180px] items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            <span className="truncate">{formatCategory(product.productCategory)}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <span className="font-semibold text-slate-950">{formatNumber(item.totalQuantity)}</span>
                          <span className="ml-1 text-slate-500">units</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge quantity={item.totalQuantity} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleRow(product._id)}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                            {isExpanded ? 'Hide' : 'View'} Batches
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" className="bg-slate-50 px-5 py-5">
                            <div className="mb-4">
                              <SectionHeader icon={Barcode} title="Batch details" detail={`${product.productName || 'Product'} has ${(item.batches || []).length} tracked batch${(item.batches || []).length !== 1 ? 'es' : ''}.`} tone="slate" />
                            </div>
                            {(item.batches || []).length === 0 ? (
                              <EmptyState icon={Barcode} title="No batch rows for this product" detail="Add supply to create batch-level inventory." />
                            ) : (
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {(item.batches || []).map((batch) => (
                                  <div key={batch.batchId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <h3 className="truncate text-sm font-semibold text-slate-950" title={batch.batchNumber}>
                                          {batch.batchNumber || 'Unnamed batch'}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                          Quantity: <span className="font-semibold text-slate-900">{formatNumber(batch.quantity)}</span>
                                        </p>
                                      </div>
                                      <span className="inline-flex max-w-[180px] items-center rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                                        <span className="truncate">ID: {batch.batchId}</span>
                                      </span>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                      <DetailTile label="Supplier" value={batch.supplier?.fullName || batch.supplier?.companyName || 'N/A'} />
                                      <DetailTile label="Expiry date" value={formatDate(batch.expDate)} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  const renderAddSupplyTab = () => (
    <div className="mx-auto max-w-3xl space-y-4">
      {supplyPrerequisites.length > 0 && (
        <Notice type="warning" title="Supply prerequisites">
          <ul className="list-disc space-y-1 pl-5">
            {supplyPrerequisites.map(item => <li key={item}>{item}</li>)}
          </ul>
        </Notice>
      )}

      <section className={`${panelClass} p-5`}>
        <div className="mb-6">
          <SectionHeader icon={Plus} title="Add inventory supply" detail="Create a batch and item records for an existing product and supplier." />
        </div>
        <form onSubmit={handleAddSupply} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Product</label>
              <select
                value={supplyForm.productId}
                onChange={(e) => setSupplyForm({ ...supplyForm, productId: e.target.value })}
                className={fieldClass}
                disabled={productOptions.length === 0}
              >
                <option value="">{productOptions.length === 0 ? 'No products available' : 'Select product'}</option>
                {productOptions.map(product => (
                  <option key={product._id} value={product._id}>
                    {product.productName} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Supplier</label>
              <select
                value={supplyForm.supplierId}
                onChange={(e) => setSupplyForm({ ...supplyForm, supplierId: e.target.value })}
                className={fieldClass}
                disabled={supplierOptions.length === 0 || suppliersLoading}
              >
                <option value="">
                  {suppliersLoading ? 'Loading suppliers...' : supplierOptions.length === 0 ? 'No suppliers available' : 'Select supplier'}
                </option>
                {supplierOptions.map(supplier => (
                  <option key={supplier.id || supplier._id} value={supplier.id || supplier._id}>
                    {supplier.companyName} - {supplier.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                min="1"
                value={supplyForm.quantity}
                onChange={(e) => setSupplyForm({ ...supplyForm, quantity: e.target.value })}
                className={fieldClass}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              {(selectedSupplyProduct?.costPrice !== undefined || selectedSupplyProduct?.price !== undefined) && (
                <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {selectedSupplyProduct?.costPrice !== undefined && (
                    <span className="mr-3">Cost: <span className="font-semibold text-slate-800">{formatCurrency(selectedSupplyProduct.costPrice)}</span></span>
                  )}
                  {selectedSupplyProduct?.price !== undefined && (
                    <span>Selling: <span className="font-semibold text-slate-800">{formatCurrency(selectedSupplyProduct.price)}</span></span>
                  )}
                </div>
              )}
              <label className={labelClass}>Unit Cost</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={supplyForm.unitCost}
                onChange={(e) => setSupplyForm({ ...supplyForm, unitCost: e.target.value })}
                className={fieldClass}
                placeholder="Enter unit cost"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Manufacturing Date</label>
              <input
                type="date"
                value={supplyForm.mfgDate}
                onChange={(e) => setSupplyForm({ ...supplyForm, mfgDate: e.target.value })}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Expiry Date</label>
              <input
                type="date"
                value={supplyForm.expDate}
                onChange={(e) => setSupplyForm({ ...supplyForm, expDate: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Currency</label>
              <input
                type="text"
                value={supplyForm.currency}
                onChange={(e) => setSupplyForm({ ...supplyForm, currency: e.target.value })}
                className={fieldClass}
                placeholder="INR"
              />
            </div>
            <div>
              <label className={labelClass}>Purchase Order ID (Optional)</label>
              <input
                type="text"
                value={supplyForm.purchaseOrderId}
                onChange={(e) => setSupplyForm({ ...supplyForm, purchaseOrderId: e.target.value })}
                className={fieldClass}
                placeholder="Enter PO ID if any"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes (Optional)</label>
            <textarea
              value={supplyForm.notes}
              onChange={(e) => setSupplyForm({ ...supplyForm, notes: e.target.value })}
              className={fieldClass}
              rows="3"
              placeholder="Enter any additional notes"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setSupplyForm(getDefaultSupplyForm());
                setLocalNotice(null);
              }}
              className={secondaryButtonClass}
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading || supplyPrerequisites.length > 0}
              className={primaryButtonClass}
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              Add Supply
            </button>
          </div>
        </form>
      </section>
    </div>
  );

  const renderMarkDamagedTab = () => (
    <div className="mx-auto max-w-3xl space-y-4">
      {stockedProducts.length === 0 && (
        <Notice type="warning" title="No stock available to mark damaged">
          Add supply for a product first. Damage reports are created against an existing stocked batch.
        </Notice>
      )}

      <section className={`${panelClass} p-5`}>
        <div className="mb-6">
          <SectionHeader icon={AlertTriangle} title="Mark items as damaged" detail="Reduce usable quantity and record estimated loss for a selected batch." tone="red" />
        </div>
        <form onSubmit={handleMarkDamaged} className="space-y-4" noValidate>
          <div>
            <label className={labelClass}>Product</label>
            <select
              value={damagedForm.productId}
              onChange={(e) => setDamagedForm({ ...damagedForm, productId: e.target.value, batchId: '' })}
              className={fieldClass}
              disabled={stockedProducts.length === 0}
            >
              <option value="">{stockedProducts.length === 0 ? 'No stocked products available' : 'Select product'}</option>
              {stockedProducts.map(item => (
                <option key={item.product._id} value={item.product._id}>
                  {item.product.productName} ({item.product.sku}) - Available: {formatNumber(item.totalQuantity)}
                </option>
              ))}
            </select>
          </div>

          {damagedForm.productId && (
            <div>
              <label className={labelClass}>Batch</label>
              <select
                value={damagedForm.batchId}
                onChange={(e) => setDamagedForm({ ...damagedForm, batchId: e.target.value })}
                className={fieldClass}
              >
                <option value="">Select batch</option>
                {availableBatches.map(batch => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.batchNumber} - Qty: {formatNumber(batch.quantity)} - Exp: {formatDate(batch.expDate)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Select a batch from available inventory.</p>
            </div>
          )}

          {damagedForm.batchId && (
            <div>
              <label className={labelClass}>Quantity to Mark as Damaged</label>
              <input
                type="number"
                min="1"
                max={selectedDamageBatch?.quantity || 1}
                value={damagedForm.quantity}
                onChange={(e) => setDamagedForm({ ...damagedForm, quantity: e.target.value })}
                className={fieldClass}
                placeholder="Enter quantity"
              />
              <p className="mt-1 text-xs text-slate-500">
                Maximum available: {formatNumber(selectedDamageBatch?.quantity || 0)}
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>Reason for Damage</label>
            <textarea
              value={damagedForm.reason}
              onChange={(e) => setDamagedForm({ ...damagedForm, reason: e.target.value })}
              className={fieldClass}
              rows="3"
              placeholder="Describe the reason for marking items as damaged"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setDamagedForm(getDefaultDamagedForm());
                setFinancialLoss(null);
                setLocalNotice(null);
              }}
              className={secondaryButtonClass}
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading || stockedProducts.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              <AlertTriangle className="h-4 w-4" />
              Mark as Damaged
            </button>
          </div>
        </form>
        {typeof financialLoss === 'number' && (
          <div className="mt-4">
            <Notice type="warning" title="Estimated financial loss">
              {formatCurrency(financialLoss)}
            </Notice>
          </div>
        )}
      </section>
    </div>
  );

  const renderTrackingTab = () => (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className={`${panelClass} p-5`}>
        <div className="mb-6">
          <SectionHeader icon={Barcode} title="Track batch information" detail="Search by exact batch number or use a recently loaded batch." tone="amber" />
        </div>
        <form onSubmit={handleBatchTracking} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Batch Number</label>
              <input
                type="text"
                value={batchTrackingForm.batchNumber}
                onChange={(e) => setBatchTrackingForm({ batchNumber: e.target.value })}
                className={fieldClass}
                placeholder="e.g. BATCH-1751219198613"
              />
              <p className="mt-1 text-xs text-slate-500">Enter the exact batch number to track.</p>
            </div>

            <div>
              <label className={labelClass}>Quick Select from Recent</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setBatchTrackingForm({ batchNumber: e.target.value });
                  }
                }}
                className={fieldClass}
                disabled={recentBatches.length === 0}
              >
                <option value="">{recentBatches.length === 0 ? 'No recent batches loaded' : 'Select from recent batches'}</option>
                {recentBatches.map(batch => (
                  <option key={batch.batchId} value={batch.batchNumber}>
                    {batch.batchNumber} - {batch.productName}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Recent options appear after inventory batches load.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setBatchTrackingForm({ batchNumber: '' });
                setLocalNotice(null);
              }}
              className={secondaryButtonClass}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading || !batchTrackingForm.batchNumber.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              <Barcode className="h-4 w-4" />
              Track Batch
            </button>
          </div>
        </form>
      </section>

      {batchTracking && (
        <section className={`${panelClass} p-5`}>
          <div className="mb-6">
            <SectionHeader icon={CheckCircle2} title="Batch tracking results" detail="Current batch metadata, quantities, and item status breakdown." tone="emerald" />
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <PackageOpen className="h-4 w-4 text-blue-600" />
                Basic information
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DetailTile label="Batch number" value={batchTracking.batchInfo?.batchNumber} tone="blue" mono />
                <DetailTile label="Product" value={batchTracking.batchInfo?.product?.productName} />
                <DetailTile label="SKU" value={batchTracking.batchInfo?.product?.sku} mono />
                <DetailTile label="Original qty" value={formatNumber(batchTracking.batchInfo?.originalQuantity)} tone="emerald" />
                <DetailTile label="Current qty" value={formatNumber(batchTracking.batchInfo?.currentQuantity)} tone="blue" />
                <DetailTile
                  label="Items used"
                  value={formatNumber((batchTracking.batchInfo?.originalQuantity || 0) - (batchTracking.batchInfo?.currentQuantity || 0))}
                  tone="amber"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Warehouse className="h-4 w-4 text-blue-600" />
                Dates and location
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DetailTile label="Received date" value={formatDate(batchTracking.batchInfo?.receivedAt)} tone="blue" />
                <DetailTile label="Manufacturing date" value={formatDate(batchTracking.batchInfo?.mfgDate)} />
                <DetailTile label="Expiry date" value={formatDate(batchTracking.batchInfo?.expDate)} tone="amber" />
                <DetailTile label="Warehouse" value={batchTracking.batchInfo?.warehouse?.warehouseName} />
                <DetailTile label="Supplier" value={batchTracking.batchInfo?.supplier?.fullName || batchTracking.batchInfo?.supplier?.companyName} />
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <div className="mt-1">
                    {(batchTracking.batchInfo?.currentQuantity || 0) > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Available</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Depleted</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {batchTracking.itemsBreakdown && (
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Item status breakdown
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {Object.entries(batchTracking.itemsBreakdown.statusCounts || {}).map(([status, count]) => (
                    <div key={status} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
                      <p className="text-lg font-semibold text-slate-950">{formatNumber(count)}</p>
                      <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                        {status.replace('_', ' ')}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-sm text-slate-500">
                  Total Items: <span className="font-semibold text-slate-800">{formatNumber(batchTracking.itemsBreakdown.total)}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {realTimeStatus && (
        <section className={`${panelClass} p-5`}>
          <div className="mb-6">
            <SectionHeader icon={Gauge} title="Current inventory overview" detail="Real-time stock health summary from the inventory service." />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard title="Items in stock" value={formatNumber(realTimeStatus.totalInStock)} icon={CheckCircle2} tone="emerald" />
            <MetricCard title="Low stock items" value={formatNumber(realTimeStatus.lowStockItems)} icon={AlertTriangle} tone="amber" />
            <MetricCard title="Out of stock" value={formatNumber(realTimeStatus.outOfStockItems)} icon={XCircle} tone="red" />
          </div>
        </section>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'stock':
        return renderStockTab();
      case 'add-supply':
        return renderAddSupplyTab();
      case 'mark-damaged':
        return renderMarkDamagedTab();
      case 'tracking':
        return renderTrackingTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className={`${panelClass} mb-6 px-5 py-5`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <PackageOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Warehouse operations</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-950">Inventory Management</h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="break-words">User: <span className="font-semibold text-slate-700">{user?.fullName || 'Unknown user'}</span></span>
                  <span className="inline-flex min-w-0 items-center gap-1 break-words">
                    <Warehouse className="h-4 w-4 shrink-0" />
                    {user?.assignedWarehouseId?.warehouseName || 'Warehouse not assigned'}
                  </span>
                </div>
              </div>
            </div>
            {canRefreshInventory && (
              <button
                type="button"
                onClick={() => {
                  dispatch(fetchInventory());
                  dispatch(fetchRealTimeInventoryStatus());
                }}
                className={secondaryButtonClass}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            )}
          </div>
        </section>

        {(localNotice || addSupplyDetails || message || error) && (
          <div className="mb-6 space-y-3">
            {localNotice && (
              <Notice type={localNotice.type} title={localNotice.title} onDismiss={() => setLocalNotice(null)}>
                {localNotice.message}
              </Notice>
            )}
            {addSupplyDetails && (
              <Notice type="success" title={addSupplyDetails.message || 'Supply added to inventory successfully.'} onDismiss={() => setAddSupplyDetails(null)}>
                <div className="grid gap-1 sm:grid-cols-2">
                  <span><b>Batch ID:</b> {addSupplyDetails.batchId || 'N/A'}</span>
                  <span><b>Items Created:</b> {formatNumber(addSupplyDetails.itemsCreated)}</span>
                  <span><b>Total Cost:</b> {formatCurrency(addSupplyDetails.totalCost, addSupplyDetails.currency || 'INR')}</span>
                  {addSupplyDetails.purchaseOrderId && <span><b>Purchase Order ID:</b> {addSupplyDetails.purchaseOrderId}</span>}
                </div>
              </Notice>
            )}
            {message && (
              <Notice type="success" title="Inventory updated">
                {message}
              </Notice>
            )}
            {error && (
              <Notice type="error" title="Inventory error">
                {error}
              </Notice>
            )}
          </div>
        )}

        <nav className="mb-6 rounded-lg border border-slate-200 bg-slate-100 p-1" aria-label="Inventory sections">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Inventory sections">
            {inventoryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  id={getInventoryTabId(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={getInventoryPanelId(tab.id)}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={handleTabKeyDown}
                  className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${isActive
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div
          id={getInventoryPanelId(activeTab)}
          role="tabpanel"
          aria-labelledby={getInventoryTabId(activeTab)}
          tabIndex={0}
          className="outline-none"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white py-20 shadow-sm">
              <LoaderCircle className="h-9 w-9 animate-spin text-blue-700" />
              <p className="mt-4 text-sm font-medium text-slate-600">Loading inventory data...</p>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {renderTabContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
