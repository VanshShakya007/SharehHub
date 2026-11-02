// client/src/pages/Catalog.jsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Catalog() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAssets();
  }, [categoryFilter, searchQuery]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/assets', { params });
      setAssets(res.data.assets || []);
    } catch (err) {
      console.error('Failed to fetch asset catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">ShareHub Asset Catalog</h1>
        <p className="text-gray-400 mb-6">Browse institutional assets, check training prerequisite eligibility, and submit priority reservation requests.</p>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by name, tag, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 flex-1"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="SPACES">Spaces</option>
            <option value="DEVICES">Devices</option>
          </select>
        </div>

        {/* Asset Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading catalog items...</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl">No assets found matching your criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between hover:border-gray-700 transition">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono uppercase bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-800/50">
                      {asset.asset_tag}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${asset.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'}`}>
                      {asset.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold mb-1 text-white">{asset.name}</h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{asset.description || 'No description provided.'}</p>

                  {/* Smart Eligibility Badge */}
                  {asset.isEligible !== undefined && (
                    <div className={`mb-4 p-3 rounded-lg text-xs ${asset.isEligible ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-800/40 text-rose-300'}`}>
                      {asset.isEligible ? (
                        <span className="font-semibold">✓ Fully Eligible (All prerequisites met)</span>
                      ) : (
                        <div>
                          <span className="font-semibold block mb-1">✕ Missing Certifications:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-rose-200">
                            {asset.missingPrereqs.map((p) => (
                              <li key={p.id}>{p.name} ({p.code})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">📍 {asset.location}</span>
                  <a
                    href={`/assets/${asset.id}`}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition"
                  >
                    View & Book
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}