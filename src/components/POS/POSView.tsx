import React, { useState } from 'react';
import { 
  Coffee, 
  CircleDot, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  Banknote, 
  CreditCard, 
  Receipt, 
  RotateCcw,
  Sparkles,
  Lock,
  ArrowRight,
  Printer
} from 'lucide-react';
import { Product, Supply, CashSession, Sale, CartItemOption } from '../../types';
import { formatPEN } from '../../utils/money';
import { storage } from '../../services/storage';
import { formatDateTimeInLima } from '../../utils/date';

interface CartItem {
  cartId: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  options: CartItemOption;
}

interface POSViewProps {
  products: Product[];
  supplies: Supply[];
  activeSession: CashSession | null;
  onOpenCashSessionModal: () => void;
  onSaleCompleted?: (sale: Sale) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  supplies,
  activeSession,
  onOpenCashSessionModal,
  onSaleCompleted,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSugar, setSelectedSugar] = useState<'blanca' | 'rubia' | 'sin_azucar'>('blanca');
  const [withLid, setWithLid] = useState(true);

  // Payment Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'yape' | 'mixed'>('cash');
  const [tenderedCashInput, setTenderedCashInput] = useState<string>('');
  const [mixedCashInput, setMixedCashInput] = useState<string>('');
  const [mixedYapeInput, setMixedYapeInput] = useState<string>('');
  
  // Processing & Idempotency
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `pos_${Date.now()}_${Math.random()}`);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Receipt Modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Calculate cart total in cents
  const totalCents = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  // Stock checks for quick alert
  const supplyMap = new Map(supplies.map((s) => [s.id, s]));
  const vasosStock = supplyMap.get('sup_vaso_8oz')?.stockQuantity || 0;
  const roscaStock = supplyMap.get('sup_rosca')?.stockQuantity || 0;
  const cafeStock = supplyMap.get('sup_cafe')?.stockQuantity || 0;

  // Add Item to Cart
  const handleAddToCart = (product: Product) => {
    setErrorMessage(null);
    const options: CartItemOption = product.id === 'prod_cafe_8oz'
      ? { sugar: selectedSugar, withLid }
      : { sugar: 'sin_azucar', withLid: false };

    // Check if item with exact same options exists in cart
    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.options.sugar === options.sugar &&
        item.options.withLid === options.withLid
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        cartId: `cart_${Date.now()}_${Math.random()}`,
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: 1,
        options,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setErrorMessage(null);
  };

  // Quick preset tender buttons (S/ 5, 10, 20, 50, Exacto)
  const setPresetCash = (amountSoles: number) => {
    setTenderedCashInput(amountSoles.toFixed(2));
  };

  const tenderedCashCents = tenderedCashInput ? Math.round(parseFloat(tenderedCashInput) * 100) : totalCents;
  const changeCents = Math.max(0, tenderedCashCents - totalCents);

  // Proceed to Checkout
  const handleOpenCheckout = () => {
    if (!activeSession) {
      setErrorMessage('La caja está cerrada. Debes abrir la caja antes de registrar ventas.');
      return;
    }
    if (cart.length === 0) return;
    setErrorMessage(null);
    setTenderedCashInput((totalCents / 100).toFixed(2));
    setMixedCashInput((Math.floor(totalCents / 2) / 100).toFixed(2));
    setMixedYapeInput(((totalCents - Math.floor(totalCents / 2)) / 100).toFixed(2));
    setIdempotencyKey(`pos_${Date.now()}_${Math.random()}`);
    setIsCheckoutOpen(true);
  };

  // Submit Sale with Idempotency and Atomic Execution
  const handleConfirmSale = () => {
    if (isSubmitting) return; // Prevent double click
    setErrorMessage(null);

    let cashCents = 0;
    let yapeCents = 0;

    if (paymentMethod === 'cash') {
      cashCents = totalCents;
      if (tenderedCashCents < totalCents) {
        setErrorMessage(`El efectivo entregado (${formatPEN(tenderedCashCents)}) es menor al total (${formatPEN(totalCents)}).`);
        return;
      }
    } else if (paymentMethod === 'yape') {
      yapeCents = totalCents;
    } else if (paymentMethod === 'mixed') {
      cashCents = Math.round(parseFloat(mixedCashInput || '0') * 100);
      yapeCents = Math.round(parseFloat(mixedYapeInput || '0') * 100);
      if (cashCents + yapeCents !== totalCents) {
        setErrorMessage(
          `La suma de efectivo (${formatPEN(cashCents)}) y Yape (${formatPEN(yapeCents)}) debe ser exactamente ${formatPEN(totalCents)}.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = storage.processSale({
        idempotencyKey,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          options: i.options,
        })),
        payments: {
          cashCents,
          yapeCents,
        },
        tenderedCashCents: paymentMethod === 'cash' ? tenderedCashCents : undefined,
      });

      if (!result.success || !result.sale) {
        setErrorMessage(result.error || 'No se pudo completar la venta');
        setIsSubmitting(false);
        return;
      }

      // Success
      setCompletedSale(result.sale);
      setCart([]);
      setIsCheckoutOpen(false);
      if (onSaleCompleted) {
        onSaleCompleted(result.sale);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado al registrar venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Box closed banner alert */}
      {!activeSession && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Caja cerrada actualmente</p>
              <p className="text-xs text-amber-300/80">Debes abrir el turno con el saldo inicial antes de registrar ventas.</p>
            </div>
          </div>
          <button
            onClick={onOpenCashSessionModal}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Abrir Caja Ahora <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Products Catalog on Left, Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Products & Customization Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" />
              Punto de Venta Rápido (POS)
            </h2>
            <span className="text-xs text-stone-400">Precios oficiales en PEN</span>
          </div>

          {/* Customization Options Bar for Coffee */}
          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
              <span>Personalización para Café 8 oz:</span>
              <span className="text-stone-400 font-normal">Se aplica al agregar café</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sugar Selector */}
              <div>
                <label className="text-[11px] text-stone-400 block mb-1.5">Variante de Azúcar:</label>
                <div className="grid grid-cols-3 gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setSelectedSugar('blanca')}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      selectedSugar === 'blanca'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Blanca
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSugar('rubia')}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      selectedSugar === 'rubia'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Rubia
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSugar('sin_azucar')}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      selectedSugar === 'sin_azucar'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Sin azúcar
                  </button>
                </div>
              </div>

              {/* Lid Option */}
              <div>
                <label className="text-[11px] text-stone-400 block mb-1.5">Tapa de 8 oz:</label>
                <div className="grid grid-cols-2 gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setWithLid(true)}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      withLid ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Con Tapa
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithLid(false)}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      !withLid ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Sin Tapa
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Big Product Action Buttons (Section 10.2: priorizar botones a un pulgar) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => {
              const isCoffee = product.id === 'prod_cafe_8oz';
              const stockStatus = isCoffee ? vasosStock : roscaStock;
              const hasLowStock = stockStatus < (isCoffee ? 20 : 8);

              return (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="group relative text-left p-6 rounded-3xl bg-stone-900 border border-stone-800 hover:border-amber-600/70 hover:bg-stone-850 shadow-md transition-all active:scale-[0.98] min-h-[140px] flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-700/30 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {isCoffee ? <Coffee className="w-6 h-6" /> : <CircleDot className="w-6 h-6" />}
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-bold text-white block">
                        {formatPEN(product.priceCents)}
                      </span>
                      <span className="text-[11px] text-stone-400">por {product.unit}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-amber-300 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs mt-1 text-stone-400">
                      <span>{isCoffee ? 'Receta activa (2g café)' : 'Unidad de reventa'}</span>
                      <span className={hasLowStock ? 'text-amber-400 font-semibold' : 'text-stone-400'}>
                        Stock: {stockStatus} {product.unit}s
                      </span>
                    </div>
                  </div>

                  {/* Corner Tap Hint */}
                  <div className="mt-3 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-amber-400 font-medium">
                    <span>Toque para agregar</span>
                    <Plus className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Insumo stock status quick cards */}
          <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 text-xs">
            <div className="flex items-center justify-between text-stone-400 mb-2 font-medium">
              <span>Disponibilidad de insumos críticos:</span>
              <span>Actualizado en tiempo real</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-stone-950/60 border border-stone-800">
                <span className="text-stone-400 block text-[10px]">Café soluble</span>
                <span className="font-mono font-bold text-stone-200">{cafeStock} g</span>
              </div>
              <div className="p-2 rounded-xl bg-stone-950/60 border border-stone-800">
                <span className="text-stone-400 block text-[10px]">Vasos 8 oz</span>
                <span className="font-mono font-bold text-stone-200">{vasosStock} und</span>
              </div>
              <div className="p-2 rounded-xl bg-stone-950/60 border border-stone-800">
                <span className="text-stone-400 block text-[10px]">Roscas</span>
                <span className="font-mono font-bold text-stone-200">{roscaStock} und</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cart & Checkout Column */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>Orden Actual</span>
                {cart.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-300 border border-amber-600/30">
                    {cart.reduce((s, i) => s + i.quantity, 0)} {cart.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                )}
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vaciar
                </button>
              )}
            </div>

            {/* Error prompt */}
            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Items List */}
            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-stone-500 space-y-2">
                  <Coffee className="w-10 h-10 mx-auto text-stone-600 opacity-60" />
                  <p className="text-sm font-medium">El carrito está vacío</p>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto">
                    Selecciona Café 8 oz o Rosca para iniciar una venta inmediata.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartId}
                    className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-stone-200 truncate">
                        {item.productName}
                      </h4>
                      {item.productId === 'prod_cafe_8oz' && (
                        <p className="text-[11px] text-amber-400/90">
                          {item.options.sugar === 'sin_azucar' ? 'Sin azúcar' : `Azúcar ${item.options.sugar}`}
                          {item.options.withLid ? ' · Con tapa' : ' · Sin tapa'}
                        </p>
                      )}
                      <span className="font-mono text-xs text-stone-400">
                        {formatPEN(item.unitPriceCents)} c/u
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center bg-stone-900 rounded-xl border border-stone-700/60 p-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.cartId, -1)}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-sm px-3 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.cartId, 1)}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono font-bold text-sm text-white w-16 text-right">
                        {formatPEN(item.unitPriceCents * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Bottom Summary & Checkout Button */}
          <div className="pt-4 border-t border-stone-800 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-stone-400 text-sm font-medium">Total a cobrar:</span>
              <span className="font-mono text-3xl font-extrabold text-amber-400">
                {formatPEN(totalCents)}
              </span>
            </div>

            <button
              disabled={cart.length === 0 || !activeSession}
              onClick={handleOpenCheckout}
              className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                cart.length > 0 && activeSession
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 active:scale-[0.98]'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              <span>Cobrar {formatPEN(totalCents)}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Checkout & Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                Registrar Cobro
              </h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-stone-400 hover:text-white text-sm"
              >
                Cancelar
              </button>
            </div>

            {/* Total Highlight */}
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
              <span className="text-sm font-medium text-amber-200">Total a Pagar</span>
              <span className="font-mono text-3xl font-extrabold text-amber-400">
                {formatPEN(totalCents)}
              </span>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('yape')}
                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'yape'
                    ? 'bg-purple-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
                Yape
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('mixed')}
                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'mixed'
                    ? 'bg-stone-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Mixto
              </button>
            </div>

            {/* Method Details */}
            {paymentMethod === 'cash' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-stone-300 block mb-1.5 font-medium">
                    Efectivo Recibido (S/):
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={tenderedCashInput}
                    onChange={(e) => setTenderedCashInput(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-stone-950 border border-stone-700 font-mono text-xl font-bold text-white focus:outline-none focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Quick Bills Buttons */}
                <div>
                  <span className="text-[11px] text-stone-400 block mb-1">Billetes y atajos rápidos:</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPresetCash(totalCents / 100)}
                      className="py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium"
                    >
                      Exacto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetCash(5.00)}
                      className="py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium"
                    >
                      S/ 5.00
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetCash(10.00)}
                      className="py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium"
                    >
                      S/ 10.00
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetCash(20.00)}
                      className="py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium"
                    >
                      S/ 20.00
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetCash(50.00)}
                      className="py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium"
                    >
                      S/ 50.00
                    </button>
                  </div>
                </div>

                {/* Change / Vuelto Display */}
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-400 block">Vuelto para el cliente:</span>
                    <span className="text-[11px] text-stone-500">Solo en efectivo</span>
                  </div>
                  <span className={`font-mono text-2xl font-bold ${changeCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPEN(changeCents)}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'yape' && (
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-800/40 mx-auto flex items-center justify-center text-purple-300">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Cobro por Yape (Digital)</h4>
                  <p className="text-xs text-purple-300 font-mono mt-1">Celular: 987 654 321</p>
                </div>
                <p className="text-[11px] text-purple-300/80 leading-relaxed border-t border-purple-800/40 pt-2">
                  Nota (RN-05): Confirmado manualmente por el operador al verificar la pantalla del cliente. El sistema no afirma verificación bancaria automática.
                </p>
              </div>
            )}

            {paymentMethod === 'mixed' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-400">
                  Ingresa las cantidades exactas pagadas por cada medio (deben sumar {formatPEN(totalCents)}):
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-300 block mb-1">Monto en Efectivo:</label>
                    <input
                      type="number"
                      step="0.10"
                      value={mixedCashInput}
                      onChange={(e) => setMixedCashInput(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-300 block mb-1">Monto en Yape:</label>
                    <input
                      type="number"
                      step="0.10"
                      value={mixedYapeInput}
                      onChange={(e) => setMixedYapeInput(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-stone-950 border border-stone-700 font-mono text-base font-bold text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Confirm Payment Button (Section 10.2: 48-56px button) */}
            <div className="pt-2">
              <button
                disabled={isSubmitting}
                onClick={handleConfirmSale}
                className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  isSubmitting
                    ? 'bg-stone-700 text-stone-400 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? (
                  <span>Procesando venta...</span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirmar Cobro ({formatPEN(totalCents)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">¡Venta Exitosa!</h3>
              <p className="text-xs text-stone-400 mt-1">
                Comprobante interno · {formatDateTimeInLima(completedSale.createdAt)}
              </p>
              <p className="text-[11px] font-mono text-stone-400 mt-0.5">ID: {completedSale.id}</p>
            </div>

            {/* Receipt Details Box */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-left space-y-2 text-xs">
              <div className="space-y-1 pb-2 border-b border-stone-800">
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-stone-200">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="font-mono font-medium">
                      {formatPEN(item.unitPriceCents * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-white pt-1">
                <span>Total Cobrado:</span>
                <span className="font-mono text-amber-400">{formatPEN(completedSale.totalCents)}</span>
              </div>

              <div className="pt-2 text-[11px] text-stone-400 space-y-0.5">
                {completedSale.payments.cashCents > 0 && (
                  <div className="flex justify-between">
                    <span>Efectivo:</span>
                    <span className="font-mono">{formatPEN(completedSale.payments.cashCents)}</span>
                  </div>
                )}
                {completedSale.payments.yapeCents > 0 && (
                  <div className="flex justify-between">
                    <span>Yape:</span>
                    <span className="font-mono">{formatPEN(completedSale.payments.yapeCents)}</span>
                  </div>
                )}
                {completedSale.changeCents !== undefined && completedSale.changeCents > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Vuelto Entregado:</span>
                    <span className="font-mono">{formatPEN(completedSale.changeCents)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
