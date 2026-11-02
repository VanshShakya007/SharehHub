// client/src/pages/AssetDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Booking Form State
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assets/${id}`);
      setAsset(res.data.asset);
    } catch (err) {
      console.error('Failed to fetch asset details:', err);
      setError('Asset not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingMessage('');
    
    if (!startTime || !endTime) {
      setBookingMessage('Please select both start and end times.');
      return;
    }

    try {
      setBookingLoading(true);
      const res = await api.post('/bookings', {
        assetId: asset.id,
        startTime,
        endTime,
        purpose,
      });
      setBookingMessage('Success: Booking request submitted successfully!');
      setTimeout(() => {
        navigate('/catalog'); // Or redirect to bookings dashboard
      }, 2000);
    } catch (err) {
      console.error('Booking submission error:', err);
      setBookingMessage(err.response?.data?.error || 'Failed to submit booking request.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center">Loading asset details...</div>;
  if (error || !asset) return <div className="min-h-screen bg-gray-950 text-rose-400 flex items-center justify-center">{error || 'Asset not found.'}</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          ← Back to Catalog
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono uppercase bg-indigo-950 text-indigo-300 px-3 py-1 rounded-md border border-indigo-800/50">
                {asset.asset_tag}
              </span>
              <span className={`text-xs font-medium px-3 py-1 rounded-md ${asset.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'}`}>
                {asset.status}
              </span>
            </div>

            <h1 className="text-2xl font-bold mb-2">{asset.name}</h1>
            <p className="text-sm text-gray-400 mb-6">{asset.description || 'No description provided.'}</p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 block text-xs mb-1">Category</span>
                <span className="font-medium text-gray-200">{asset.category}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 block text-xs mb-1">Location</span>
                <span className="font-medium text-gray-200">📍 {asset.location}</span>
              </div>
            </div>

            {/* Eligibility Section */}
            {asset.isEligible !== undefined && (
              <div className={`p-4 rounded-xl text-sm mb-6 ${asset.isEligible ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-800/40 text-rose-300'}`}>
                {asset.isEligible ? (
                  <span className="font-semibold">✓ You are fully eligible to reserve this asset.</span>
                ) : (
                  <div>
                    <span className="font-semibold block mb-2">✕ Missing Certification Prerequisites:</span>
                    <ul className="list-disc list-inside space-y-1 text-rose-200">
                      {asset.missingPrereqs.map((p) => (
                        <li key={p.id}>{p.name} ({p.code})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Booking Form */}
            {asset.status === 'AVAILABLE' && (
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-semibold mb-4">Request Reservation</h3>
                {bookingMessage && (
                  <div className={`p-3 rounded-lg text-xs mb-4 ${bookingMessage.startsWith('Success') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                    {bookingMessage}
                  </div>
                )}
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-gray-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-gray-200"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Purpose / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g., Lab experimentation / Project demo"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-gray-200"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={bookingLoading || (asset.isEligible === false)}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition ${asset.isEligible === false ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                  >
                    {bookingLoading ? 'Submitting Request...' : asset.isEligible === false ? 'Prerequisites Required to Book' : 'Submit Priority Booking Request'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* QR Code Sidebar Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Asset QR Verification</h3>
            {asset.qr_code_image_url ? (
              <div className="bg-white p-3 rounded-lg mb-4">
                <img src={asset.qr_code_image_url} alt="Asset QR Code" className="w-40 h-40 object-contain" />
              </div>
            ) : (
              <div className="w-40 h-40 bg-gray-950 border border-gray-800 flex items-center justify-center text-xs text-gray-500 rounded-lg mb-4">
                No QR Generated
              </div>
            )}
            <span className="text-xs font-mono text-gray-500 break-all">{asset.qr_code_payload}</span>
          </div>
        </div>
      </div>
    </div>
  );
}