import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CpuChipIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const DemandForecast = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecasting, setForecasting] = useState(false);
  const [forecastParams, setForecastParams] = useState({
    periodType: 'monthly',
    daysBack: 90
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }

      console.log('Fetching products with token:', token ? 'Token exists' : 'No token');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/product/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Products API response:', data); // Debug log

        // Handle different response formats
        const productsArray = data.products || data.data || data || [];
        console.log('Extracted products array:', productsArray);

        setProducts(productsArray);

        if (productsArray.length === 0) {
          setError('No products found in the database. Please add some products first.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch products:', response.status, errorData);

        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          setError('Access denied. You need admin or staff permissions to view products.');
        } else {
          setError(`Failed to fetch products: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Network error while fetching products. Check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const generateForecast = async () => {
    if (!selectedProduct) {
      setError('Please select a product first');
      return;
    }

    try {
      setForecasting(true);
      setError(null);

      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }

      console.log('Generating forecast for product:', selectedProduct);
      console.log('Forecast params:', forecastParams);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ai/forecast/demand`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: selectedProduct,
          ...forecastParams
        })
      });

      console.log('Forecast response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Forecast API error:', errorData);
        throw new Error(errorData.message || `Failed to generate forecast (${response.status})`);
      }

      const data = await response.json();
      console.log('Forecast response data:', data);

      // Check if the response has the expected structure
      if (data.success && data.data) {
        setForecastData(data.data);
      } else if (data.forecast) {
        setForecastData(data);
      } else {
        setForecastData(data);
      }
    } catch (err) {
      console.error('Forecast generation error:', err);
      setError(err.message);
    } finally {
      setForecasting(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <ChartBarIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Demand Forecasting</h1>
          <p className="text-gray-600">Generate intelligent demand predictions using ChatGPT</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Debug Info (temporary) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Debug Info</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Products loaded: {products.length}</p>
          <p>Selected product: {selectedProduct || 'None'}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Token available: {localStorage.getItem('token') ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Forecast Configuration */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Forecast Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Product {loading && "(Loading...)"}
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">
                {loading ? "Loading products..." : products.length === 0 ? "No products available" : "Choose a product..."}
              </option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.productName} ({product.sku})
                </option>
              ))}
            </select>
            {products.length === 0 && !loading && (
              <p className="text-sm text-red-600 mt-1">No products found. Check your permissions.</p>
            )}
          </div>

          {/* Period Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forecast Period
            </label>
            <select
              value={forecastParams.periodType}
              onChange={(e) => setForecastParams({ ...forecastParams, periodType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {/* Historical Data Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Historical Data (Days)
            </label>
            <select
              value={forecastParams.daysBack}
              onChange={(e) => setForecastParams({ ...forecastParams, daysBack: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={generateForecast}
            disabled={!selectedProduct || forecasting}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {forecasting ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Generating Forecast...</span>
              </>
            ) : (
              <>
                <CpuChipIcon className="w-4 h-4" />
                <span>Generate AI Forecast</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <span className="ml-2 text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Forecast Results */}
      {forecastData && (
        <div className="space-y-6">
          {/* Forecast Summary */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Summary</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-center">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Forecast Quantity</p>
                    <p className="text-xl font-bold text-blue-900">
                      {forecastData.aiResponse?.forecast30Days?.quantity || 0} units
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-md">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Confidence Level</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-green-900">
                        {forecastData.aiResponse?.forecast30Days?.confidence || 0}%
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getConfidenceColor(forecastData.aiResponse?.forecast30Days?.confidence || 0)}`}>
                        {forecastData.aiResponse?.forecast30Days?.confidence >= 80 ? 'High' :
                          forecastData.aiResponse?.forecast30Days?.confidence >= 60 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-md">
                <div className="flex items-center">
                  <CalendarIcon className="w-6 h-6 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-600">Reorder Point</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {forecastData.forecast?.recommendations?.reorderPoint || 0} units
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-md">
                <div className="flex items-center">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Safety Stock</p>
                    <p className="text-xl font-bold text-purple-900">
                      {forecastData.forecast?.recommendations?.safetyStock || 0} units
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Factors */}
          {forecastData.aiResponse?.keyFactors && forecastData.aiResponse.keyFactors.length > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Influencing Factors</h3>
              <div className="space-y-3">
                {forecastData.aiResponse.keyFactors.map((factor, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <p className="text-gray-700">{factor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Stockout Risk</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(forecastData.forecast?.riskAssessment?.stockoutRisk)}`}>
                    {forecastData.forecast?.riskAssessment?.stockoutRisk || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Overstock Risk</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(forecastData.forecast?.riskAssessment?.overStockRisk)}`}>
                    {forecastData.forecast?.riskAssessment?.overStockRisk || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Market Risk</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(forecastData.forecast?.riskAssessment?.marketRisk)}`}>
                    {forecastData.forecast?.riskAssessment?.marketRisk || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {forecastData.aiResponse?.recommendations && forecastData.aiResponse.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h3>
              <div className="space-y-3">
                {forecastData.aiResponse.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-md">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forecast Metadata */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Generated:</span> {new Date(forecastData.forecast?.createdAt).toLocaleString()}</p>
              <p><span className="font-medium">Model:</span> {forecastData.forecast?.aiPrediction?.predictionModel || 'GPT-3.5-Turbo'}</p>
              <p><span className="font-medium">Forecast ID:</span> {forecastData.forecast?._id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandForecast;
