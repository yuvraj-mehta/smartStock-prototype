import React, { useState } from "react";
import { FaBoxOpen, FaMapMarkerAlt, FaDollarSign, FaExclamationTriangle, FaArrowUp, FaArrowDown, FaChartLine } from "react-icons/fa";

// Hardcoded inventory data (structure based on backend grouping)
const inventoryData = [
  {
    product: {
      productName: "Apple iPhone 15 Pro",
      sku: "IPH15PRO",
      price: 79999,
      unit: "piece",
      productCategory: "electronics",
    },
    totalQuantity: 5,
    batches: [
      {
        batchId: "b1",
        batchNumber: "BATCH-20240701",
        supplier: {
          fullName: "Tech Distributors",
          companyName: "Tech Distributors Pvt Ltd",
        },
        quantity: 2,
        mfgDate: "2025-06-01",
        expDate: "2027-06-01",
        warehouse: {
          warehouseName: "Main Warehouse",
          address: { city: "Mumbai", state: "MH" },
        },
      },
      {
        batchId: "b2",
        batchNumber: "BATCH-20240702",
        supplier: { fullName: "Gadget World", companyName: "Gadget World Ltd" },
        quantity: 3,
        mfgDate: "2025-06-10",
        expDate: "2027-06-10",
        warehouse: {
          warehouseName: "Secondary Warehouse",
          address: { city: "Pune", state: "MH" },
        },
      },
    ],
  },
  {
    product: {
      productName: "Wooden Chair",
      sku: "WDNCHR01",
      price: 2999,
      unit: "piece",
      productCategory: "furniture",
    },
    totalQuantity: 20,
    batches: [
      {
        batchId: "b3",
        batchNumber: "BATCH-20240615",
        supplier: { fullName: "FurniCo", companyName: "FurniCo Pvt Ltd" },
        quantity: 20,
        mfgDate: "2025-05-01",
        expDate: "2028-05-01",
        warehouse: {
          warehouseName: "Furniture Warehouse",
          address: { city: "Delhi", state: "DL" },
        },
      },
    ],
  },
  {
    product: {
      productName: "Notebook A4",
      sku: "NBA4001",
      price: 49,
      unit: "piece",
      productCategory: "stationery",
    },
    totalQuantity: 500,
    batches: [
      {
        batchId: "b4",
        batchNumber: "BATCH-20240703",
        supplier: { fullName: "Paper Suppliers", companyName: "Paper Suppliers Ltd" },
        quantity: 500,
        mfgDate: "2025-06-15",
        expDate: "2028-06-15",
        warehouse: { warehouseName: "Main Warehouse", address: { city: "Mumbai", state: "MH" } },
      },
    ],
  },
  {
    product: {
      productName: "Wireless Mouse",
      sku: "WMOUSE01",
      price: 1299,
      unit: "piece",
      productCategory: "electronics",
    },
    totalQuantity: 40,
    batches: [
      {
        batchId: "b5",
        batchNumber: "BATCH-20240704",
        supplier: { fullName: "Gadget World", companyName: "Gadget World Ltd" },
        quantity: 40,
        mfgDate: "2025-06-20",
        expDate: "2027-06-20",
        warehouse: { warehouseName: "Main Warehouse", address: { city: "Mumbai", state: "MH" } },
      },
    ],
  },
  {
    product: {
      productName: "USB Cable Type-C",
      sku: "USBC01",
      price: 299,
      unit: "piece",
      productCategory: "electronics",
    },
    totalQuantity: 30,
    batches: [
      {
        batchId: "b6",
        batchNumber: "BATCH-20240705",
        supplier: { fullName: "Cable Co", companyName: "Cable Co Pvt Ltd" },
        quantity: 30,
        mfgDate: "2025-06-25",
        expDate: "2027-06-25",
        warehouse: { warehouseName: "Downtown Store", address: { city: "Pune", state: "MH" } },
      },
    ],
  },
  {
    product: {
      productName: "Office Chair",
      sku: "OFFCHR01",
      price: 7999,
      unit: "piece",
      productCategory: "furniture",
    },
    totalQuantity: 30,
    batches: [
      {
        batchId: "b7",
        batchNumber: "BATCH-20240706",
        supplier: { fullName: "FurniCo", companyName: "FurniCo Pvt Ltd" },
        quantity: 30,
        mfgDate: "2025-05-10",
        expDate: "2028-05-10",
        warehouse: { warehouseName: "Main Warehouse", address: { city: "Mumbai", state: "MH" } },
      },
    ],
  },
];

