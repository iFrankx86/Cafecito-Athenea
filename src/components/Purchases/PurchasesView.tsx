import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Banknote, 
  QrCode, 
  CreditCard,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { Supply, Purchase, CashSession } from '../../types';
import { formatPEN, formatUnitCostMicros } from '../../utils/money';
import { storage } from '../../services/storage';

interface PurchasesViewProps {
  supplies: Supply[];
  purchases: Purchase[];
  activeSession: CashSession | null;
  onPurchaseAdded?: (purchase: Purchase) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  supplies,
  purchases,
  activeSession,
  onPurchaseAdded,
}) => {
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>(supplies[0]?.id || 'sup_vaso_8oz');
  const [packageName, setPackageName] = useState('Caja 100 unidades');
  const [packageCount, setPackageCount] = useState<number>(1);
  const [unitsPerPackage, setUnitsPerPackage] = useState<number>(100);
  const [totalCostInput, setTotalCostInput] = useState<string>('14.00');
  const [paymentAccount, setPaymentAccount] = useState<'cash' | 'yape' | 'credit'>('cash');
  const [supplier, setSupplier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedSupply = supplies.find((s) => s.id === selectedSupplyId);
  const totalUnits = packageCount * unitsPerPackage;
  const totalCents = Math.round(parseFloat(totalCostInput || '0') * 100);
  const unitCostSoles = totalUnits > 0 ? (totalCents / 100) / totalUnits : 0;

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedSupply) {
      setError('Selecciona un insumo.');
      return;
    }
    if (totalUnits <= 0) {
      setError('La cantidad total de unidades debe ser mayor a 0.');
      return;
    }
    if (totalCents <= 0) {
      setError('El costo total debe ser mayor a 0.');
      return;
    }

    if (paymentAccount === 'cash' && !activeSession) {
      setError('Para pagar en efectivo la caja debe estar abierta.');
      return;
    }

    const res = storage.recordPurchase({
      supplyId: selectedSupply.id,
      packageName,
      packageCount,
      unitsPerPackage,
      totalCents,
      paidAccount: paymentAccount,
      supplier: supplier.trim() || undefined,
    });

    if (res.success && res.purchase) {
      setSuccessMsg(`Compra registrada con éxito: +${totalUnits} ${selectedSupply.baseUnit} de ${selectedSupply.name}`);
      setTotalCostInput('');
      setSupplier('');
      if (onPurchaseAdded) onPurchaseAdded(res.purchase);
    } else {
      setError(res.error || 'Error al registrar compra');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-amber-400" />
          <span>Compras de Insumos & Reposición</span>
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Ingreso por paquetes, conversión automática a unidades base y recálculo de costo promedio ponderado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div className="lg:col-span-6 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-stone-800 pb-3">
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nueva Orden de Compra</span>
          </h3>

          <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
            {/* Supply select */}
            <div>
              <label className="text-stone-300 font-semibold block mb-1.5">
                Insumo a reponer:
              </label>
              <select
                value={selectedSupplyId}
                onChange={(e) => setSelectedSupplyId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                {supplies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Stock actual: {s.stockQuantity} {s.baseUnit})
                  </option>
                ))}
              </select>
            </div>

            {/* Package description */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="text-stone-300 block mb-1">Nombre Presentación:</label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="Ej. Caja, Paquete"
                  className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Cant. Paquetes:</label>
                <input
                  type="number"
                  min="1"
                  value={packageCount}
                  onChange={(e) => setPackageCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">
                  Unidades / Paquete ({selectedSupply?.baseUnit}):
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerPackage}
                  onChange={(e) => setUnitsPerPackage(parseFloat(e.target.value) || 1)}
                  className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white font-mono"
                />
              </div>
            </div>

            {/* Cost & supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-stone-300 font-semibold block mb-1">
                  Importe Total Pagado (S/):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  value={totalCostInput}
                  onChange={(e) => setTotalCostInput(e.target.value)}
                  placeholder="14.00"
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Proveedor (Opcional):</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ej. Distribuidora Santa Anita"
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white"
                />
              </div>
            </div>

            {/* Payment Account */}
            <div>
              <label className="text-stone-300 font-semibold block mb-1.5">
                Medio de Desembolso / Pago:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentAccount('cash')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    paymentAccount === 'cash'
                      ? 'bg-amber-600 border-amber-500 text-white font-bold'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4 mx-auto mb-1" />
                  Efectivo Caja
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentAccount('yape')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    paymentAccount === 'yape'
                      ? 'bg-purple-700 border-purple-600 text-white font-bold'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 mx-auto mb-1" />
                  Yape
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentAccount('credit')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    paymentAccount === 'credit'
                      ? 'bg-stone-700 border-stone-600 text-white font-bold'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1" />
                  A Crédito
                </button>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                {paymentAccount === 'cash' && 'Reduce el saldo de caja física en este turno.'}
                {paymentAccount === 'yape' && 'Registra salida financiera digital.'}
                {paymentAccount === 'credit' && 'Incrementa inventario sin reducir efectivo de caja inmediatamente.'}
              </span>
            </div>

            {/* Summary preview card */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-400">Total unidades a ingresar:</span>
                <span className="font-mono font-bold text-white">
                  +{totalUnits} {selectedSupply?.baseUnit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Costo unitario calculado:</span>
                <span className="font-mono font-bold text-amber-300">
                  S/ {unitCostSoles.toFixed(4)} / {selectedSupply?.baseUnit}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md active:scale-98 transition-all cursor-pointer"
            >
              Confirmar Ingreso de Mercadería
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="lg:col-span-6 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Historial de Compras ({purchases.length})</span>
            </h3>
            <span className="text-xs text-stone-400">Entradas a inventario</span>
          </div>

          {purchases.length === 0 ? (
            <div className="py-12 text-center text-stone-500 space-y-2">
              <ShoppingBag className="w-8 h-8 mx-auto text-stone-600 opacity-60" />
              <p className="text-sm font-medium">No hay compras registradas</p>
              <p className="text-xs text-stone-400">
                Registra tu primera compra con el formulario para actualizar el costo promedio ponderado.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-800/60 max-h-[460px] overflow-y-auto pr-1">
              {purchases.map((p) => (
                <div key={p.id} className="py-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span>{p.supplyName}</span>
                    <span className="font-mono text-amber-400">{formatPEN(p.totalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-400 text-[11px]">
                    <span>
                      {p.packageName} ({p.totalBaseUnits} unidades)
                    </span>
                    <span className="font-mono">
                      {formatUnitCostMicros(p.unitCostMicros)} c/u
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-400 text-[10px] pt-0.5">
                    <span>{p.createdAt.slice(0, 10)} {p.createdAt.slice(11, 16)} hrs</span>
                    <span className="capitalize text-stone-300">
                      Pago: {p.paidAccount === 'cash' ? 'Efectivo' : p.paidAccount === 'yape' ? 'Yape' : 'Crédito'}
                      {p.supplier ? ` · ${p.supplier}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
