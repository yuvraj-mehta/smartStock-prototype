import React, { useCallback, useEffect, useState } from 'react';
import {
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CpuChipIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { aiAPI, productAPI } from '../../services/api';

const getApiErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.message || fallback
);

const DemandForecast = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecasting, setForecasting] = useState(false);
  const [forecastParams, setForecastParams] = useState({
    periodType: 'monthly',
    daysBack: 90,
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.getAllProducts();
      const data = response.data;
      const productsArray = data.products || data.data || data || [];
      const normalizedProducts = Array.isArray(productsArray) ? productsArray : [];

      setProducts(normalizedProducts);

      if (normalizedProducts.length === 0) {
        setError('No products found in the database. Please add some products first.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Network error while fetching products. Check if the server is running.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const generateForecast = async () => {
    if (!selectedProduct) {
      setError('Please select a product first');
      return;
    }

    try {
      setForecasting(true);
      setError(null);

      const response = await aiAPI.generateDemandForecast({
        productId: selectedProduct,
        ...forecastParams,
      });
      const data = response.data;

      // Check if the response has the expected structure
      if (data.success && data.data) {
        setForecastData(data.data);
      } else if (data.forecast) {
        setForecastData(data);
      } else {
        setForecastData(data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate forecast.'));
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
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-blue-50 p-2 text-blue-600">
          <ChartBarIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Demand Forecasting</h1>
          <p className="text-sm text-slate-600">Forecast product demand from recent order and inventory signals.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="mr-2 h-5 w-5 text-rose-600" />
            <p className="text-rose-800">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Forecast Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Select Product {loading && '(Loading...)'}
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {loading ? 'Loading products...' : products.length === 0 ? 'No products available' : 'Choose a product...'}
              </option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.productName} ({product.sku})
                </option>
              ))}
            </select>
            {products.length === 0 && !loading && (
              <p className="mt-1 text-sm text-rose-600">No products found. Check your permissions.</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Forecast Period
            </label>
            <select
              value={forecastParams.periodType}
              onChange={(e) => setForecastParams({ ...forecastParams, periodType: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Historical Data (Days)
            </label>
            <select
              value={forecastParams.daysBack}
              onChange={(e) => setForecastParams({ ...forecastParams, daysBack: parseInt(e.target.value, 10) })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={generateForecast}
            disabled={!selectedProduct || forecasting}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {forecastData && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">Forecast Summary</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-700">Forecast Quantity</p>
                    <p className="text-xl font-bold text-blue-900">
                      {forecastData.aiResponse?.forecast30Days?.quantity || 0} units
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-emerald-700">Confidence Level</p>
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

              <div className="rounded-md border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center">
                  <CalendarIcon className="w-6 h-6 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-amber-700">Reorder Point</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {forecastData.forecast?.recommendations?.reorderPoint || 0} units
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-cyan-100 bg-cyan-50 p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="w-6 h-6 text-cyan-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-cyan-700">Safety Stock</p>
                    <p className="text-xl font-bold text-cyan-900">
                      {forecastData.forecast?.recommendations?.safetyStock || 0} units
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {forecastData.aiResponse?.keyFactors && forecastData.aiResponse.keyFactors.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-950">Key Influencing Factors</h3>
              <div className="space-y-3">
                {forecastData.aiResponse.keyFactors.map((factor, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <p className="text-slate-700">{factor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">Risk Assessment</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Stockout Risk</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(forecastData.forecast?.riskAssessment?.stockoutRisk)}`}>
                    {forecastData.forecast?.riskAssessment?.stockoutRisk || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Overstock Risk</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(forecastData.forecast?.riskAssessment?.overStockRisk)}`}>
                    {forecastData.forecast?.riskAssessment?.overStockRisk || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Market Risk</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(forecastData.forecast?.riskAssessment?.marketRisk)}`}>
                    {forecastData.forecast?.riskAssessment?.marketRisk || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {forecastData.aiResponse?.recommendations && forecastData.aiResponse.recommendations.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-950">Recommendations</h3>
              <div className="space-y-3">
                {forecastData.aiResponse.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-3">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-slate-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-1 text-sm text-slate-600">
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
