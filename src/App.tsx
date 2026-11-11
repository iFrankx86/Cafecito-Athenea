import React, { useState, useEffect } from 'react';
import { 
  Home, 
  ShoppingBag, 
  Package, 
  Wallet, 
  Menu, 
  Calculator, 
  BarChart3, 
  Settings as SettingsIcon, 
  PlusCircle, 
  Sparkles,
  X,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { storage } from './services/storage';
import { 
  Product, 
  Supply, 
  Sale, 
  StockMovement, 
  CashSession, 
  Expense, 
  Purchase, 
  BusinessSettings,
  TabDestination 
} from './types';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { POSView } from './components/POS/POSView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { InventoryView } from './components/Inventory/InventoryView';
import { PurchasesView } from './components/Purchases/PurchasesView';
import { CashView } from './components/Cash/CashView';
import { CalculatorView } from './components/Calculator/CalculatorView';
import { ReportsView } from './components/Reports/ReportsView';
import { SettingsView } from './components/Settings/SettingsView';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Domain Data State (mirrored from storage)
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [supplies, setSupplies] = useState<Supply[]>(() => storage.getSupplies());
  const [sales, setSales] = useState<Sale[]>(() => storage.getSales());
  const [movements, setMovements] = useState<StockMovement[]>(() => storage.getMovements());
  const [sessions, setSessions] = useState<CashSession[]>(() => storage.getCashSessions());
  const [expenses, setExpenses] = useState<Expense[]>(() => storage.getExpenses());
  const [purchases, setPurchases] = useState<Purchase[]>(() => storage.getPurchases());
  const [settings, setSettings] = useState<BusinessSettings>(() => storage.getSettings());

  // Active Cash Drawer Session
  const activeSession = storage.getActiveCashSession();

  // Subscribe to storage changes for atomic reactivity
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setProducts(storage.getProducts());
      setSupplies(storage.getSupplies());
      setSales(storage.getSales());
      setMovements(storage.getMovements());
      setSessions(storage.getCashSessions());
      setExpenses(storage.getExpenses());
      setPurchases(storage.getPurchases());
      setSettings(storage.getSettings());
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBottomNavChange = (tab: TabDestination) => {
    if (tab === 'more') {
      setIsMoreMenuOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleNavigateMore = (targetTab: string) => {
    setActiveTab(targetTab);
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white pb-20 lg:pb-8">
      {/* Top App Bar */}
      <Navbar
        businessName={settings.name}
        activeSession={activeSession}
        onOpenCashModal={() => setActiveTab('cash')}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-700 text-emerald-200 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {activeTab === 'dashboard' && (
          <DashboardView
            sales={sales}
            supplies={supplies}
            expenses={expenses}
            activeSession={activeSession}
            onNavigateTab={setActiveTab}
            onOpenCashModal={() => setActiveTab('cash')}
          />
        )}

        {activeTab === 'pos' && (
          <POSView
            products={products}
            supplies={supplies}
            activeSession={activeSession}
            onOpenCashSessionModal={() => setActiveTab('cash')}
            onSaleCompleted={(sale) => showNotification(`Venta ${sale.id.slice(-6)} confirmada con éxito`)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            supplies={supplies}
            movements={movements}
            onOpenPurchaseModal={() => setActiveTab('purchases')}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesView
            supplies={supplies}
            purchases={purchases}
            activeSession={activeSession}
            onPurchaseAdded={() => showNotification('Ingreso de mercadería registrado en Kardex')}
          />
        )}

        {activeTab === 'cash' && (
          <CashView
            activeSession={activeSession}
            sessions={sessions}
            expenses={expenses}
            onSessionUpdated={() => showNotification('Movimiento de caja actualizado')}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorView
            supplies={supplies}
            products={products}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            sales={sales}
            expenses={expenses}
            onSaleCancelled={() => showNotification('Venta anulada y reversos creados')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            products={products}
            settings={settings}
            onRefresh={() => {
              setProducts(storage.getProducts());
              setSupplies(storage.getSupplies());
              setSales(storage.getSales());
              setMovements(storage.getMovements());
              setSessions(storage.getCashSessions());
              setExpenses(storage.getExpenses());
              setPurchases(storage.getPurchases());
              setSettings(storage.getSettings());
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Section 10) */}
      <BottomNav
        activeTab={
          ['dashboard', 'inventory', 'cash', 'pos'].includes(activeTab)
            ? (activeTab as TabDestination)
            : 'more'
        }
        onChangeTab={handleBottomNavChange}
        cartCount={0}
      />

      {/* Mobile "Más" Modal Menu */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="font-bold text-base text-white">Módulos del Sistema</h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                onClick={() => handleNavigateMore('purchases')}
                className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-600/60 flex items-center gap-3 text-left transition-colors"
              >
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-white">Compras de Insumos</h4>
                  <p className="text-[11px] text-stone-400">Ingreso de paquetes y reposición</p>
                </div>
              </button>

              <button
                onClick={() => handleNavigateMore('calculator')}
                className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-600/60 flex items-center gap-3 text-left transition-colors"
              >
                <Calculator className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="font-bold text-white">Calculadora de Costos</h4>
                  <p className="text-[11px] text-stone-400">Desglose vaso 8 oz y margen comercial</p>
                </div>
              </button>

              <button
                onClick={() => handleNavigateMore('reports')}
                className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-600/60 flex items-center gap-3 text-left transition-colors"
              >
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-white">Reportes & Exportar CSV</h4>
                  <p className="text-[11px] text-stone-400">Ventas, COGS y anulación con reverso</p>
                </div>
              </button>

              <button
                onClick={() => handleNavigateMore('settings')}
                className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-600/60 flex items-center gap-3 text-left transition-colors"
              >
                <SettingsIcon className="w-5 h-5 text-stone-400" />
                <div>
                  <h4 className="font-bold text-white">Configuración & QA Suite</h4>
                  <p className="text-[11px] text-stone-400">Precios de venta y tests TC-01 a TC-20</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo & QA Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Simulación Demostrativa & Pruebas</span>
              </h3>
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Puedes cargar el día de prueba de la Sección 9.2 para verificar en vivo los cálculos de cuadre y margen con 30 cafés y 20 roscas:
            </p>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-stone-400">
                <span>Ventas totales esperadas:</span>
                <span className="text-white font-bold">S/ 115.00</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Efectivo cobrado:</span>
                <span className="text-emerald-400 font-bold">S/ 70.00</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Yape cobrado:</span>
                <span className="text-purple-400 font-bold">S/ 45.00</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Efectivo esperado al cierre:</span>
                <span className="text-amber-400 font-bold">S/ 85.00</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Utilidad estimada:</span>
                <span className="text-teal-400 font-bold">≈ S/ 57.09</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  storage.loadIllustrativeDemoDay();
                  setIsDemoModalOpen(false);
                  setActiveTab('dashboard');
                  showNotification('Día ilustrativo 9.2 cargado exitosamente');
                }}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cargar Demo 9.2
              </button>
              <button
                onClick={() => {
                  setIsDemoModalOpen(false);
                  setActiveTab('settings');
                }}
                className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Ejecutar Tests QA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
