import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  CheckCircle2,
  Edit3,
  Filter,
  PackagePlus,
  Search,
  XCircle,
} from 'lucide-react';
import { getAllProducts } from '../app/slices/productSlice';
import { ROUTES, USER_ROLES } from '../constants';

const PAGE_SIZE = 10;

const getDialogFocusableElements = (container) => (
  Array.from(container?.querySelectorAll(
    [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', '),
  ) || [])
);

const formatCurrency = (value) => (
  Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
);

const formatCategory = (category) => (
  category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Uncategorized'
);

const statusClassName = (isActive) => (
  isActive
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
);

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const ProductsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products = [], loading, error, message } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);
  const canManageProducts = normalizeRole(user?.role) === USER_ROLES.ADMIN;

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [editProduct, setEditProduct] = useState(null);
  const [page, setPage] = useState(1);
  const productSummaryDialogRef = useRef(null);
  const productSummaryPreviousFocusRef = useRef(null);

  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  const categories = useMemo(() => (
    Array.from(new Set(products.map(product => product.productCategory).filter(Boolean))).sort()
  ), [products]);

  const productStats = useMemo(() => {
    const active = products.filter(product => product.isActive).length;
    return {
      total: products.length,
      active,
      inactive: products.length - active,
      categories: categories.length,
    };
  }, [categories.length, products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch = !query ||
        product.productName?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.manufacturer?.toLowerCase().includes(query);
      const matchesCategory = filterCategory ? product.productCategory === filterCategory : true;
      const matchesActive = filterActive
        ? (filterActive === 'active' ? product.isActive : !product.isActive)
        : true;

      return matchesSearch && matchesCategory && matchesActive;
    });
  }, [filterActive, filterCategory, products, search]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterActive]);

  const handleAddProduct = () => {
    navigate(`${ROUTES.ADMIN}?tab=products&action=create`);
  };

  const handleOpenManagement = () => {
    navigate(`${ROUTES.ADMIN}?tab=products`);
  };

  useEffect(() => {
    if (!editProduct) {
      return undefined;
    }

    productSummaryPreviousFocusRef.current = document.activeElement;
    const focusableElements = getDialogFocusableElements(productSummaryDialogRef.current);
    (focusableElements[0] || productSummaryDialogRef.current)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setEditProduct(null);
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getDialogFocusableElements(productSummaryDialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        productSummaryDialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (productSummaryPreviousFocusRef.current instanceof HTMLElement) {
        productSummaryPreviousFocusRef.current.focus();
      }
    };
  }, [editProduct]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Boxes className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold text-slate-950">Product Catalog</h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Operational product records, SKU metadata, pricing, and activation status.
                    </p>
                  </div>
                </div>
              </div>

              {canManageProducts && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={handleAddProduct}
                >
                  <PackagePlus className="h-4 w-4" />
                  Add Product
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Records</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{productStats.total}</p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Active</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-800">{productStats.active}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Inactive</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{productStats.inactive}</p>
              </div>
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Categories</p>
                <p className="mt-1 text-2xl font-semibold text-indigo-800">{productStats.categories}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_180px]">
              <label className="relative block">
                <span className="sr-only">Search products</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product, SKU, or manufacturer"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="relative block">
                <span className="sr-only">Filter by category</span>
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={filterCategory}
                  onChange={event => setFilterCategory(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{formatCategory(category)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">Filter by status</span>
                <select
                  value={filterActive}
                  onChange={event => setFilterActive(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </div>

          {loading && (
            <div role="status" aria-live="polite" className="px-5 py-4 text-sm font-medium text-blue-700">Loading product records...</div>
          )}
          {error && (
            <div role="alert" className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
          )}
          {message && !loading && !error && (
            <div role="status" aria-live="polite" className="mx-5 mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>
          )}

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Price</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stock Rules</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  {canManageProducts && (
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedProducts.map((product) => (
                  <tr key={product._id} className="transition hover:bg-slate-50">
                    <td className="max-w-[340px] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Boxes className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950" title={product.productName}>
                            {product.productName || 'Unnamed product'}
                          </p>
                          <p className="mt-1 truncate font-mono text-xs text-slate-500" title={product.sku}>
                            {product.sku || 'No SKU'}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500" title={product.manufacturer}>
                            {product.manufacturer || 'No manufacturer'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex max-w-[180px] items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <span className="truncate">{formatCategory(product.productCategory)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-950">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        <p className="truncate">Unit: <span className="font-medium text-slate-800">{product.unit || '-'}</span></p>
                        <p className="truncate">Threshold: <span className="font-medium text-slate-800">{product.thresholdLimit ?? '-'}</span></p>
                        <p className="truncate">Shelf life: <span className="font-medium text-slate-800">{product.shelfLifeDays ?? '-'} days</span></p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(product.isActive)}`}>
                        {product.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManageProducts && (
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          title="View product management options"
                          onClick={() => setEditProduct(product)}
                        >
                          <Edit3 className="h-4 w-4" />
                          Manage
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {paginatedProducts.map((product) => (
              <article key={product._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-semibold text-slate-950">{product.productName || 'Unnamed product'}</h2>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">{product.sku || 'No SKU'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(product.isActive)}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</dt>
                    <dd className="mt-1 break-words font-medium text-slate-800">{formatCategory(product.productCategory)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Price</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{formatCurrency(product.price)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Threshold</dt>
                    <dd className="mt-1 font-medium text-slate-800">{product.thresholdLimit ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Shelf Life</dt>
                    <dd className="mt-1 font-medium text-slate-800">{product.shelfLifeDays ?? '-'} days</dd>
                  </div>
                </dl>
                {canManageProducts && (
                  <button
                    type="button"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    onClick={() => setEditProduct(product)}
                  >
                    <Edit3 className="h-4 w-4" />
                    Manage Product
                  </button>
                )}
              </article>
            ))}
          </div>

          {filteredProducts.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <Boxes className="h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-base font-semibold text-slate-900">No products found</h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Adjust the search or filters, or add a new product from the admin product management area.
              </p>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-800">{paginatedProducts.length}</span> of{' '}
                <span className="font-medium text-slate-800">{filteredProducts.length}</span> products
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage(currentPage => currentPage - 1)}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage(currentPage => currentPage + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {editProduct && canManageProducts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
            <div
              ref={productSummaryDialogRef}
              className="w-full max-w-xl rounded-lg bg-white shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-summary-dialog-title"
              aria-describedby="product-summary-dialog-description"
              tabIndex={-1}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div className="min-w-0">
                  <h2 id="product-summary-dialog-title" className="truncate text-lg font-semibold text-slate-950">{editProduct.productName}</h2>
                  <p id="product-summary-dialog-description" className="mt-1 break-all font-mono text-xs text-slate-500">{editProduct.sku}</p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  onClick={() => setEditProduct(null)}
                  aria-label="Close product summary"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Price</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrency(editProduct.price)}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{editProduct.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Manufacturer</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-950">{editProduct.manufacturer || '-'}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-950">{formatCategory(editProduct.productCategory)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setEditProduct(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                  onClick={handleOpenManagement}
                >
                  <Edit3 className="h-4 w-4" />
                  Open Product Management
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
