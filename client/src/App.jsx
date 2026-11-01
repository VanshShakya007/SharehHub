import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, QrCode, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState({ status: 'Connecting...', database: 'Checking' });

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'OFFLINE', database: 'DISCONNECTED' }));
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
              ShareHub
            </h1>
            <p className="text-xs text-slate-400 font-mono">Institutional Asset Governance Platform</p>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${health.database === 'CONNECTED' ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300">API: {health.status}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">DB: {health.database}</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700">RBAC 5-Tier</span>
            <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700">SHA-256 Ledger</span>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-mono uppercase tracking-wider mb-6">
          <Lock className="w-3.5 h-3.5" />
          <span>Stage 1 & 2: Core Foundation Initialized</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight mb-4">
          Institutional Equipment & High-Value Asset Governance
        </h2>
        
        <p className="text-slate-400 max-w-2xl text-base md:text-lg mb-10">
          Equipped with cryptographically verified QR check-in/out, SHA-256 hash-chained audit trails, smart prerequisite eligibility matching, and explainable priority scoring.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-6 rounded-xl transition duration-200">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 w-fit mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-1">5-Tier RBAC Architecture</h3>
            <p className="text-sm text-slate-400 mb-3">
              Enforcing fine-grained access control across Students, Researchers, Managers, Admins, and Compliance Auditors.
            </p>
            <span className="text-xs font-mono text-blue-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> <span>PostgreSQL Enums & JWT Ready</span>
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-6 rounded-xl transition duration-200">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400 w-fit mb-4">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-1">Cryptographic QR Tokens</h3>
            <p className="text-sm text-slate-400 mb-3">
              Automated high-entropy payload generation for assets, enabling fast scanning and tamper-proof check-in/out.
            </p>
            <span className="text-xs font-mono text-teal-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> <span>PNG/SVG Data URLs Generated</span>
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-6 rounded-xl transition duration-200">
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 w-fit mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-1">Hash-Chained Audit Ledger</h3>
            <p className="text-sm text-slate-400 mb-3">
              Every asset mutation, booking approval, and inspection state change is linked to the previous block via SHA-256.
            </p>
            <span className="text-xs font-mono text-purple-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> <span>Tamper-Verification Endpoint</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        ShareHub &copy; 2026 National Hackathon &bull; Built with React, Tailwind CSS, Node.js, Express & PostgreSQL
      </footer>
    </div>
  );
}
