import React, { useState } from 'react';
import { 
  Settings, 
  Tag, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCcw, 
  Sparkles,
  QrCode,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Product, BusinessSettings } from '../../types';
import { formatPEN } from '../../utils/money';
import { storage } from '../../services/storage';
import { runAllQATests, TestResult } from '../../services/qaTests';

interface SettingsViewProps {
  products: Product[];
  settings: BusinessSettings;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  products,
  settings,
  onRefresh,
}) => {
  // Product price inputs
  const [cafePriceInput, setCafePriceInput] = useState<string>(
    ((products.find((p) => p.id === 'prod_cafe_8oz')?.priceCents || 250) / 100).toFixed(2)
  );
  const [roscaPriceInput, setRoscaPriceInput] = useState<string>(
    ((products.find((p) => p.id === 'prod_rosca')?.priceCents || 200) / 100).toFixed(2)
  );

  // Business settings
  const [bizName, setBizName] = useState(settings.name);
  const [yapePhone, setYapePhone] = useState(settings.yapePhone || '987 654 321');
  const [yapeOwner, setYapeOwner] = useState(settings.yapeOwnerName || 'Punto de Venta Central');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // QA Runner States
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [qaResults, setQaResults] = useState<TestResult[] | null>(null);

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    const cafeCents = Math.round(parseFloat(cafePriceInput) * 100);
    const roscaCents = Math.round(parseFloat(roscaPriceInput) * 100);

    storage.updateProductPrice('prod_cafe_8oz', cafeCents);
    storage.updateProductPrice('prod_rosca', roscaCents);
    storage.updateSettings({
      name: bizName,
      yapePhone,
      yapeOwnerName: yapeOwner,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  const handleRunQASuite = async () => {
    setIsRunningTests(true);
    try {
      const results = await runAllQATests();
      setQaResults(results);
    } finally {
      setIsRunningTests(false);
      onRefresh();
    }
  };

  const handleLoadDemo = () => {
    storage.loadIllustrativeDemoDay();
    onRefresh();
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Seguro que deseas reiniciar el sistema a los valores iniciales de fábrica?')) {
      storage.resetToFreshDefaults();
      onRefresh();
    }
  };

  const passedCount = qaResults ? qaResults.filter((r) => r.status === 'passed').length : 0;
  const totalCount = qaResults ? qaResults.length : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          <span>Configuración & Verificación QA</span>
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Ajustes de precios, datos comerciales y suite de pruebas automáticas del SRS (TC-01 a TC-20).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Form Column */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSavePrices} className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs">
            <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-stone-800 pb-3">
              <Tag className="w-4 h-4 text-amber-400" />
              <span>Precios de Venta Oficiales</span>
            </h3>

            <p className="text-stone-400">
              Ambos precios son editables. Los nuevos precios se aplicarán a ventas futuras y jamás alteran registros históricos (RN-03).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-stone-300 font-semibold block mb-1">
                  Precio Café instantáneo 8 oz (S/):
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0.50"
                  value={cafePriceInput}
                  onChange={(e) => setCafePriceInput(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">Inicial: S/ 2.50</span>
              </div>

              <div>
                <label className="text-stone-300 font-semibold block mb-1">
                  Precio Rosca tradicional (S/):
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0.50"
                  value={roscaPriceInput}
                  onChange={(e) => setRoscaPriceInput(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">Inicial: S/ 2.00</span>
              </div>
            </div>

            <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-stone-800 pt-3 pb-3">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Datos del Negocio & Yape</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-stone-300 block mb-1">Nombre Comercial:</label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Número de Yape:</label>
                  <input
                    type="text"
                    value={yapePhone}
                    onChange={(e) => setYapePhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Titular Yape:</label>
                  <input
                    type="text"
                    value={yapeOwner}
                    onChange={(e) => setYapeOwner(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-700 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                className="h-11 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors cursor-pointer shadow-md"
              >
                Guardar Cambios
              </button>
              {savedSuccess && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Cambios guardados
                </span>
              )}
            </div>
          </form>

          {/* Sandbox & Reset Controls */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-stone-800 pb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Simulación & Datos de Demostración</span>
            </h3>

            <p className="text-stone-400 leading-relaxed">
              Carga el día ilustrativo de la Sección 9.2 (30 cafés, 20 roscas, S/ 115 ventas, S/ 85 efectivo esperado) para comprobar el balance o resetea todo a nuevo.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-800/40 font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Cargar Día Ilustrativo 9.2
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-rose-950/60 text-rose-300 border border-stone-700 font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar Valores Fábrica
              </button>
            </div>
          </div>
        </div>

        {/* QA Suite Column */}
        <div className="lg:col-span-6 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Suite de Aseguramiento de Calidad (QA)</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Verifica casos críticos TC-01 a TC-20 (Rúbrica de aceptación)
              </p>
            </div>

            <button
              disabled={isRunningTests}
              onClick={handleRunQASuite}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isRunningTests
                  ? 'bg-stone-700 text-stone-400 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningTests ? 'Ejecutando...' : 'Ejecutar Pruebas QA'}</span>
            </button>
          </div>

          {qaResults ? (
            <div className="space-y-4">
              {/* Scorecard */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 block">Rúbrica de Calidad:</span>
                  <span className="font-bold text-white text-sm">
                    {passedCount} de {totalCount} Casos Aprobados
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-2xl font-black ${passedCount === totalCount ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {Math.round((passedCount / totalCount) * 100)}%
                  </span>
                  <span className="text-[10px] text-stone-400 block">Aceptación P0</span>
                </div>
              </div>

              {/* Tests Results List */}
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {qaResults.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {t.status === 'passed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span className="font-mono font-bold text-amber-300">{t.id}</span>
                        <span className="font-semibold text-white truncate max-w-[200px]">{t.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-stone-400">{t.durationMs}ms</span>
                    </div>

                    <div className="text-[11px] text-stone-400 pl-6 space-y-0.5">
                      <p><span className="text-stone-500">Escenario:</span> {t.scenario}</p>
                      <p><span className="text-stone-500">Esperado:</span> {t.expected}</p>
                      {t.actual && (
                        <p className="text-stone-300 font-mono"><span className="text-stone-500 font-sans">Resultado:</span> {t.actual}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-stone-500 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-stone-600 opacity-60" />
              <p className="text-sm font-medium">Pruebas automáticas listas para ejecutar</p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Presiona "Ejecutar Pruebas QA" para validar atomicidad, idempotencia, reverso de anulaciones y cálculo de céntimos sin flotantes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
