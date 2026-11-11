import React, { useState } from 'react';
import { 
  Wallet, 
  Lock, 
  Unlock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Plus, 
  FileText,
  UserCheck
} from 'lucide-react';
import { CashSession, Expense } from '../../types';
import { formatPEN } from '../../utils/money';
import { storage } from '../../services/storage';
import { formatDateTimeInLima } from '../../utils/date';

interface CashViewProps {
  activeSession: CashSession | null;
  sessions: CashSession[];
  expenses: Expense[];
  onSessionUpdated?: () => void;
}

export const CashView: React.FC<CashViewProps> = ({
  activeSession,
  sessions,
  expenses,
  onSessionUpdated,
}) => {
  // Modal states
  const [isOpenSessionModal, setIsOpenSessionModal] = useState(false);
  const [openingInput, setOpeningInput] = useState<string>('20.00');

  const [isCloseSessionModal, setIsCloseSessionModal] = useState(false);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<'operativo' | 'retiro_dueño'>('operativo');
  const [expenseAmountInput, setExpenseAmountInput] = useState<string>('');
  const [expenseNote, setExpenseNote] = useState<string>('');
  const [expenseAccount, setExpenseAccount] = useState<'cash' | 'yape'>('cash');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle open cash
  const handleConfirmOpenSession = () => {
    setErrorMsg(null);
    const amountCents = Math.round(parseFloat(openingInput || '0') * 100);
    if (amountCents < 0) {
      setErrorMsg('El monto de apertura no puede ser negativo.');
      return;
    }
    const res = storage.openCashSession(amountCents);
    if (res.success) {
      setIsOpenSessionModal(false);
      if (onSessionUpdated) onSessionUpdated();
    } else {
      setErrorMsg(res.error || 'Error al abrir caja');
    }
  };

  // Handle close cash
  const handleConfirmCloseSession = () => {
    if (!activeSession) return;
    setErrorMsg(null);
    const countedCents = Math.round(parseFloat(countedCashInput || '0') * 100);
    const difference = countedCents - activeSession.expectedCashCents;

    if (difference !== 0 && !closeNotes.trim()) {
      setErrorMsg('Hay una diferencia en el cuadre. Debes escribir una observación explicativa (TC-14).');
      return;
    }

    const res = storage.closeCashSession(activeSession.id, countedCents, closeNotes);
    if (res.success) {
      setIsCloseSessionModal(false);
      setCountedCashInput('');
      setCloseNotes('');
      if (onSessionUpdated) onSessionUpdated();
    } else {
      setErrorMsg(res.error || 'Error al cerrar caja');
    }
  };

  // Handle expense / withdrawal
  const handleConfirmExpense = () => {
    setErrorMsg(null);
    const amountCents = Math.round(parseFloat(expenseAmountInput || '0') * 100);
    if (amountCents <= 0) {
      setErrorMsg('El monto debe ser mayor a 0.');
      return;
    }
    if (!expenseNote.trim()) {
      setErrorMsg('Debes ingresar una descripción o motivo.');
      return;
    }

    const res = storage.addExpense({
      category: expenseType,
      amountCents,
      account: expenseAccount,
      note: expenseNote,
    });

    if (res.success) {
      setIsExpenseModalOpen(false);
      setExpenseAmountInput('');
      setExpenseNote('');
      if (onSessionUpdated) onSessionUpdated();
    } else {
      setErrorMsg(res.error || 'Error al registrar egreso');
    }
  };

  const countedCentsCalc = countedCashInput ? Math.round(parseFloat(countedCashInput) * 100) : (activeSession?.expectedCashCents || 0);
  const diffCalc = activeSession ? countedCentsCalc - activeSession.expectedCashCents : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-400" />
            <span>Control de Caja & Arqueo Diario</span>
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Conciliación de billetes y monedas físicos separada de cobros digitales en Yape.
          </p>
        </div>

        <div>
          {activeSession ? (
            <button
              onClick={() => {
                setCountedCashInput((activeSession.expectedCashCents / 100).toFixed(2));
                setIsCloseSessionModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>Arqueo y Cerrar Caja</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOpenSessionModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Nuevo Turno de Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Session Status Cards */}
      {activeSession ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Expected cash */}
          <div className="p-6 rounded-3xl bg-stone-900 border border-emerald-800/60 shadow-md">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Efectivo Físico Esperado
              </span>
              <Unlock className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-white block mt-2">
              {formatPEN(activeSession.expectedCashCents)}
            </span>
            <div className="mt-4 pt-3 border-t border-stone-800 text-xs text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>Saldo de apertura:</span>
                <span className="font-mono text-stone-300">{formatPEN(activeSession.openingCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Iniciado:</span>
                <span>{formatDateTimeInLima(activeSession.openingAt)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Digital Yape */}
          <div className="p-6 rounded-3xl bg-stone-900 border border-purple-800/60 shadow-md">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Cobrado por Yape (Digital)
              </span>
              <span className="text-xs text-purple-400 font-mono">987 654 321</span>
            </div>
            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-purple-300 block mt-2">
              {formatPEN(activeSession.yapeCollectedCents)}
            </span>
            <div className="mt-4 pt-3 border-t border-stone-800 text-xs text-stone-400">
              <p className="leading-relaxed">
                No se mezcla en el cajón físico. Se concilia por separado contra el historial digital de la app.
              </p>
            </div>
          </div>

          {/* Card 3: Quick Outflows */}
          <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-2">
                Movimientos de Salida
              </span>
              <p className="text-xs text-stone-400 mb-3">
                Registra retiros de utilidad para el dueño o egresos menores de operación.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => {
                  setExpenseType('retiro_dueño');
                  setIsExpenseModalOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Retiro Dueño</span>
              </button>
              <button
                onClick={() => {
                  setExpenseType('operativo');
                  setIsExpenseModalOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                <span>Gasto Operativo</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-stone-900 border border-stone-800 text-center space-y-3">
          <Lock className="w-10 h-10 text-stone-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No hay ninguna caja abierta en este momento</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Abre un turno con el fondo para cambio (ej. S/ 20.00) para habilitar las ventas y cobros en el mostrador.
          </p>
          <button
            onClick={() => setIsOpenSessionModal(true)}
            className="mt-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-lg"
          >
            <Unlock className="w-4 h-4" />
            <span>Abrir Caja Ahora</span>
          </button>
        </div>
      )}

      {/* Expenses & Withdrawals of this Session */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Registro de Salidas y Retiros ({expenses.length})</span>
          </h3>
          <span className="text-xs text-stone-400">RN-08: Retiros del dueño no son costo de mercadería</span>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-stone-500 text-center py-6">
            No se han registrado retiros ni egresos adicionales en este periodo.
          </p>
        ) : (
          <div className="divide-y divide-stone-800/60 max-h-[300px] overflow-y-auto pr-1">
            {expenses.map((exp) => (
              <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">{exp.note}</span>
                  <span className="text-[11px] text-stone-400">
                    {exp.category === 'retiro_dueño' ? 'Retiro de Dueño (Utilidad)' : 'Gasto Operativo'} · Cuenta:{' '}
                    {exp.account === 'cash' ? 'Efectivo en Caja' : 'Yape'}
                  </span>
                </div>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  -{formatPEN(exp.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Sessions Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-stone-800 pb-3">
          <History className="w-4 h-4 text-amber-400" />
          <span>Historial de Sesiones de Caja</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400">
                <th className="py-2.5 px-3">Fecha Negocio</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Apertura</th>
                <th className="py-2.5 px-3 text-right">Efectivo Esperado</th>
                <th className="py-2.5 px-3 text-right">Contado Real</th>
                <th className="py-2.5 px-3 text-right">Diferencia</th>
                <th className="py-2.5 px-3 text-right">Yape Digital</th>
                <th className="py-2.5 px-3">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-stone-850 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-white">
                    {s.businessDate}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.state === 'open'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-stone-800 text-stone-300'
                    }`}>
                      {s.state === 'open' ? 'ABIERTA' : 'CERRADA'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-stone-300">
                    {formatPEN(s.openingCents)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                    {formatPEN(s.expectedCashCents)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-stone-200">
                    {s.countedCashCents !== undefined ? formatPEN(s.countedCashCents) : '-'}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                    (s.differenceCashCents || 0) === 0
                      ? 'text-emerald-400'
                      : (s.differenceCashCents || 0) < 0
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}>
                    {s.differenceCashCents !== undefined ? formatPEN(s.differenceCashCents) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-300">
                    {formatPEN(s.yapeCollectedCents)}
                  </td>
                  <td className="py-2.5 px-3 text-stone-400 truncate max-w-xs">
                    {s.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Open Cash Session */}
      {isOpenSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-400" />
              <span>Apertura de Turno</span>
            </h3>

            <p className="text-xs text-stone-400">
              Ingresa el saldo físico inicial contado en caja (fondo para dar vuelto):
            </p>

            <div>
              <label className="text-xs text-stone-300 block mb-1">Monto de Apertura (S/):</label>
              <input
                type="number"
                step="1"
                min="0"
                value={openingInput}
                onChange={(e) => setOpeningInput(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-stone-950 border border-stone-700 font-mono text-2xl font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsOpenSessionModal(false)}
                className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmOpenSession}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirmar Apertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Close Cash Session (Arqueo) */}
      {isCloseSessionModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <span>Arqueo y Cierre del Día</span>
              </h3>
              <button
                onClick={() => setIsCloseSessionModal(false)}
                className="text-stone-400 hover:text-white text-sm"
              >
                Cancelar
              </button>
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Saldo de apertura:</span>
                <span className="font-mono">{formatPEN(activeSession.openingCents)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Cobrado por Yape (digital):</span>
                <span className="font-mono text-purple-300">{formatPEN(activeSession.yapeCollectedCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-2 border-t border-stone-800">
                <span>Efectivo Físico Esperado:</span>
                <span className="font-mono text-base text-amber-400">
                  {formatPEN(activeSession.expectedCashCents)}
                </span>
              </div>
            </div>

            {/* Counted Cash Input */}
            <div>
              <label className="text-xs text-stone-300 font-semibold block mb-1">
                Dinero Físico Realmente Contado (S/):
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                value={countedCashInput}
                onChange={(e) => setCountedCashInput(e.target.value)}
                placeholder="85.00"
                className="w-full h-12 px-4 rounded-xl bg-stone-950 border border-stone-700 font-mono text-xl font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Difference badge */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-400 block">Diferencia de Cuadre:</span>
                <span className="text-[11px] text-stone-500">
                  {diffCalc === 0 ? 'Cuadre perfecto' : diffCalc < 0 ? 'Faltante en caja' : 'Sobrante en caja'}
                </span>
              </div>
              <span className={`font-mono text-2xl font-bold ${
                diffCalc === 0 ? 'text-emerald-400' : diffCalc < 0 ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {formatPEN(diffCalc)}
              </span>
            </div>

            {/* Notes if difference */}
            <div>
              <label className="text-xs text-stone-300 block mb-1">
                Observaciones del Arqueo:
              </label>
              <input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder={diffCalc !== 0 ? 'Explica el motivo del descuadre...' : 'Turno cerrado sin novedades'}
                className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleConfirmCloseSession}
              className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg cursor-pointer"
            >
              Confirmar Cierre Inmutable de Caja
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Expense / Withdrawal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {expenseType === 'retiro_dueño' ? 'Retiro de Dueño (Utilidad)' : 'Gasto Operativo'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-300 block mb-1">Monto (S/):</label>
                <input
                  type="number"
                  step="0.50"
                  min="0.50"
                  value={expenseAmountInput}
                  onChange={(e) => setExpenseAmountInput(e.target.value)}
                  placeholder="5.00"
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-lg font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Motivo / Descripción:</label>
                <input
                  type="text"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder={expenseType === 'retiro_dueño' ? 'Retiro personal del dueño' : 'Compra de bolsas / servilletas'}
                  className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Medio / Cuenta:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpenseAccount('cash')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      expenseAccount === 'cash'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    Efectivo de Caja
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseAccount('yape')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      expenseAccount === 'yape'
                        ? 'bg-purple-700 border-purple-600 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    Yape
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmExpense}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Registrar Salida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
