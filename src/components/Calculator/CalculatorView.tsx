import React, { useState } from 'react';
import { 
  Calculator, 
  Coffee, 
  CircleDot, 
  TrendingUp, 
  Layers, 
  HelpCircle, 
  Sparkles,
  Percent,
  CheckCircle2,
  DollarSign,
  Flame,
  Info
} from 'lucide-react';
import { Supply, Product } from '../../types';
import { 
  formatPEN, 
  formatUnitCostMicros, 
  calculateMarginPercent, 
  calculateContributionCents, 
  calculatePriceForTargetMargin, 
  roundToCommercialHalfSol 
} from '../../utils/money';

interface CalculatorViewProps {
  supplies: Supply[];
  products: Product[];
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  supplies,
  products,
}) => {
  const [activeTab, setActiveTab] = useState<'cafe' | 'rosca' | 'termo'>('termo');

  // Termo Calculator State
  const [thermoLiters, setThermoLiters] = useState<number>(5);
  const [portionMl, setPortionMl] = useState<number>(200); // 200 ml sugerido por PRD para 8 oz

  // Simulation Parameters for Coffee
  const [cafeGrams, setCafeGrams] = useState<number>(2);
  const [includeLid, setIncludeLid] = useState<boolean>(true);
  const [sugarType, setSugarType] = useState<'blanca' | 'rubia' | 'sin_azucar'>('blanca');
  const [waterMl, setWaterMl] = useState<number>(200);
  const [includeStirrer, setIncludeStirrer] = useState<boolean>(true);
  const [includeNapkin, setIncludeNapkin] = useState<boolean>(true);
  const [overheadCents, setOverheadCents] = useState<number>(7); // S/ 0.07 agua/energía

  // Target Margin Slider (e.g. 60%)
  const [targetMargin, setTargetMargin] = useState<number>(60);

  // Rosca Resale Simulation State (Section 8.2)
  const [roscaPackageCost, setRoscaPackageCost] = useState<string>('20.00');
  const [roscaPackageUnits, setRoscaPackageUnits] = useState<number>(20);

  // Retrieve current active supply costs from DB
  const supplyMap = new Map(supplies.map((s) => [s.id, s]));
  const cafeSupply = supplyMap.get('sup_cafe');
  const vasoSupply = supplyMap.get('sup_vaso_8oz');
  const tapaSupply = supplyMap.get('sup_tapa_8oz');
  const azucarBlanca = supplyMap.get('sup_azucar_blanca');
  const azucarRubia = supplyMap.get('sup_azucar_rubia');
  const palitoSupply = supplyMap.get('sup_palito');
  const servilletaSupply = supplyMap.get('sup_servilleta');
  const roscaSupply = supplyMap.get('sup_rosca');

  // Current Selling Prices
  const cafeProduct = products.find((p) => p.id === 'prod_cafe_8oz');
  const roscaProduct = products.find((p) => p.id === 'prod_rosca');
  const cafePriceCents = cafeProduct?.priceCents || 250;
  const roscaPriceCents = roscaProduct?.priceCents || 200;

  // Calculate Coffee Cost Components in Micros
  const cafeCostMicros = cafeGrams * (cafeSupply?.avgCostMicros || 196650);
  const vasoCostMicros = 1 * (vasoSupply?.avgCostMicros || 140000);
  const tapaCostMicros = includeLid ? 1 * (tapaSupply?.avgCostMicros || 140000) : 0;
  
  let sugarCostMicros = 0;
  if (sugarType === 'blanca') sugarCostMicros = 1 * (azucarBlanca?.avgCostMicros || 56900);
  else if (sugarType === 'rubia') sugarCostMicros = 1 * (azucarRubia?.avgCostMicros || 56900);

  const palitoCostMicros = includeStirrer ? 1 * (palitoSupply?.avgCostMicros || 50000) : 0;
  const servilletaCostMicros = includeNapkin ? 1 * (servilletaSupply?.avgCostMicros || 80000) : 0;
  const overheadMicros = overheadCents * 10000;

  const totalCoffeeCostMicros =
    cafeCostMicros +
    vasoCostMicros +
    tapaCostMicros +
    sugarCostMicros +
    palitoCostMicros +
    servilletaCostMicros +
    overheadMicros;

  const totalCoffeeCostCents = Math.round(totalCoffeeCostMicros / 10000);
  const coffeeContributionCents = calculateContributionCents(cafePriceCents, totalCoffeeCostCents);
  const coffeeMarginPercent = calculateMarginPercent(cafePriceCents, totalCoffeeCostCents);
  const coffeeMarkupPercent = totalCoffeeCostCents > 0 ? (coffeeContributionCents / totalCoffeeCostCents) * 100 : 0;

  // Target price calculation
  const suggestedPriceCents = calculatePriceForTargetMargin(totalCoffeeCostCents, targetMargin);
  const suggestedCommercialPriceCents = roundToCommercialHalfSol(suggestedPriceCents);

  // Rosca Cost Calculations
  const roscaCostPerUnitSoles = roscaPackageUnits > 0 ? parseFloat(roscaPackageCost || '0') / roscaPackageUnits : 0;
  const roscaCostCents = Math.round(roscaCostPerUnitSoles * 100);
  const roscaContributionCents = calculateContributionCents(roscaPriceCents, roscaCostCents);
  const roscaMarginPercent = calculateMarginPercent(roscaPriceCents, roscaCostCents);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Calculator className="w-6 h-6 text-amber-400" />
          <span>Calculadora de Costos, Precios & Margen</span>
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Modelo financiero riguroso según Sección 8 del PRD. Distingue margen comercial de recargo/markup.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-stone-950 p-1 rounded-2xl border border-stone-800 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('termo')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'termo' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>Rendimiento Termo (5L → Vasos 8 oz)</span>
        </button>
        <button
          onClick={() => setActiveTab('cafe')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'cafe' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Café 8 oz (Receta)</span>
        </button>
        <button
          onClick={() => setActiveTab('rosca')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'rosca' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Roscas (Reventa)</span>
        </button>
      </div>

      {/* Coffee Tab */}
      {activeTab === 'cafe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Recipe Adjustments & Inputs */}
          <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-stone-800 pb-3">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Desglose de Receta Vaso 8 oz</span>
            </h3>

            <div className="space-y-4 text-xs">
              {/* Table of items */}
              <div className="divide-y divide-stone-800/80">
                {/* 1. Cafe */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Café soluble</span>
                    <span className="text-[11px] text-stone-400">
                      Dosificación: {cafeGrams} g (base S/ 39.33 / 100 sobres)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={cafeGrams}
                      onChange={(e) => setCafeGrams(parseFloat(e.target.value) || 2)}
                      className="w-16 h-8 px-2 rounded-lg bg-stone-950 border border-stone-700 font-mono text-center text-white"
                    />
                    <span className="font-mono text-stone-300 w-20 text-right font-medium">
                      {formatUnitCostMicros(cafeCostMicros)}
                    </span>
                  </div>
                </div>

                {/* 2. Vaso */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Vaso descartable 8 oz</span>
                    <span className="text-[11px] text-stone-400">1 unidad por café</span>
                  </div>
                  <span className="font-mono text-stone-300 font-medium">
                    {formatUnitCostMicros(vasoCostMicros)}
                  </span>
                </div>

                {/* 3. Tapa */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Tapa de 8 oz</span>
                    <span className="text-[11px] text-stone-400">Opcional en mostrador</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIncludeLid(!includeLid)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        includeLid ? 'bg-amber-600/30 text-amber-300 border border-amber-600/50' : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      {includeLid ? 'Incluida' : 'Omitida'}
                    </button>
                    <span className="font-mono text-stone-300 w-20 text-right font-medium">
                      {formatUnitCostMicros(tapaCostMicros)}
                    </span>
                  </div>
                </div>

                {/* 4. Azúcar */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Sobre de azúcar (5 g)</span>
                    <span className="text-[11px] text-stone-400">Variante seleccionada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={sugarType}
                      onChange={(e) => setSugarType(e.target.value as any)}
                      className="h-8 px-2 rounded-lg bg-stone-950 border border-stone-700 text-white text-[11px]"
                    >
                      <option value="blanca">Blanca (S/ 0.0569)</option>
                      <option value="rubia">Rubia (S/ 0.0569)</option>
                      <option value="sin_azucar">Sin azúcar (S/ 0.00)</option>
                    </select>
                    <span className="font-mono text-stone-300 w-20 text-right font-medium">
                      {formatUnitCostMicros(sugarCostMicros)}
                    </span>
                  </div>
                </div>

                {/* 5. Palito */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Palito removedor</span>
                    <span className="text-[11px] text-stone-400">1 unidad</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeStirrer}
                      onChange={(e) => setIncludeStirrer(e.target.checked)}
                      className="accent-amber-600 w-4 h-4"
                    />
                    <span className="font-mono text-stone-300 w-20 text-right font-medium">
                      {formatUnitCostMicros(palitoCostMicros)}
                    </span>
                  </div>
                </div>

                {/* 6. Servilleta / merma */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Servilleta y merma</span>
                    <span className="text-[11px] text-stone-400">Consumible estimativo</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeNapkin}
                      onChange={(e) => setIncludeNapkin(e.target.checked)}
                      className="accent-amber-600 w-4 h-4"
                    />
                    <span className="font-mono text-stone-300 w-20 text-right font-medium">
                      {formatUnitCostMicros(servilletaCostMicros)}
                    </span>
                  </div>
                </div>

                {/* 7. Agua y energía */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Agua potable y energía / gas</span>
                    <span className="text-[11px] text-stone-400">Costo indirecto variable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={overheadCents}
                      onChange={(e) => setOverheadCents(parseInt(e.target.value, 10) || 0)}
                      className="w-16 h-8 px-2 rounded-lg bg-stone-950 border border-stone-700 font-mono text-center text-white"
                    />
                    <span className="text-[11px] text-stone-400">céntimos</span>
                    <span className="font-mono text-stone-300 w-16 text-right font-medium">
                      {formatPEN(overheadCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Variable Cost Bar */}
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-200 block">COSTO VARIABLE UNITARIO</span>
                  <span className="text-[11px] text-stone-400 font-mono">
                    Σ de insumos: S/ {(totalCoffeeCostMicros / 1000000).toFixed(4)}
                  </span>
                </div>
                <span className="font-mono text-2xl font-black text-amber-300">
                  {formatPEN(totalCoffeeCostCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Margins, Projections & Target Matrix */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Indicators Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-stone-800 pb-3">
                <Percent className="w-4 h-4 text-emerald-400" />
                <span>Métricas de Rentabilidad</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Precio de venta actual:</span>
                  <span className="font-mono font-bold text-white text-base">
                    {formatPEN(cafePriceCents)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Contribución bruta por vaso:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {formatPEN(coffeeContributionCents)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Margen de contribución (%):</span>
                  <span className="font-mono font-extrabold text-teal-300 text-lg">
                    {coffeeMarginPercent.toFixed(1)} %
                  </span>
                </div>

                <div className="flex justify-between items-center text-stone-400 text-[11px] pt-1 border-t border-stone-800">
                  <span>Recargo sobre costo (Markup):</span>
                  <span className="font-mono text-stone-300">{coffeeMarkupPercent.toFixed(1)} %</span>
                </div>
              </div>

              {/* Target margin slider */}
              <div className="pt-3 border-t border-stone-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-stone-300">Margen Objetivo Deseado:</span>
                  <span className="text-amber-400 font-mono font-bold">{targetMargin}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="80"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Precio matemático exacto:</span>
                    <span className="font-mono font-semibold text-white">
                      {formatPEN(suggestedPriceCents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Sugerencia comercial (paso S/ 0.50):</span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatPEN(suggestedCommercialPriceCents)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Volume Scenarios Matrix (Section 8.1) */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-stone-400">
                Simulación de Volumen (10, 30, 50, 100 Vasos)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 text-[11px]">
                      <th className="py-2">Vasos</th>
                      <th className="py-2 text-right">Ingreso Bruto</th>
                      <th className="py-2 text-right">Costo Total</th>
                      <th className="py-2 text-right">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-mono">
                    {[10, 30, 50, 100].map((qty) => {
                      const revenue = qty * cafePriceCents;
                      const cost = qty * totalCoffeeCostCents;
                      const profit = revenue - cost;

                      return (
                        <tr key={qty} className="hover:bg-stone-850">
                          <td className="py-2 text-stone-300 font-bold">{qty} und</td>
                          <td className="py-2 text-right text-stone-300">{formatPEN(revenue)}</td>
                          <td className="py-2 text-right text-rose-400">-{formatPEN(cost)}</td>
                          <td className="py-2 text-right text-emerald-400 font-bold">{formatPEN(profit)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rosca Resale Tab (Section 8.2) */}
      {activeTab === 'rosca' && (
        <div className="max-w-xl mx-auto bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-stone-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CircleDot className="w-5 h-5 text-amber-400" />
              <span>Costeo de Rosca (Producto de Reventa)</span>
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              RN-10: La rosca no tiene receta; se costea según el paquete de compra del proveedor.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-stone-300 block mb-1">Precio Paquete Comprado (S/):</label>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  value={roscaPackageCost}
                  onChange={(e) => setRoscaPackageCost(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Roscas que contiene el paquete:</label>
                <input
                  type="number"
                  min="1"
                  value={roscaPackageUnits}
                  onChange={(e) => setRoscaPackageUnits(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Results breakdown */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Costo de compra por unidad:</span>
                <span className="font-mono font-bold text-base text-amber-400">
                  {formatPEN(roscaCostCents)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-400">Precio de venta al público:</span>
                <span className="font-mono font-bold text-base text-white">
                  {formatPEN(roscaPriceCents)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-stone-800">
                <span className="text-stone-300 font-semibold">Contribución bruta por rosca:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-lg">
                  {formatPEN(roscaContributionCents)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-300 font-semibold">Margen de ganancia comercial:</span>
                <span className="font-mono font-extrabold text-teal-300 text-lg">
                  {roscaMarginPercent.toFixed(1)} %
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Ejemplo (Sección 8.2): Comprar 20 roscas a S/ 20.00 da un costo de S/ 1.00 por unidad. Al venderse a S/ 2.00, genera S/ 1.00 de contribución y un margen del 50.0% antes de gastos generales.
            </p>
          </div>
        </div>
      )}

      {/* Termo Capacity & Yield Tab */}
      {activeTab === 'termo' && (
        <div className="space-y-6">
          {/* Main Hero Card for Termo */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Rendimiento de Bebida Caliente
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Cálculo de Vasos de 8 oz por Termo de {thermoLiters} Litros
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  1 Litro = 1,000 ml · Vaso de 8 onzas líquidas = ≈236.6 ml capacidad nominal.
                </p>
              </div>

              {/* Liters quick selector */}
              <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
                <span className="text-xs text-stone-400 px-2 font-medium">Capacidad:</span>
                {[2, 3, 5, 8, 10].map((liters) => (
                  <button
                    key={liters}
                    type="button"
                    onClick={() => setThermoLiters(liters)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      thermoLiters === liters
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {liters}L
                  </button>
                ))}
              </div>
            </div>

            {/* Core Big Answer Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: 200 ml (Operational Recommended) */}
              <div className="p-6 rounded-3xl bg-amber-950/40 border-2 border-amber-600/80 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-700/60 inline-block mb-1">
                    ★ Recomendado en Operación
                  </span>
                  <h4 className="text-sm font-bold text-white">Servido Operativo (200 ml)</h4>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    Deja ~1.5 cm libre para evitar quemaduras y derrames al tapar o disolver azúcar.
                  </p>
                </div>

                <div className="my-4">
                  <span className="font-mono text-4xl sm:text-5xl font-black text-amber-300 block">
                    {Math.floor((thermoLiters * 1000) / 200)} vasos
                  </span>
                  <span className="text-xs text-amber-200 font-mono">
                    {((thermoLiters * 1000) % 200) === 0 ? 'Exactos, sin desperdicio' : `+ ${((thermoLiters * 1000) % 200)} ml remanente`}
                  </span>
                </div>

                <div className="pt-3 border-t border-amber-800/60 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-200">
                    <span>Venta total (a S/ 2.50):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatPEN(Math.floor((thermoLiters * 1000) / 200) * 250)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400 text-[11px]">
                    <span>Café necesario (2g/vaso):</span>
                    <span className="font-mono font-semibold text-white">
                      {Math.floor((thermoLiters * 1000) / 200) * 2} g ({(Math.floor((thermoLiters * 1000) / 200))} sobres)
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 2: 220 ml (Generous fill) */}
              <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-md flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Llenado Generoso
                  </span>
                  <h4 className="text-sm font-bold text-white">Porción 220 ml</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Vaso bastante lleno, dejando un pequeño margen superior para la tapa.
                  </p>
                </div>

                <div className="my-4">
                  <span className="font-mono text-4xl sm:text-5xl font-extrabold text-white block">
                    {Math.floor((thermoLiters * 1000) / 220)} vasos
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    y sobran {(thermoLiters * 1000) % 220} ml
                  </span>
                </div>

                <div className="pt-3 border-t border-stone-800 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-300">
                    <span>Venta total (a S/ 2.50):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatPEN(Math.floor((thermoLiters * 1000) / 220) * 250)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400 text-[11px]">
                    <span>Café necesario:</span>
                    <span className="font-mono text-stone-300">
                      {Math.floor((thermoLiters * 1000) / 220) * 2} g
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 3: 236 ml (Nominal maximum) */}
              <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-md flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Capacidad Máxima 8 oz
                  </span>
                  <h4 className="text-sm font-bold text-white">Nominal al Ras (236.6 ml)</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    8 oz líquidas estadounidenses llenadas hasta el borde físico del vaso.
                  </p>
                </div>

                <div className="my-4">
                  <span className="font-mono text-4xl sm:text-5xl font-extrabold text-stone-300 block">
                    {Math.floor((thermoLiters * 1000) / 236.59)} vasos
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    y sobran ≈ {Math.round((thermoLiters * 1000) % 236.59)} ml
                  </span>
                </div>

                <div className="pt-3 border-t border-stone-800 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-300">
                    <span>Venta total (a S/ 2.50):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatPEN(Math.floor((thermoLiters * 1000) / 236.59) * 250)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400 text-[11px]">
                    <span>Café necesario:</span>
                    <span className="font-mono text-stone-300">
                      {Math.floor((thermoLiters * 1000) / 236.59) * 2} g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Practical Preparation Table for Termo */}
            <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <span>¿Cómo preparar tu termo de {thermoLiters}L para vender 25 cafés de 8 oz?</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block text-[11px]">Agua caliente en termo:</span>
                  <span className="font-mono font-bold text-white text-base">5,000 ml (5 Litros)</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block text-[11px]">Vasos descartables 8 oz:</span>
                  <span className="font-mono font-bold text-amber-300 text-base">25 unidades</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block text-[11px]">Café soluble necesario:</span>
                  <span className="font-mono font-bold text-white text-base">50 gramos (25 sobres)</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block text-[11px]">Venta estimada por termo:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">S/ 62.50</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed pt-2 border-t border-stone-800/80">
                <strong>Consejo de operación:</strong> Si preparas el café directamente disuelto dentro del termo de 5L, usa 50 gramos de café soluble (o 25 sobres de 2g). Si mantienes solo agua caliente en el termo y agregas el sobre en el vaso al momento de la venta, el agua te alcanzará exactamente para servir <strong>25 vasos de 200 ml</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

