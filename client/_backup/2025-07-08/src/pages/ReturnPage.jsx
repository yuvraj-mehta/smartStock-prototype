import React from 'react';
import ReturnList from '../components/features/ReturnList';

const ReturnPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 py-8 px-2 md:px-0">
      <div className="container mx-auto p-6 rounded-2xl shadow-xl bg-white/90">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-blue-800 tracking-tight">Return Management</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition font-semibold text-base float-right"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="text-xl">＋</span> New Return
          </button>
        </div>
        {/* Summary bar placeholder - can be enhanced to show stats */}
        {/* <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"> ... </div> */}
        <ReturnList />
      </div>
    </div>
  );
};

export default ReturnPage;
