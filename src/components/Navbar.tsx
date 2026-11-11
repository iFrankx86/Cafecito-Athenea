import React from 'react';
import { 
  Coffee, 
  Store, 
  Wallet, 
  Lock, 
  Unlock, 
  Sparkles,
  Wifi
} from 'lucide-react';
import { CashSession } from '../types';
import { formatPEN } from '../utils/money';

interface NavbarProps {
  businessName: string;
  activeSession: CashSession | null;
  onOpenCashModal: () => void;
  onOpenDemoModal: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  businessName,
  activeSession,
  onOpenCashModal,
  onOpenDemoModal,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 text-stone-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-700/80 flex items-center justify-center text-amber-100 shadow-inner">
            <Coffee className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base sm:text-lg text-white">
                {businessName}
              </span>
              <span className="text-[11px] font-medium text-amber-300/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 hidden sm:inline-block">
                Control PEN
              </span>
            </div>
            <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
              <span>América/Lima</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3 h-3" /> Online
              </span>
            </div>
          </div>
        </div>

        {/* Desktop / Tablet Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-stone-800 text-amber-300'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Inicio
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-amber-700/30 text-amber-200 hover:bg-amber-700/50'
            }`}
          >
            Vender (POS)
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'inventory'
                ? 'bg-stone-800 text-amber-300'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Inventario & Kardex
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'purchases'
                ? 'bg-stone-800 text-amber-300'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Compras
          </button>
          <button
            onClick={() => setActiveTab('cash')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'cash'
                ? 'bg-stone-800 text-amber-300'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Caja & Arqueo
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'calculator'
                ? 'bg-stone-800 text-amber-300'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Calculadora Costos
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'reports'
                ? 'bg-stone-800 text-amber-300'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            Reportes
          </button>
        </nav>

        {/* Right Status Actions */}
        <div className="flex items-center gap-2">
          {/* Cash Drawer Status */}
          <button
            onClick={onOpenCashModal}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium transition-colors ${
              activeSession
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
            }`}
          >
            {activeSession ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <div className="text-left hidden xs:block">
                  <span className="block text-[10px] text-emerald-400/80 font-normal leading-none">Caja Abierta</span>
                  <span className="font-mono font-bold">{formatPEN(activeSession.expectedCashCents)}</span>
                </div>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Caja Cerrada</span>
              </>
            )}
          </button>

          {/* Quick Sandbox Demo Trigger */}
          <button
            onClick={onOpenDemoModal}
            title="Cargar simulación de prueba o ejecutar tests QA"
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Demo & QA</span>
          </button>
        </div>
      </div>
    </header>
  );
};
