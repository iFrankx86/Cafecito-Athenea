import React from 'react';
import { 
  Home, 
  ShoppingBag, 
  Package, 
  Wallet, 
  Menu 
} from 'lucide-react';
import { TabDestination } from '../types';

interface BottomNavProps {
  activeTab: TabDestination;
  onChangeTab: (tab: TabDestination) => void;
  cartCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  cartCount,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 safe-bottom">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {/* Inicio */}
        <button
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'dashboard' ? 'text-amber-400 font-semibold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Inicio</span>
        </button>

        {/* Stock / Inventario */}
        <button
          onClick={() => onChangeTab('inventory')}
          className={`flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'inventory' ? 'text-amber-400 font-semibold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Package className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Stock</span>
        </button>

        {/* Vender (POS Primary Action Button) */}
        <div className="flex items-center justify-center -mt-4">
          <button
            onClick={() => onChangeTab('pos')}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 ${
              activeTab === 'pos'
                ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-500/20 shadow-amber-500/30'
                : 'bg-amber-600 text-white shadow-stone-950/40'
            }`}
          >
            <ShoppingBag className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-stone-900">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Caja */}
        <button
          onClick={() => onChangeTab('cash')}
          className={`flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'cash' ? 'text-amber-400 font-semibold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Wallet className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Caja</span>
        </button>

        {/* Más (Calculadora, Compras, Reportes, Config) */}
        <button
          onClick={() => onChangeTab('more')}
          className={`flex flex-col items-center justify-center h-full transition-colors min-h-[44px] ${
            activeTab === 'more' ? 'text-amber-400 font-semibold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Menu className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Más</span>
        </button>
      </div>
    </nav>
  );
};
