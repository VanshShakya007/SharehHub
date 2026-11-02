// client/src/pages/ManagerCommandCenter.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function ManagerCommandCenter() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings');
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      setMessage(`Booking ${status.toLowerCase()} successfully.`);
      fetchBookings();
    } catch (err) {
      console.error('Failed to update booking status:', err);
      setMessage(err.response?.data?.error || 'Failed to update status.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Manager Command Center</h1>
        <p className="text-gray-400 mb-6">Review pending institutional asset reservation requests and manage operational queues.</p>

        {message && (
          <div className="mb-4 p-3 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded-lg text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading booking queue...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl">
            No booking requests found in the queue.
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/50 text-gray-400 font-mono text-xs">
                  <th className="p-4">User</th>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-850/50 transition">
                    <td className="p-4 font-medium text-white">
                      {b.user_name || 'User'} <span className="text-xs text-gray-500 block">{b.user_email}</span>
                    </td>
                    <td className="p-4 text-gray-300">
                      {b.asset_name || 'Asset'} <span className="text-xs font-mono text-indigo-400 block">{b.asset_tag}</span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs font-mono">
                      {new Date(b.start_time).toLocaleString()} <br />to {new Date(b.end_time).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${b.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : b.status === 'PENDING' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' : 'bg-rose-950 text-rose-400 border border-rose-800/50'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {b.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleStatusUpdate(b.id, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                            Approve
                          </button>
                          <button onClick={() => handleStatusUpdate(b.id, 'REJECTED')} className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                            Reject
                          </button>
                        </>
                      )}
                      {b.status === 'APPROVED' && (
                        <button onClick={() => handleStatusUpdate(b.id, 'COMPLETED')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}