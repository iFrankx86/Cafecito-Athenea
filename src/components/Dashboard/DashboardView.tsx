import React from 'react';
import { 
  TrendingUp, 
  Coffee, 
  CircleDot, 
  Wallet, 
  QrCode, 
  AlertTriangle, 
  ArrowRight, 
  PlusCircle, 
  Receipt, 
  Calculator,
  Lock,
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Sale, Supply, CashSession, Expense } from '../../types';
import { formatPEN } from '../../utils/money';
import { getTodayLimaDate, formatFriendlyDate } from '../../utils/date';

interface DashboardViewProps {
  sales: Sale[];
  supplies: Supply[];
  expenses: Expense[];
  activeSession: CashSession | null;
  onNavigateTab: (tab: any) => void;
  onOpenCashModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  supplies,
  expenses,
  activeSession,
  onNavigateTab,
  onOpenCashModal,
}) => {
  const today = getTodayLimaDate();
  const todaySales = sales.filter((s) => s.businessDate === today && s.status === 'completed');

  // 1. Net Sales
  const netSalesCents = todaySales.reduce((sum, s) => sum + s.totalCents, 0);

  // 2. Payments by method
  const cashSalesCents = todaySales.reduce((sum, s) => sum + s.payments.cashCents, 0);
  const yapeSalesCents = todaySales.reduce((sum, s) => sum + s.payments.yapeCents, 0);

  // 3. Quantities
  let totalCafesSold = 0;
  let totalRoscasSold = 0;
  let totalCOGSCents = 0;

  todaySales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (item.productId === 'prod_cafe_8oz') {
        totalCafesSold += item.quantity;
      } else if (item.productId === 'prod_rosca') {
        totalRoscasSold += item.quantity;
      }
      totalCOGSCents += item.unitCostSnapshotCents * item.quantity;
    });
  });

  const salesCount = todaySales.length;
  const averageTicketCents = salesCount > 0 ? Math.round(netSalesCents / salesCount) : 0;

  // 4. Operating Expenses (excluding owner withdrawals)
  const todayExpenses = expenses.filter((e) => e.businessDate === today);
  const operatingExpensesCents = todayExpenses
    .filter((e) => e.category === 'operativo')
    .reduce((sum, e) => sum + e.amountCents, 0);
  const ownerWithdrawalsCents = todayExpenses
    .filter((e) => e.category === 'retiro_dueño')
    .reduce((sum, e) => sum + e.amountCents, 0);

  // 5. Estimated Profit: Net Sales - COGS - Operating Expenses
  const estimatedProfitCents = netSalesCents - totalCOGSCents - operatingExpensesCents;

  // 6. Critical Stock Alerts
  const criticalSupplies = supplies.filter((s) => s.active && s.stockQuantity <= s.minStock);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Panel del Día (Lima, Perú)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatFriendlyDate(today)}
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Resumen en vivo de ventas, inventario y flujo de caja en PEN (S/).
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => onNavigateTab('pos')}
          className="h-12 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Receipt className="w-4 h-4" />
          <span>+ Nueva Venta</span>
        </button>
      </div>

      {/* Main 3 Distinctions from Section 9.1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Ventas Netas */}
        <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">1. Ventas Netas</span>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-white block">
              {formatPEN(netSalesCents)}
            </span>
            <p className="text-xs text-stone-400">
              {salesCount} transacciones · Ticket prom. {formatPEN(averageTicketCents)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
            <span>{totalCafesSold} cafés servidos</span>
            <span>{totalRoscasSold} roscas</span>
          </div>
        </div>

        {/* Metric 2: Dinero por Medio de Pago */}
        <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">2. Flujo de Cobro</span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Efectivo en Caja:
              </span>
              <span className="font-mono font-bold text-lg text-emerald-300">
                {activeSession ? formatPEN(activeSession.expectedCashCents) : 'Caja cerrada'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Yape Digital:
              </span>
              <span className="font-mono font-bold text-lg text-purple-300">
                {formatPEN(yapeSalesCents)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
            <span>Apertura: {activeSession ? formatPEN(activeSession.openingCents) : 'S/ 0.00'}</span>
            <button
              onClick={onOpenCashModal}
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Ver Arqueo →
            </button>
          </div>
        </div>

        {/* Metric 3: Utilidad Estimada */}
        <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">3. Utilidad Estimada</span>
            <DollarSign className="w-5 h-5 text-teal-400" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-teal-300 block">
              {formatPEN(estimatedProfitCents)}
            </span>
            <p className="text-xs text-stone-400">
              Ventas - COGS ({formatPEN(totalCOGSCents)}) - Gastos ({formatPEN(operatingExpensesCents)})
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
            <span>Retiros dueño: {formatPEN(ownerWithdrawalsCents)}</span>
            <span className="text-stone-400">No altera COGS</span>
          </div>
        </div>
      </div>

      {/* Critical Stock Alerts Bar */}
      {criticalSupplies.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-950/40 border border-amber-800/70 text-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Alerta de Stock Crítico ({criticalSupplies.length} insumos bajos)</span>
            </div>
            <button
              onClick={() => onNavigateTab('purchases')}
              className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
            >
              Registrar Compra <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {criticalSupplies.map((sup) => (
              <div
                key={sup.id}
                className="p-3 rounded-2xl bg-stone-950/80 border border-stone-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-stone-200 block truncate">{sup.name}</span>
                  <span className="text-[11px] text-stone-400">Mínimo sugerido: {sup.minStock} {sup.baseUnit}</span>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {sup.stockQuantity} {sup.baseUnit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('pos')}
          className="p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-600/60 text-left transition-all group"
        >
          <Receipt className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-sm text-white">Vender (POS)</h4>
          <p className="text-[11px] text-stone-400 mt-0.5">Café 8 oz y Roscas</p>
        </button>

        <button
          onClick={() => onNavigateTab('purchases')}
          className="p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-600/60 text-left transition-all group"
        >
          <PlusCircle className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-sm text-white">Compras</h4>
          <p className="text-[11px] text-stone-400 mt-0.5">Paquetes e insumos</p>
        </button>

        <button
          onClick={() => onNavigateTab('calculator')}
          className="p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-600/60 text-left transition-all group"
        >
          <Calculator className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-sm text-white">Calculadora</h4>
          <p className="text-[11px] text-stone-400 mt-0.5">Costos y margen 8 oz</p>
        </button>

        <button
          onClick={() => onNavigateTab('cash')}
          className="p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-600/60 text-left transition-all group"
        >
          <Wallet className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-sm text-white">Arqueo y Cierre</h4>
          <p className="text-[11px] text-stone-400 mt-0.5">Cuadre del día</p>
        </button>
      </div>

      {/* Recent Sales Mini-Feed */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Últimas Ventas de Hoy</span>
          </h3>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs text-amber-400 hover:underline"
          >
            Ver todas ({sales.length}) →
          </button>
        </div>

        {todaySales.length === 0 ? (
          <div className="py-10 text-center text-stone-500 space-y-2">
            <Coffee className="w-8 h-8 mx-auto text-stone-600 opacity-60" />
            <p className="text-sm font-medium">Aún no tienes ventas registradas hoy</p>
            <p className="text-xs text-stone-400">
              Registra tu primer café o rosca con el botón "+ Nueva Venta".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-800/80">
            {todaySales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-stone-200">
                    {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(' + ')}
                  </div>
                  <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-stone-400">{sale.id.slice(-8)}</span>
                    <span>·</span>
                    <span>{sale.createdAt.slice(11, 16)} hrs</span>
                    <span>·</span>
                    <span className="capitalize">
                      {sale.payments.cashCents > 0 && sale.payments.yapeCents > 0
                        ? 'Mixto'
                        : sale.payments.yapeCents > 0
                        ? 'Yape'
                        : 'Efectivo'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-white block">
                    {formatPEN(sale.totalCents)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">Confirmada</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
