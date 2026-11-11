import React, { useState } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Filter,
  DollarSign,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Sale, Expense } from '../../types';
import { formatPEN } from '../../utils/money';
import { storage } from '../../services/storage';
import { getTodayLimaDate, getYesterdayLimaDate, formatDateTimeInLima } from '../../utils/date';

interface ReportsViewProps {
  sales: Sale[];
  expenses: Expense[];
  onSaleCancelled?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  expenses,
  onSaleCancelled,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [selectedSaleForCancel, setSelectedSaleForCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Error de cobro / digitación');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const today = getTodayLimaDate();
  const yesterday = getYesterdayLimaDate();

  // Filter sales according to selection
  const filteredSales = sales.filter((s) => {
    if (filterPeriod === 'today') return s.businessDate === today;
    if (filterPeriod === 'yesterday') return s.businessDate === yesterday;
    if (filterPeriod === 'week') {
      // Last 7 days approximation
      const diffTime = Math.abs(new Date(today).getTime() - new Date(s.businessDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    return true; // all
  });

  // Financial aggregates for completed sales
  const completedSales = filteredSales.filter((s) => s.status === 'completed');
  const totalNetSalesCents = completedSales.reduce((sum, s) => sum + s.totalCents, 0);
  const totalCashCents = completedSales.reduce((sum, s) => sum + s.payments.cashCents, 0);
  const totalYapeCents = completedSales.reduce((sum, s) => sum + s.payments.yapeCents, 0);

  let totalCOGSCents = 0;
  let totalCafesCount = 0;
  let totalRoscasCount = 0;

  completedSales.forEach((s) => {
    s.items.forEach((item) => {
      totalCOGSCents += item.unitCostSnapshotCents * item.quantity;
      if (item.productId === 'prod_cafe_8oz') totalCafesCount += item.quantity;
      if (item.productId === 'prod_rosca') totalRoscasCount += item.quantity;
    });
  });

  const grossProfitCents = totalNetSalesCents - totalCOGSCents;

  const handleExportCSV = () => {
    const csvContent = storage.exportSalesCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_cafe_roscas_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteCancelSale = () => {
    if (!selectedSaleForCancel) return;
    if (!cancelReason.trim()) {
      setCancelError('Debes ingresar un motivo para la anulación (RN-11).');
      return;
    }

    const res = storage.cancelSale(selectedSaleForCancel.id, cancelReason);
    if (res.success) {
      setSelectedSaleForCancel(null);
      setCancelError(null);
      if (onSaleCancelled) onSaleCancelled();
    } else {
      setCancelError(res.error || 'Error al anular venta');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>Reportes & Historial Financiero</span>
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Métricas de ventas, desglose de COGS, auditoría de anulaciones y exportación CSV.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Ventas CSV</span>
        </button>
      </div>

      {/* Date Filter Tabs */}
      <div className="flex items-center gap-2 bg-stone-950 p-1 rounded-2xl border border-stone-800 w-fit">
        <button
          onClick={() => setFilterPeriod('today')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterPeriod === 'today' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Hoy (Lima)
        </button>
        <button
          onClick={() => setFilterPeriod('yesterday')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterPeriod === 'yesterday' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Ayer
        </button>
        <button
          onClick={() => setFilterPeriod('week')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterPeriod === 'week' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Últimos 7 días
        </button>
        <button
          onClick={() => setFilterPeriod('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterPeriod === 'all' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Histórico Completo
        </button>
      </div>

      {/* Aggregates Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
          <span className="text-[11px] text-stone-400 block uppercase font-medium">Ventas Netas</span>
          <span className="font-mono text-2xl font-bold text-white block mt-1">
            {formatPEN(totalNetSalesCents)}
          </span>
          <span className="text-[11px] text-stone-400 mt-1 block">
            {completedSales.length} transacciones
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
          <span className="text-[11px] text-stone-400 block uppercase font-medium">Efectivo vs Yape</span>
          <div className="mt-1 space-y-0.5 text-xs font-mono">
            <div className="text-emerald-300 font-bold">Efvo: {formatPEN(totalCashCents)}</div>
            <div className="text-purple-300 font-bold">Yape: {formatPEN(totalYapeCents)}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
          <span className="text-[11px] text-stone-400 block uppercase font-medium">Costo de Ventas (COGS)</span>
          <span className="font-mono text-2xl font-bold text-rose-400 block mt-1">
            -{formatPEN(totalCOGSCents)}
          </span>
          <span className="text-[11px] text-stone-400 mt-1 block">
            {totalCafesCount} cafés · {totalRoscasCount} roscas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
          <span className="text-[11px] text-stone-400 block uppercase font-medium">Margen Bruto</span>
          <span className="font-mono text-2xl font-bold text-teal-300 block mt-1">
            {formatPEN(grossProfitCents)}
          </span>
          <span className="text-[11px] text-stone-400 mt-1 block">
            {totalNetSalesCents > 0
              ? `${((grossProfitCents / totalNetSalesCents) * 100).toFixed(1)}% margen`
              : '0% margen'}
          </span>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Listado de Ventas ({filteredSales.length})</span>
          </h3>
          <span className="text-xs text-stone-400">RN-11: Anulaciones generan asiento inverso</span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-12 text-center text-stone-500 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-stone-600 opacity-60" />
            <p className="text-sm font-medium">No hay ventas registradas en este periodo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400">
                  <th className="py-2.5 px-3">ID / Fecha</th>
                  <th className="py-2.5 px-3">Ítems Vendidos</th>
                  <th className="py-2.5 px-3 text-right">Total S/</th>
                  <th className="py-2.5 px-3 text-right">Efectivo</th>
                  <th className="py-2.5 px-3 text-right">Yape</th>
                  <th className="py-2.5 px-3 text-right">COGS</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredSales.map((sale) => {
                  const saleCOGS = sale.items.reduce(
                    (s, i) => s + i.unitCostSnapshotCents * i.quantity,
                    0
                  );
                  const isCancelled = sale.status === 'cancelled';

                  return (
                    <tr key={sale.id} className="hover:bg-stone-850 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-stone-300">
                        <span className="font-bold block text-white">{sale.id.slice(-8)}</span>
                        <span className="text-[10px] text-stone-400">
                          {sale.businessDate} {sale.createdAt.slice(11, 16)} hrs
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-stone-200">
                        {sale.items.map((i, idx) => (
                          <div key={idx}>
                            {i.quantity}x {i.productName}
                            {i.options?.sugar && i.options.sugar !== 'blanca' && (
                              <span className="text-[10px] text-amber-400 ml-1">
                                ({i.options.sugar})
                              </span>
                            )}
                          </div>
                        ))}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white text-sm">
                        {formatPEN(sale.totalCents)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-stone-300">
                        {formatPEN(sale.payments.cashCents)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-purple-300">
                        {formatPEN(sale.payments.yapeCents)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-stone-400">
                        {formatPEN(saleCOGS)}
                      </td>

                      <td className="py-2.5 px-3">
                        {isCancelled ? (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                              ANULADA
                            </span>
                            <span className="block text-[10px] text-stone-400 truncate max-w-[120px] mt-0.5" title={sale.cancellationReason}>
                              {sale.cancellationReason}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            COMPLETA
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {!isCancelled && (
                          <button
                            onClick={() => {
                              setSelectedSaleForCancel(sale);
                              setCancelReason('Error de digitación en el mostrador');
                              setCancelError(null);
                            }}
                            className="text-xs text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Sale Modal */}
      {selectedSaleForCancel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-400" />
              <span>Anular Venta {selectedSaleForCancel.id.slice(-8)}</span>
            </h3>

            <p className="text-xs text-stone-400">
              La anulación generará un asiento inverso en Kardex (reposición de insumos) y descontará el monto de la caja activa (RN-11). Jamás se borra el historial.
            </p>

            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-400">Monto total:</span>
                <span className="font-mono font-bold text-white">
                  {formatPEN(selectedSaleForCancel.totalCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Ítems:</span>
                <span className="text-stone-300">
                  {selectedSaleForCancel.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-300 block mb-1">Motivo de Anulación (Obligatorio):</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. El cliente canceló el pedido"
                className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedSaleForCancel(null)}
                className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteCancelSale}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
