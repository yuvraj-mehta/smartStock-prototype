import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllProducts } from '../app/slices/productSlice';

const ProductsPage = () => {

  const dispatch = useDispatch();
  const { products, loading, error, message } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [editProduct, setEditProduct] = useState(null); // product object or null

  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(products?.map(p => p.productCategory).filter(Boolean)));

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Filter products by name/SKU, category, and active status
  const filteredProducts = products?.filter((product) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      product.productName?.toLowerCase().includes(q) ||
      product.sku?.toLowerCase().includes(q);
    const matchesCategory = filterCategory ? product.productCategory === filterCategory : true;
    const matchesActive = filterActive
      ? (filterActive === 'active' ? product.isActive : !product.isActive)
      : true;
    return matchesSearch && matchesCategory && matchesActive;
  }) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 on search/filter change
  useEffect(() => { setPage(1); }, [search, filterCategory, filterActive]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 py-10 relative">
        <section className="glass-card rounded-2xl border border-border shadow-xl flex flex-col py-8 px-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h1 className="text-4xl font-extrabold gradient-text flex items-center gap-3">
              <span className="text-3xl">🛒</span> Products
            </h1>
            <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 justify-end items-center">
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full md:w-60 px-4 py-2 rounded-lg border border-border bg-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 placeholder:text-slate-400 transition"
              />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full md:w-40 px-3 py-2 rounded-lg border border-border bg-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 transition"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
              <select
                value={filterActive}
                onChange={e => setFilterActive(e.target.value)}
                className="w-full md:w-36 px-3 py-2 rounded-lg border border-border bg-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 transition"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {loading && <div className="text-blue-600 font-semibold">Loading products...</div>}
          {error && <div className="text-red-500 font-semibold">{error}</div>}
          {message && !loading && !error && <div className="text-green-600 font-semibold mb-2">{message}</div>}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-stretch">
            {filteredProducts.length === 0 && !loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                <span className="text-6xl mb-4">🗃️</span>
                <div className="text-lg font-semibold mb-1">No products found</div>
                <div className="text-sm">Try adjusting your search or add a new product.</div>
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <div
                  key={product._id}
                  className="glass-card rounded-xl border border-border shadow-md hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 flex flex-col justify-between overflow-hidden group transition-all duration-200 relative h-full min-h-[370px]"
                  title={product.productName}
                >
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center h-40 overflow-hidden">
                    {product.productImage ? (
                      <img
                        src={product.productImage}
                        alt={product.productName}
                        className="object-contain h-36 w-full group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-slate-300 text-5xl">🛒</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-bold text-lg text-slate-800 truncate gradient-text" title={product.productName}>{product.productName}</h2>
                      {product.isActive ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-500 rounded">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mb-1">SKU: <span className="font-mono text-slate-700">{product.sku}</span></div>
                    <div className="text-xs text-slate-400 mb-2 capitalize">{product.productCategory || 'Uncategorized'}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-2">
                      <span>Price: <span className="font-semibold text-blue-700">₹{product.price}</span></span>
                      <span>Qty: <span className="font-semibold">{product.quantity}</span></span>
                      <span>Unit: {product.unit}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-2">
                      <span>Manufacturer: {product.manufacturer || '-'}</span>
                      <span>Threshold: {product.thresholdLimit}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 items-center">
                      <span>Shelf Life: {product.shelfLifeDays} days</span>
                      {/* Edit button for admin only, now inline with shelf life */}
                      {user?.role === 'admin' && (
                        <button
                          className="ml-auto p-1.5 text-purple-600 hover:bg-purple-100 hover:text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300 rounded-full border border-purple-200 shadow-sm transition-all duration-150 relative flex items-center justify-center"
                          title="Edit Product"
                          onClick={() => setEditProduct(product)}
                          aria-label="Edit Product"
                        >
                          {/* Edit/Write (Pen with Paper) icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 3.5a2.121 2.121 0 113 3L7 19.5 3 21l1.5-4L16.5 3.5z" />
                          </svg>
                          <span className="absolute -top-8 right-0 scale-0 group-hover:scale-100 transition bg-slate-800 text-white text-xs rounded px-2 py-1 shadow-lg pointer-events-none">Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {/* Edit Product Modal (admin only) */}
            {editProduct && user?.role === 'admin' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-fade-in">
                  <button
                    className="absolute top-3 right-3 text-slate-400 hover:text-blue-600 text-2xl font-bold"
                    onClick={() => setEditProduct(null)}
                    title="Close"
                  >
                    ×
                  </button>
                  <h2 className="text-2xl font-bold mb-4 gradient-text">Edit Product</h2>
                  <form
                    onSubmit={e => { e.preventDefault(); /* Edit Product feature coming soon! */ }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold mb-1">Name</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.productName} readOnly />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">SKU</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.sku} readOnly />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold mb-1">Price</label>
                        <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.price} readOnly />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold mb-1">Quantity</label>
                        <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.quantity} readOnly />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Category</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.productCategory} readOnly />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold mb-1">Unit</label>
                        <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.unit} readOnly />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold mb-1">Threshold</label>
                        <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.thresholdLimit} readOnly />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Manufacturer</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.manufacturer || ''} readOnly />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold mb-1">Shelf Life (days)</label>
                        <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.shelfLifeDays} readOnly />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold mb-1">Active</label>
                        <input className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50" value={editProduct.isActive ? 'Yes' : 'No'} readOnly />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-4 py-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold shadow hover:scale-105 hover:shadow-lg transition-all duration-150"
                      disabled
                    >
                      Save Changes (Coming Soon)
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold border border-border shadow hover:bg-blue-100 disabled:opacity-50"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`px-3 py-1 rounded-lg font-semibold border border-border shadow transition-all duration-150 ${p === page ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white scale-110' : 'bg-slate-100 text-slate-600 hover:bg-blue-100'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold border border-border shadow hover:bg-blue-100 disabled:opacity-50"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </section>
        {/* Floating Add Product Button */}
        <button
          className="fixed bottom-8 right-8 z-50 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-200 w-16 h-16 flex items-center justify-center text-3xl border-4 border-white/60"
          title="Add Product"
          onClick={() => {/* Add Product feature coming soon! */ }}
        >
          +
        </button>
      </main>
    </div>
  );
};

export default ProductsPage;
