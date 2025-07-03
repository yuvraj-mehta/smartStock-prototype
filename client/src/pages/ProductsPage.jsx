
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../app/slices/productSlice';
import Navbar from '../components/Navbar';

const ProductsPage = () => {
  const dispatch = useDispatch();
  const { products, loading, error, message } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="bg-white/90 rounded-2xl shadow-xl border border-yellow-200 flex flex-col py-8 px-6 animate-fade-in">
          <h1 className="text-3xl font-extrabold text-yellow-500 mb-4 flex items-center gap-2">
            <span>🛒</span> Products
          </h1>
          {loading && <div className="text-blue-600 font-semibold">Loading products...</div>}
          {error && <div className="text-red-500 font-semibold">{error}</div>}
          {message && !loading && !error && <div className="text-green-600 font-semibold mb-2">{message}</div>}
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <thead className="bg-yellow-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Image</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">SKU</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Price</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Manufacturer</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Threshold</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Shelf Life (days)</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Active</th>
                </tr>
              </thead>
              <tbody>
                {products && products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product._id} className="border-b last:border-b-0 hover:bg-yellow-50 transition">
                      <td className="px-4 py-2">
                        {product.productImage ? (
                          <img src={product.productImage} alt={product.productName} className="w-12 h-12 object-cover rounded shadow" />
                        ) : (
                          <span className="text-gray-400">No Image</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-semibold text-gray-800">{product.productName}</td>
                      <td className="px-4 py-2">{product.sku}</td>
                      <td className="px-4 py-2 capitalize">{product.productCategory}</td>
                      <td className="px-4 py-2">₹{product.price}</td>
                      <td className="px-4 py-2">{product.quantity}</td>
                      <td className="px-4 py-2">{product.unit}</td>
                      <td className="px-4 py-2">{product.manufacturer || '-'}</td>
                      <td className="px-4 py-2">{product.thresholdLimit}</td>
                      <td className="px-4 py-2">{product.shelfLifeDays}</td>
                      <td className="px-4 py-2">
                        {product.isActive ? (
                          <span className="inline-block px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded">Yes</span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded">No</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  !loading && <tr><td colSpan="11" className="text-center py-8 text-gray-400">No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProductsPage;
