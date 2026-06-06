import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  PackagePlus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { getAllProducts, createProduct, updateProduct, deleteProduct, clearProductMessages } from '../../../app/slices/productSlice';
import './ProductManagement.css';

const DIMENSION_FIELDS = [
  { key: 'length', label: 'Length' },
  { key: 'breadth', label: 'Breadth' },
  { key: 'height', label: 'Height' },
];

const emptyFormData = {
  productName: '',
  sku: '',
  price: 0,
  manufacturer: '',
  productCategory: '',
  unit: 'piece',
  productImage: '',
  weight: 0,
  dimension: {
    length: 0,
    breadth: 0,
    height: 0,
  },
  thresholdLimit: 0,
  shelfLifeDays: 0,
  isActive: true,
};

const isPositiveNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
};

const validateProductForm = (data) => {
  if (!String(data.manufacturer || '').trim()) {
    return 'Manufacturer is required.';
  }

  if (!String(data.productCategory || '').trim()) {
    return 'Product category is required.';
  }

  const invalidDimension = DIMENSION_FIELDS.find(({ key }) => !isPositiveNumber(data.dimension?.[key]));
  if (invalidDimension) {
    return `${invalidDimension.label} must be greater than 0.`;
  }

  return '';
};

const buildProductPayload = (data) => ({
  ...data,
  manufacturer: String(data.manufacturer || '').trim(),
  productCategory: String(data.productCategory || '').trim(),
  dimension: {
    length: Number(data.dimension.length),
    breadth: Number(data.dimension.breadth),
    height: Number(data.dimension.height),
  },
  isActive: Boolean(data.isActive),
});

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

