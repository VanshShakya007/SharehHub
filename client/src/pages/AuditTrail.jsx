// client/src/pages/AuditTrail.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit');
      setLogs(res.data.logs || res.data || []);
    } catch (err) {
      console.error('Failed to fetch audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Hash-Chained Audit Ledger</h1>
        <p className="text-gray-400 mb-6">Immutable system activity logs and cryptographic state verification trails.</p>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading audit ledger...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl">
            No audit logs recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, idx) => (
              <div key={log.id || idx} className="bg-gray-900 border border-gray-800 rounded-xl p-4 font-mono text-xs">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 pb-3 border-b border-gray-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded">
                      {log.event_type || log.eventType}
                    </span>
                    <span className="text-gray-400">
                      Entity: {log.entity_name || log.entityName} #{log.entity_id || log.entityId}
                    </span>
                  </div>
                  <span className="text-gray-500">{new Date(log.created_at || log.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                  <div>
                    <span className="text-gray-500 block mb-1">Current Block Hash:</span>
                    <span className="text-emerald-400 break-all">{log.current_hash || log.currentHash || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Previous Block Hash:</span>
                    <span className="text-gray-400 break-all">{log.previous_hash || log.previousHash || 'Genesis'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 