// Hardcoded dashboard/alert data for demo
const dashboardStats = [
  {
    label: "Total Products",
    value: 6,
    icon: (
      <FaBoxOpen className="text-blue-500 text-2xl" />
    ),
    change: "+5%",
    changeType: "up",
    sub: "vs last month",
  },
  {
    label: "Locations",
    value: 3,
    icon: (
      <FaMapMarkerAlt className="text-blue-500 text-2xl" />
    ),
    change: "+2%",
    changeType: "up",
    sub: "vs last month",
  },
  {
    label: "Total Value",
    value: "$1,713,593.87",
    icon: (
      <FaDollarSign className="text-blue-500 text-2xl" />
    ),
    change: "+12%",
    changeType: "up",
    sub: "vs last month",
  },
  {
    label: "Low Stock Items",
    value: 0,
    icon: (
      <FaExclamationTriangle className="text-yellow-500 text-2xl" />
    ),
    change: "-8%",
    changeType: "down",
    sub: "vs last month",
    highlight: "bg-yellow-50 border-yellow-200",
  },
  {
    label: "Critical Alerts",
    value: 0,
    icon: (
      <FaExclamationTriangle className="text-red-500 text-2xl" />
    ),
    change: "-3%",
    changeType: "down",
    sub: "vs last month",
    highlight: "bg-red-50 border-red-200",
  },
];

const topProducts = [
  {
    name: "Office Chair",
    location: "Main Warehouse",
    units: 8097,
    value: 1619319.03,
    unitPrice: 199.99,
  },
  {
    name: "Notebook A4",
    location: "Main Warehouse",
    units: 10090,
    value: 50349.1,
    unitPrice: 4.99,
  },
  {
    name: "Wireless Mouse",
    location: "Main Warehouse",
    units: 1265,
    value: 37937.35,
    unitPrice: 29.99,
  },
  {
    name: "USB Cable Type-C",
    location: "Downtown Store",
    units: 345,
    value: 4481.55,
    unitPrice: 12.99,
  },
  {
    name: "USB Cable Type-C",
    location: "Main Warehouse",
    units: 116,
    value: 1506.84,
    unitPrice: 12.99,
  },
];

const alerts = [
  {
    msg: "Stock level is below reorder point for Wireless Mouse at Main Warehouse",
    date: "26/06/2025",
    severity: "medium",
  },
  {
    msg: "Stock level is below reorder point for USB Cable Type-C at Main Warehouse",
    date: "26/06/2025",
    severity: "medium",
  },
  {
    msg: "Stock level is below reorder point for Office Chair at Main Warehouse",
    date: "26/06/2025",
    severity: "medium",
  },
  {
    msg: "Stock level is below reorder point for Notebook A4 at Main Warehouse",
    date: "26/06/2025",
    severity: "medium",
  },
];

const stockOverview = [
  { label: "Healthy Stock", value: 4, color: "bg-blue-500" },
  { label: "Low Stock", value: 0, color: "bg-yellow-400" },
  { label: "Out of Stock", value: 0, color: "bg-red-400" },
];

const getSummary = (data) => {
  let totalProducts = data.length;
  let totalBatches = 0;
  let totalStock = 0;
  data.forEach((entry) => {
    totalBatches += entry.batches.length;
    totalStock += entry.totalQuantity;
  });
  return { totalProducts, totalBatches, totalStock };
};

// Helper to calculate total value
const getTotalValue = (data) => {
  let total = 0;
  data.forEach((entry) => {
    total += (entry.product.price || 0) * (entry.totalQuantity || 0);
  });
  return total;
};

// Helper to calculate low stock count (example: threshold < 50)
const getLowStockCount = (data, threshold = 50) => {
  return data.filter(entry => entry.totalQuantity < threshold).length;
};
// Helper to calculate healthy and out of stock counts
const getHealthyStockCount = (data, threshold = 50) => {
  return data.filter(entry => entry.totalQuantity >= threshold).length;
};
const getOutOfStockCount = (data) => {
  return data.filter(entry => entry.totalQuantity === 0).length;
};

