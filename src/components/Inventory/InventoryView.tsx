import React, { useState } from 'react';
import { 
  Package, 
  Layers, 
  History, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Download, 
  Search, 
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Supply, StockMovement } from '../../types';
import { formatPEN, formatUnitCostMicros } from '../../utils/money';
import { storage } from '../../services/storage';

interface InventoryViewProps {
  supplies: Supply[];
  movements: StockMovement[];
  onOpenPurchaseModal: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  supplies,
  movements,
  onOpenPurchaseModal,
}) => {
  const [activeTab, setActiveTab] = useState<'supplies' | 'kardex'>('supplies');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stock Adjustment Modal
  const [selectedSupplyForAdjustment, setSelectedSupplyForAdjustment] = useState<Supply | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<string>('-1');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Merma por vaso dañado / fisura');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  // Initial Inventory Setup Modal
  const [isOpeningSetupOpen, setIsOpeningSetupOpen] = useState(false);
  const [openingStockInputs, setOpeningStockInputs] = useState<Record<string, { qty: number; costMicros: number }>>(() => {
    const initial: Record<string, { qty: number; costMicros: number }> = {};
    supplies.forEach((s) => {
      initial[s.id] = { qty: s.stockQuantity, costMicros: s.avgCostMicros };
    });
    return initial;
  });

  // Filter supplies
  const filteredSupplies = supplies.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Submit adjustment
  const handleExecuteAdjustment = () => {
    if (!selectedSupplyForAdjustment) return;
    const delta = parseFloat(adjustmentDelta);
    if (isNaN(delta) || delta === 0) {
      setAdjustmentError('Ingresa una cantidad válida diferente de cero');
      return;
    }
    if (!adjustmentReason.trim()) {
      setAdjustmentError('Debes indicar un motivo para el ajuste (Regla RN-06)');
      return;
    }

    const res = storage.adjustStock({
      supplyId: selectedSupplyForAdjustment.id,
      quantityDelta: delta,
      reason: adjustmentReason,
    });

    if (res.success) {
      setSelectedSupplyForAdjustment(null);
      setAdjustmentError(null);
    } else {
      setAdjustmentError(res.error || 'Error al ajustar stock');
    }
  };

  const handleDownloadKardexCSV = () => {
    const csvContent = storage.exportKardexCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kardex_cafe_roscas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Opening Inventory
  const handleSaveOpeningInventory = () => {
    Object.entries(openingStockInputs).forEach(([supId, data]) => {
      storage.updateSupply(supId, {
        stockQuantity: data.qty,
        avgCostMicros: data.costMicros,
      });
    });
    setIsOpeningSetupOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            <span>Control de Inventario & Kardex</span>
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Valuación por costo promedio ponderado móvil y trazabilidad de cada insumo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpeningSetupOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Inventario Apertura</span>
          </button>
          <button
            onClick={onOpenPurchaseModal}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Compra</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2 bg-stone-950 p-1 rounded-2xl border border-stone-800">
          <button
            onClick={() => setActiveTab('supplies')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'supplies'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Insumos & Stock ({supplies.length})
          </button>
          <button
            onClick={() => setActiveTab('kardex')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'kardex'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Libro Kardex ({movements.length})
          </button>
        </div>

        {activeTab === 'kardex' && (
          <button
            onClick={handleDownloadKardexCSV}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Supplies Catalog View */}
      {activeTab === 'supplies' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar insumo (café, vasos, tapas, roscas)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSupplies.map((sup) => {
              const isLow = sup.stockQuantity <= sup.minStock;
              const valCents = Math.round((sup.stockQuantity * sup.avgCostMicros) / 10000);

              return (
                <div
                  key={sup.id}
                  className={`p-5 rounded-3xl bg-stone-900 border transition-all flex flex-col justify-between ${
                    isLow ? 'border-amber-600/60 shadow-lg shadow-amber-950/20' : 'border-stone-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                        {sup.category}
                      </span>
                      {isLow && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          <AlertTriangle className="w-3 h-3" /> Stock Bajo
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-white">{sup.name}</h3>

                    <div className="mt-3 space-y-1.5 text-xs text-stone-400">
                      <div className="flex justify-between">
                        <span>Existencias actuales:</span>
                        <span className="font-mono font-bold text-white text-sm">
                          {sup.stockQuantity} {sup.baseUnit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Costo unitario prom:</span>
                        <span className="font-mono text-stone-300">
                          {formatUnitCostMicros(sup.avgCostMicros)} / {sup.baseUnit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor total en stock:</span>
                        <span className="font-mono text-amber-300 font-semibold">
                          {formatPEN(valCents)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-800/60">
                        <span>Umbral alerta:</span>
                        <span>{sup.minStock} {sup.baseUnit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedSupplyForAdjustment(sup);
                        setAdjustmentDelta('-1');
                        setAdjustmentError(null);
                      }}
                      className="text-xs text-stone-400 hover:text-amber-300 font-medium transition-colors"
                    >
                      Ajuste / Merma
                    </button>
                    <button
                      onClick={onOpenPurchaseModal}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      + Comprar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kardex Movement Book */}
      {activeTab === 'kardex' && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span>Libro Diario de Kardex (Trazabilidad)</span>
            </h3>
            <span className="text-xs text-stone-400">Orden cronológico descendente</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Insumo</th>
                  <th className="py-2.5 px-3">Tipo Movimiento</th>
                  <th className="py-2.5 px-3 text-right">Variación</th>
                  <th className="py-2.5 px-3 text-right">Costo Snapshot</th>
                  <th className="py-2.5 px-3">Motivo / Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {movements.slice().reverse().map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-stone-850 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-stone-400 whitespace-nowrap">
                        {m.date} {m.timestamp ? m.timestamp.slice(11, 16) : ''}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-stone-200">
                        {m.supplyName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-950 border border-stone-800 text-stone-300">
                          {m.type === 'initial_inventory' && 'Apertura'}
                          {m.type === 'purchase' && 'Compra'}
                          {m.type === 'sale_consumption' && 'Consumo Venta'}
                          {m.type === 'waste_adjustment' && 'Merma / Ajuste'}
                          {m.type === 'reversal' && 'Reverso Anulación'}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-300">
                        {formatUnitCostMicros(m.costSnapshotMicros)}
                      </td>
                      <td className="py-2.5 px-3 text-stone-400 truncate max-w-xs">
                        {m.note || m.sourceId}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedSupplyForAdjustment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Ajustar Stock / Registrar Merma</span>
              </h3>
              <button
                onClick={() => setSelectedSupplyForAdjustment(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-xs">
                <span className="text-stone-400 block">Insumo a ajustar:</span>
                <span className="font-bold text-white text-sm">{selectedSupplyForAdjustment.name}</span>
                <span className="text-stone-400 block mt-1">
                  Stock actual: {selectedSupplyForAdjustment.stockQuantity} {selectedSupplyForAdjustment.baseUnit}
                </span>
              </div>

              <div>
                <label className="text-xs text-stone-300 block mb-1">
                  Cantidad a restar (-) o sumar (+):
                </label>
                <input
                  type="number"
                  step="1"
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Usa valores negativos (ej. -5) para rotura o merma.
                </span>
              </div>

              <div>
                <label className="text-xs text-stone-300 block mb-1">
                  Motivo justificado (RN-06 obligatorio):
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ej. Vasos rajados por calor"
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {adjustmentError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {adjustmentError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setSelectedSupplyForAdjustment(null)}
                className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteAdjustment}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Registrar Ajuste en Kardex
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Inventory Setup Modal */}
      {isOpeningSetupOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <h3 className="text-base font-bold text-white">Configurar Inventario de Apertura</h3>
                <p className="text-xs text-stone-400">
                  Ajusta los saldos iniciales y costos comprobados sin generar egresos ficticios en caja.
                </p>
              </div>
              <button
                onClick={() => setIsOpeningSetupOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-stone-800/80 max-h-[400px] overflow-y-auto pr-1">
              {supplies.map((s) => (
                <div key={s.id} className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
                  <div>
                    <span className="font-semibold text-white block">{s.name}</span>
                    <span className="text-[11px] text-stone-400">Unidad: {s.baseUnit}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Stock Inicial:</label>
                    <input
                      type="number"
                      value={openingStockInputs[s.id]?.qty ?? s.stockQuantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setOpeningStockInputs((prev) => ({
                          ...prev,
                          [s.id]: { ...prev[s.id], qty: val },
                        }));
                      }}
                      className="w-full h-9 px-2 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">Costo Unitario (S/):</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={((openingStockInputs[s.id]?.costMicros ?? s.avgCostMicros) / 1000000).toFixed(4)}
                      onChange={(e) => {
                        const soles = parseFloat(e.target.value) || 0;
                        setOpeningStockInputs((prev) => ({
                          ...prev,
                          [s.id]: { ...prev[s.id], costMicros: Math.round(soles * 1000000) },
                        }));
                      }}
                      className="w-full h-9 px-2 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                onClick={() => setIsOpeningSetupOpen(false)}
                className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOpeningInventory}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Guardar Inventario Inicial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