const ProductManagement = ({ triggerAction }) => {
  const dispatch = useDispatch();
  const { products = [], loading, error, message } = useSelector((state) => state.products);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(emptyFormData);
  const productDialogRef = useRef(null);
  const deleteDialogRef = useRef(null);

  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  useEffect(() => {
    if (triggerAction === 'create') {
      openCreateModal();
    }
  }, [triggerAction]);

  useEffect(() => {
    if (message || error) {
      dispatch(clearProductMessages());
    }
  }, [message, error, dispatch]);

  const stats = useMemo(() => {
    const active = products.filter(product => product.isActive).length;
    const categories = new Set(products.map(product => product.productCategory).filter(Boolean)).size;

    return {
      total: products.length,
      active,
      inactive: products.length - active,
      categories,
    };
  }, [products]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormError('');

    if (name.startsWith('dimension.')) {
      const dimensionKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimension: {
          ...prev.dimension,
          [dimensionKey]: type === 'number' ? parseFloat(value) || 0 : value,
        },
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'isActive'
        ? value === 'true'
        : type === 'number'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const resetForm = () => {
    setFormData(emptyFormData);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormError('');
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormError('');
    setFormData({
      productName: product.productName || '',
      productImage: product.productImage || '',
      unit: product.unit || '',
      manufacturer: product.manufacturer || '',
      productCategory: product.productCategory || '',
      sku: product.sku || '',
      price: product.price || 0,
      weight: product.weight || 0,
      dimension: {
        length: product.dimension?.length ?? 0,
        breadth: product.dimension?.breadth ?? 0,
        height: product.dimension?.height ?? 0,
      },
      thresholdLimit: product.thresholdLimit || 0,
      shelfLifeDays: product.shelfLifeDays || 0,
      isActive: product.isActive !== undefined ? product.isActive : true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormError('');
    resetForm();
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    const validationError = validateProductForm(formData);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    const productPayload = buildProductPayload(formData);
    const fallbackError = editingProduct ? 'Failed to update product' : 'Failed to create product';

    try {
      let result;
      if (editingProduct) {
        result = await dispatch(updateProduct(editingProduct._id, productPayload));
      } else {
        result = await dispatch(createProduct(productPayload));
      }

      if (!result?.success) {
        setFormError(result?.error || fallbackError);
        return;
      }

      closeModal();
    } catch (err) {
      console.error('Product operation error:', err);
      setFormError(err.message || fallbackError);
    }
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await dispatch(deleteProduct(productToDelete._id));
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (err) {
      console.error('Delete product error:', err);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  const handleRefresh = () => {
    dispatch(getAllProducts());
  };

  useEffect(() => {
    if (!showModal && !showDeleteModal) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      if (showDeleteModal) {
        setShowDeleteModal(false);
        setProductToDelete(null);
        return;
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormError('');
      resetForm();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showDeleteModal]);

  useEffect(() => {
    if (showModal) {
      productDialogRef.current?.focus();
    } else if (showDeleteModal) {
      deleteDialogRef.current?.focus();
    }
  }, [showModal, showDeleteModal]);

  if (loading && !products.length) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
        Loading products...
      </div>
    );
  }

  if (error && !products.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          onClick={handleRefresh}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="product-management">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Catalog administration</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Product Management</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Maintain SKU definitions, pricing, product dimensions, shelf-life rules, and activation status.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
            onClick={openCreateModal}
          >
            <PackagePlus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Products</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.total}</p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{stats.active}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Inactive</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{stats.inactive}</p>
        </div>
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Categories</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{stats.categories}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Dimensions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rules</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product._id} className="transition hover:bg-slate-50">
                  <td className="max-w-[320px] px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-[160px] rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <span className="truncate">{formatCategory(product.productCategory)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-950">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {(product.dimension?.length ?? 0)} x {(product.dimension?.breadth ?? 0)} x {(product.dimension?.height ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <p>Unit: <span className="font-medium text-slate-800">{product.unit || '-'}</span></p>
                    <p>Threshold: <span className="font-medium text-slate-800">{product.thresholdLimit ?? '-'}</span></p>
                    <p>Shelf life: <span className="font-medium text-slate-800">{product.shelfLifeDays ?? '-'} days</span></p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
                      {product.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => openEditModal(product)}
                        title="Edit product"
                        aria-label={`Edit ${product.productName}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleDeleteProduct(product)}
                        title="Delete product"
                        aria-label={`Delete ${product.productName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <PackagePlus className="h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-base font-semibold text-slate-950">No products found</h3>
            <p className="mt-1 text-sm text-slate-500">Add your first product to start building the catalog.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 px-4 py-6">
          <div
            ref={productDialogRef}
            className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-dialog-title"
            aria-describedby="product-form-dialog-description"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 id="product-form-dialog-title" className="text-lg font-semibold text-slate-950">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
                <p id="product-form-dialog-description" className="mt-1 text-sm text-slate-500">Keep product metadata complete so inventory and finance flows stay traceable.</p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                onClick={closeModal}
                aria-label="Close product form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Product Name *</span>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">SKU *</span>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Product Category *</span>
                  <select
                    name="productCategory"
                    value={formData.productCategory}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="electronics">Electronics</option>
                    <option value="apparel">Apparel</option>
                    <option value="decor">Decor</option>
                    <option value="furniture">Furniture</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Manufacturer *</span>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Unit *</span>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Price *</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Weight (kg)</span>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Product Image URL *</span>
                  <input
                    type="url"
                    name="productImage"
                    value={formData.productImage}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Threshold Limit</span>
                  <input
                    type="number"
                    name="thresholdLimit"
                    value={formData.thresholdLimit}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Shelf Life (days)</span>
                  <input
                    type="number"
                    name="shelfLifeDays"
                    value={formData.shelfLifeDays}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Status</span>
                  <select
                    name="isActive"
                    value={String(formData.isActive)}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800">Dimensions *</h4>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  {DIMENSION_FIELDS.map(({ key, label }) => (
                    <label key={key} className="block">
                      <span className="text-sm font-semibold text-slate-700">{label} *</span>
                      <input
                        type="number"
                        name={`dimension.${key}`}
                        value={formData.dimension[key]}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0.01"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {formError}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div
            ref={deleteDialogRef}
            className="w-full max-w-md rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-delete-dialog-title"
            aria-describedby="product-delete-dialog-description"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="product-delete-dialog-title" className="text-lg font-semibold text-slate-950">Delete product</h3>
                  <p id="product-delete-dialog-description" className="mt-1 text-sm text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                onClick={cancelDelete}
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-slate-600">
                Delete <span className="font-semibold text-slate-950">{productToDelete?.productName}</span> from the catalog?
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