const InventoryPage = () => {
  const [expanded, setExpanded] = useState(null);
  const handleExpand = (sku) => {
    setExpanded((prev) => (prev === sku ? null : sku));
  };
  const summary = getSummary(inventoryData);
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb]">
      <main className="flex-1 w-full px-0 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-2 md:px-8">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-1 md:mb-2">
            Inventory Overview
          </h1>
          <div className="text-slate-500 mb-6 md:mb-10">
            Monitor your inventory performance and key metrics
          </div>
        </div>
        {/* Inventory Summary */}
        <div className="max-w-7xl mx-auto px-2 md:px-8 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
          {/* Total Products */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-col gap-2 shadow-sm relative">
            <span className="text-slate-600 font-semibold text-base">Total Products</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-slate-900">{summary.totalProducts}</span>
              <span className="absolute top-6 right-6 bg-white rounded-full p-2 shadow"><FaBoxOpen className="text-blue-500 text-xl" /></span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-xs"><FaArrowUp className="inline text-xs" />5%</span>
              <span className="text-slate-400 text-xs">vs last month</span>
            </div>
          </div>
          {/* Total Value */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-col gap-2 shadow-sm relative">
            <span className="text-slate-600 font-semibold text-base">Total Value</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-slate-900">₹{getTotalValue(inventoryData).toLocaleString()}</span>
              <span className="absolute top-6 right-6 bg-white rounded-full p-2 shadow"><FaChartLine className="text-blue-500 text-xl" /></span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-xs"><FaArrowUp className="inline text-xs" />12%</span>
              <span className="text-slate-400 text-xs">vs last month</span>
            </div>
          </div>
          {/* Total Stock */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-col gap-2 shadow-sm relative">
            <span className="text-slate-600 font-semibold text-base">Total Stock</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-slate-900">{summary.totalStock}</span>
              <span className="absolute top-6 right-6 bg-white rounded-full p-2 shadow"><FaDollarSign className="text-blue-500 text-xl" /></span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-xs"><FaArrowUp className="inline text-xs" />2%</span>
              <span className="text-slate-400 text-xs">vs last month</span>
            </div>
          </div>
          {/* Low Stock Items */}
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 flex flex-col gap-2 shadow-sm relative">
            <span className="text-slate-600 font-semibold text-base">Low Stock Items</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-yellow-700">{getLowStockCount(inventoryData)}</span>
              <span className="absolute top-6 right-6 bg-white rounded-full p-2 shadow"><FaExclamationTriangle className="text-yellow-500 text-xl" /></span>
            </div>
          </div>
          {/* Out of Stock Items */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex flex-col gap-2 shadow-sm relative">
            <span className="text-slate-600 font-semibold text-base">Out of Stock Items</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-red-700">{getOutOfStockCount(inventoryData)}</span>
              <span className="absolute top-6 right-6 bg-white rounded-full p-2 shadow"><FaExclamationTriangle className="text-red-500 text-xl" /></span>
            </div>
          </div>
        </div>
        {/* Inventory Table Full Width */}
        <div className="w-full px-0">
          <div className="rounded-2xl border bg-white p-2 md:p-6 shadow-sm w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3 md:mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Inventory Table
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-0 rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-green-50 via-white to-cyan-50">
                <thead className="bg-gradient-to-r from-green-100 to-cyan-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-green-900 uppercase tracking-wider border-b border-green-200">Product</th>
                    <th className="px-6 py-3 text-left font-bold text-green-900 uppercase tracking-wider border-b border-green-200">SKU</th>
                    <th className="px-6 py-3 text-left font-bold text-green-900 uppercase tracking-wider border-b border-green-200">Category</th>
                    <th className="px-6 py-3 text-right font-bold text-green-900 uppercase tracking-wider border-b border-green-200">Total Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.map((entry, idx) => (
                    <React.Fragment key={entry.product.sku}>
                      <tr
                        className="border-b last:border-b-0 hover:bg-green-100/60 cursor-pointer transition-colors duration-150 group"
                        onClick={() => handleExpand(entry.product.sku)}
                      >
                        <td className="px-6 py-3 font-semibold text-slate-900 group-hover:text-green-800 transition-colors duration-150">
                          {entry.product.productName}
                        </td>
                        <td className="px-6 py-3 font-mono text-green-700 underline group-hover:text-green-900 transition-colors duration-150">
                          {entry.product.sku}
                        </td>
                        <td className="px-6 py-3 capitalize text-slate-700 group-hover:text-green-800 transition-colors duration-150">
                          {entry.product.productCategory}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-green-700 group-hover:text-green-900 transition-colors duration-150">
                          {entry.totalQuantity}
                        </td>
                      </tr>
                      {expanded === entry.product.sku && (
                        <tr className="bg-white/80">
                          <td colSpan={4} className="p-0">
                            <div className="p-2 md:p-4">
                              <div className="font-semibold mb-2 text-slate-700">
                                Batches
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs border-separate border-spacing-0 rounded-lg overflow-hidden bg-gradient-to-br from-green-50 via-white to-cyan-50">
                                  <thead className="bg-gradient-to-r from-green-100 to-cyan-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left font-bold text-green-900 border-b border-green-200">Batch #</th>
                                      <th className="px-4 py-2 text-left font-bold text-green-900 border-b border-green-200">Supplier</th>
                                      <th className="px-4 py-2 text-left font-bold text-green-900 border-b border-green-200">Warehouse</th>
                                      <th className="px-4 py-2 text-left font-bold text-green-900 border-b border-green-200">Mfg Date</th>
                                      <th className="px-4 py-2 text-left font-bold text-green-900 border-b border-green-200">Exp Date</th>
                                      <th className="px-4 py-2 text-right font-bold text-green-900 border-b border-green-200">Quantity</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entry.batches.map((batch) => (
                                      <tr
                                        key={batch.batchId}
                                        className="border-b last:border-b-0 hover:bg-green-50/60 transition-colors duration-150"
                                      >
                                        <td className="px-4 py-2 font-mono text-green-700">{batch.batchNumber}</td>
                                        <td className="px-4 py-2 text-slate-700">{batch.supplier?.companyName || batch.supplier?.fullName}</td>
                                        <td className="px-4 py-2 text-slate-700">{batch.warehouse?.warehouseName} <span className="text-xs text-slate-400">({batch.warehouse?.address.city}, {batch.warehouse?.address.state})</span></td>
                                        <td className="px-4 py-2 text-slate-500">{batch.mfgDate}</td>
                                        <td className="px-4 py-2 text-slate-500">{batch.expDate}</td>
                                        <td className="px-4 py-2 text-right font-bold text-green-700">{batch.quantity}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* ...removed Stock Level Overview card... */}
      </main>
    </div>
  );
};

export default InventoryPage;
