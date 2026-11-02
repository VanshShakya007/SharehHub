// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Cpu, QrCode, Lock, LayoutGrid, ClipboardList, ShieldAlert } from 'lucide-react';
import Catalog from './pages/Catalog';
import AssetDetail from './pages/AssetDetail';
import ManagerCommandCenter from './pages/ManagerCommandCenter';
import AuditTrail from './pages/AuditTrail';

function NavigationHeader() {
  const [health, setHealth] = useState({ status: 'Connecting...', database: 'Checking' });
  const location = useLocation();

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'OFFLINE', database: 'DISCONNECTED' }));
  }, []);

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <Link to="/catalog" className="flex items-center space-x-3 group">
          <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400 group-hover:bg-teal-500/20 transition">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
              ShareHub
            </h1>
            <p className="text-xs text-slate-400 font-mono">Institutional Asset Governance Platform</p>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center space-x-2 text-sm font-medium">
          <Link
            to="/catalog"
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${location.pathname.startsWith('/catalog') || location.pathname.startsWith('/assets') ? 'bg-slate-800 text-teal-300 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Catalog</span>
          </Link>
          <Link
            to="/manager"
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${location.pathname === '/manager' ? 'bg-slate-800 text-teal-300 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Manager Queue</span>
          </Link>
          <Link
            to="/audit"
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${location.pathname === '/audit' ? 'bg-slate-800 text-teal-300 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Ledger</span>
          </Link>
        </nav>
      </div>

      {/* System Status Pill */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${health.database === 'CONNECTED' ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-300">API: {health.status}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">DB: {health.database}</span>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
        <NavigationHeader />
        
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/manager" element={<ManagerCommandCenter />} />
            <Route path="/audit" element={<AuditTrail />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
          ShareHub &copy; 2026 National Hackathon &bull; Built with React, Tailwind CSS, Node.js, Express & PostgreSQL
        </footer>
      </div>
    </Router>
  );
}