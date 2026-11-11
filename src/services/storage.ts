/**
 * Persistence and Domain Service for Café & Roscas | Control
 * Implements atomic transactional sales, idempotency, weighted average cost,
 * stock decrement by recipe, cash session ledger, and kardex tracking.
 */

import {
  Product,
  Supply,
  Recipe,
  Sale,
  StockMovement,
  CashSession,
  Expense,
  ExpenseCategory,
  Purchase,
  AuditEvent,
  BusinessSettings,
  CartItemOption,
} from '../types';
import { getTodayLimaDate } from '../utils/date';
import { microsToCents, MICROS_PER_CENT } from '../utils/money';

const STORAGE_KEYS = {
  SETTINGS: 'cr_settings_v1',
  PRODUCTS: 'cr_products_v1',
  SUPPLIES: 'cr_supplies_v1',
  RECIPES: 'cr_recipes_v1',
  SALES: 'cr_sales_v1',
  MOVEMENTS: 'cr_stock_movements_v1',
  CASH_SESSIONS: 'cr_cash_sessions_v1',
  EXPENSES: 'cr_expenses_v1',
  PURCHASES: 'cr_purchases_v1',
  AUDIT: 'cr_audit_events_v1',
  IDEMPOTENCY: 'cr_idempotency_v1',
};

// Initial Business Settings
const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'biz_01',
  name: 'Café & Roscas',
  currency: 'PEN',
  timezone: 'America/Lima',
  yapePhone: '987 654 321',
  yapeOwnerName: 'Punto de Venta Central',
  roundPriceDecimals: true,
  targetMarginPercent: 60,
};

// Initial Products
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_cafe_8oz',
    name: 'Café instantáneo 8 oz',
    type: 'prepared',
    priceCents: 250, // S/ 2.50
    active: true,
    unit: 'vaso',
    recipeVersion: 1,
  },
  {
    id: 'prod_rosca',
    name: 'Rosca tradicional',
    type: 'resale',
    priceCents: 200, // S/ 2.00
    active: true,
    unit: 'und',
  },
];

// Initial Supplies with reference costs from PRD tables (p. 6 & 7)
// Note: Insumo costs in micro-soles (1 Sol = 1,000,000 micros)
const DEFAULT_SUPPLIES: Supply[] = [
  {
    id: 'sup_cafe',
    name: 'Café soluble',
    category: 'ingrediente',
    baseUnit: 'g',
    stockQuantity: 200, // 100 sobres de 2g = 200 g
    avgCostMicros: 196650, // S/ 39.33 / 200g = S/ 0.19665/g (2g = S/ 0.3933)
    minStock: 30,
    active: true,
  },
  {
    id: 'sup_vaso_8oz',
    name: 'Vaso 8 oz descartable',
    category: 'insumo',
    baseUnit: 'und',
    stockQuantity: 100,
    avgCostMicros: 140000, // S/ 14.00 / 100 = S/ 0.1400
    minStock: 20,
    active: true,
  },
  {
    id: 'sup_tapa_8oz',
    name: 'Tapa para vaso 8 oz',
    category: 'insumo',
    baseUnit: 'und',
    stockQuantity: 100,
    avgCostMicros: 140000, // S/ 14.00 / 100 = S/ 0.1400
    minStock: 20,
    active: true,
  },
  {
    id: 'sup_azucar_blanca',
    name: 'Azúcar blanca (sobre 5 g)',
    category: 'ingrediente',
    baseUnit: 'und',
    stockQuantity: 100,
    avgCostMicros: 56900, // S/ 5.69 / 100 = S/ 0.0569
    minStock: 25,
    active: true,
  },
  {
    id: 'sup_azucar_rubia',
    name: 'Azúcar rubia (sobre 5 g)',
    category: 'ingrediente',
    baseUnit: 'und',
    stockQuantity: 100,
    avgCostMicros: 56900, // S/ 5.69 / 100 = S/ 0.0569
    minStock: 25,
    active: true,
  },
  {
    id: 'sup_palito',
    name: 'Palito removedor',
    category: 'insumo',
    baseUnit: 'und',
    stockQuantity: 100,
    avgCostMicros: 50000, // S/ 5.00 / 100 = S/ 0.0500
    minStock: 20,
    active: true,
  },
  {
    id: 'sup_agua',
    name: 'Agua purificada',
    category: 'ingrediente',
    baseUnit: 'ml',
    stockQuantity: 15000, // 15 Litros
    avgCostMicros: 350, // 200 ml = S/ 0.0700 (350 micros/ml)
    minStock: 3000,
    active: true,
  },
  {
    id: 'sup_servilleta',
    name: 'Servilleta de papel',
    category: 'consumible',
    baseUnit: 'und',
    stockQuantity: 100,
    avgCostMicros: 80000, // Estimación S/ 0.0800
    minStock: 20,
    active: true,
  },
  {
    id: 'sup_rosca',
    name: 'Rosca fresca (unidad)',
    category: 'reventa',
    baseUnit: 'und',
    stockQuantity: 25,
    avgCostMicros: 1000000, // S/ 1.0000 costo referencial
    minStock: 8,
    active: true,
  },
];

// Initial Recipe for Café 8 oz (Version 1)
const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'rec_cafe_8oz_v1',
    productId: 'prod_cafe_8oz',
    version: 1,
    effectiveAt: '2026-11-01',
    lines: [
      { supplyId: 'sup_cafe', quantity: 2 }, // 2 gramos de café
      { supplyId: 'sup_vaso_8oz', quantity: 1 }, // 1 vaso
      { supplyId: 'sup_tapa_8oz', quantity: 1, optional: true, variantKey: 'lid' }, // 1 tapa
      { supplyId: 'sup_palito', quantity: 1 }, // 1 palito
      { supplyId: 'sup_agua', quantity: 200 }, // 200 ml agua
      { supplyId: 'sup_servilleta', quantity: 1 }, // 1 servilleta
    ],
    overheadCents: 7, // S/ 0.07 gastos indirectos variables (electricidad/gas)
  },
];

class StorageService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Storage listener error:', err);
      }
    });
  }

  private get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notify();
    } catch (err) {
      console.error('Storage write error for key:', key, err);
    }
  }

  private ensureInitialized() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.set(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIES)) {
      this.set(STORAGE_KEYS.SUPPLIES, DEFAULT_SUPPLIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECIPES)) {
      this.set(STORAGE_KEYS.RECIPES, DEFAULT_RECIPES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      this.set(STORAGE_KEYS.SALES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
      // Record initial opening inventory movements without fake cash deduction
      const initialMovements: StockMovement[] = DEFAULT_SUPPLIES.map((sup) => ({
        id: `mov_init_${sup.id}`,
        supplyId: sup.id,
        supplyName: sup.name,
        type: 'initial_inventory',
        quantityDelta: sup.stockQuantity,
        costSnapshotMicros: sup.avgCostMicros,
        sourceType: 'opening',
        sourceId: 'inventory_opening',
        note: 'Inventario inicial de apertura',
        date: getTodayLimaDate(),
        timestamp: new Date().toISOString(),
      }));
      this.set(STORAGE_KEYS.MOVEMENTS, initialMovements);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASH_SESSIONS)) {
      // Open initial cash session for today with S/ 20.00
      const today = getTodayLimaDate();
      const initialSession: CashSession = {
        id: `cs_${today}_01`,
        businessDate: today,
        openingCents: 2000, // S/ 20.00
        openingAt: new Date().toISOString(),
        expectedCashCents: 2000,
        yapeCollectedCents: 0,
        state: 'open',
        notes: 'Apertura de turno inicial',
      };
      this.set(STORAGE_KEYS.CASH_SESSIONS, [initialSession]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      this.set(STORAGE_KEYS.EXPENSES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
      this.set(STORAGE_KEYS.PURCHASES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
      this.set(STORAGE_KEYS.AUDIT, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.IDEMPOTENCY)) {
      this.set(STORAGE_KEYS.IDEMPOTENCY, {});
    }
  }

  // --- GETTERS ---
  public getSettings(): BusinessSettings {
    return this.get<BusinessSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public getProducts(): Product[] {
    return this.get<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  }

  public getSupplies(): Supply[] {
    return this.get<Supply[]>(STORAGE_KEYS.SUPPLIES, DEFAULT_SUPPLIES);
  }

  public getRecipes(): Recipe[] {
    return this.get<Recipe[]>(STORAGE_KEYS.RECIPES, DEFAULT_RECIPES);
  }

  public getSales(): Sale[] {
    return this.get<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  public getMovements(): StockMovement[] {
    return this.get<StockMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  }

  public getCashSessions(): CashSession[] {
    return this.get<CashSession[]>(STORAGE_KEYS.CASH_SESSIONS, []);
  }

  public getExpenses(): Expense[] {
    return this.get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  public getPurchases(): Purchase[] {
    return this.get<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  public getAuditEvents(): AuditEvent[] {
    return this.get<AuditEvent[]>(STORAGE_KEYS.AUDIT, []);
  }

  public getActiveCashSession(): CashSession | null {
    const sessions = this.getCashSessions();
    const today = getTodayLimaDate();
    // Prefer open session for today, or any open session
    return sessions.find((s) => s.state === 'open' && s.businessDate === today) ||
      sessions.find((s) => s.state === 'open') ||
      null;
  }

  // --- COST CALCULATION ENGINE ---
  /**
   * Calculate current unit cost in céntimos and micros for a given product and customization options
   */
  public calculateProductCost(
    productId: string,
    options?: CartItemOption
  ): { costCents: number; costMicros: number; breakdown: Array<{ name: string; costMicros: number; quantity: number; unit: string }> } {
    const supplies = this.getSupplies();
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));

    if (productId === 'prod_rosca') {
      const roscaSupply = supplyMap.get('sup_rosca');
      const micros = roscaSupply?.avgCostMicros || 0;
      return {
        costCents: microsToCents(micros),
        costMicros: micros,
        breakdown: [
          {
            name: 'Rosca (unidad reventa)',
            costMicros: micros,
            quantity: 1,
            unit: 'und',
          },
        ],
      };
    }

    // Café 8 oz
    const recipes = this.getRecipes();
    const recipe = recipes.find((r) => r.productId === productId && r.version === 1) || recipes[0];
    const breakdown: Array<{ name: string; costMicros: number; quantity: number; unit: string }> = [];

    let totalMicros = 0;

    if (recipe) {
      for (const line of recipe.lines) {
        if (line.variantKey === 'lid' && options && !options.withLid) {
          continue; // Lid was skipped
        }
        const supply = supplyMap.get(line.supplyId);
        if (supply) {
          const lineCost = line.quantity * supply.avgCostMicros;
          totalMicros += lineCost;
          breakdown.push({
            name: supply.name,
            costMicros: lineCost,
            quantity: line.quantity,
            unit: supply.baseUnit,
          });
        }
      }

      // Sugar selection
      const sugarType = options?.sugar || 'blanca';
      if (sugarType !== 'sin_azucar') {
        const sugarSupplyId = sugarType === 'rubia' ? 'sup_azucar_rubia' : 'sup_azucar_blanca';
        const sugarSupply = supplyMap.get(sugarSupplyId);
        if (sugarSupply) {
          const sugarCost = 1 * sugarSupply.avgCostMicros;
          totalMicros += sugarCost;
          breakdown.push({
            name: sugarSupply.name,
            costMicros: sugarCost,
            quantity: 1,
            unit: 'und',
          });
        }
      }

      // Overhead (water/energy/gas)
      if (recipe.overheadCents > 0) {
        const overheadMicros = recipe.overheadCents * MICROS_PER_CENT;
        totalMicros += overheadMicros;
        breakdown.push({
          name: 'Agua, energía y costos indirectos',
          costMicros: overheadMicros,
          quantity: 1,
          unit: 'prep',
        });
      }
    }

    return {
      costCents: microsToCents(totalMicros),
      costMicros: totalMicros,
      breakdown,
    };
  }

  // --- ATOMIC SALE TRANSACTION ---
  public processSale(params: {
    idempotencyKey: string;
    items: Array<{
      productId: string;
      quantity: number;
      options?: CartItemOption;
    }>;
    payments: {
      cashCents: number;
      yapeCents: number;
    };
    tenderedCashCents?: number;
    userId?: string;
  }): { success: boolean; sale?: Sale; error?: string } {
    const { idempotencyKey, items, payments, tenderedCashCents, userId = 'owner' } = params;

    // 1. Idempotency Check (RF-06, RNF-04, TC-04, TC-05)
    const idempotencyStore = this.get<Record<string, string>>(STORAGE_KEYS.IDEMPOTENCY, {});
    if (idempotencyStore[idempotencyKey]) {
      const existingSaleId = idempotencyStore[idempotencyKey];
      const sales = this.getSales();
      const existingSale = sales.find((s) => s.id === existingSaleId);
      if (existingSale) {
        return { success: true, sale: existingSale };
      }
    }

    // 2. Validate Cash Session is Open (RF-14, TC-15)
    const activeSession = this.getActiveCashSession();
    if (!activeSession) {
      return {
        success: false,
        error: 'La caja está cerrada. Debes abrir la caja antes de registrar ventas.',
      };
    }

    // 3. Validate items & calculate totals
    const products = this.getProducts();
    const productMap = new Map(products.map((p) => [p.id, p]));
    const supplies = this.getSupplies();
    const supplyMap = new Map(supplies.map((s) => [s.id, { ...s }]));

    let calculatedTotalCents = 0;
    const saleItems: Sale['items'] = [];

    // Temporary accumulator to verify stock and prepare kardex
    const requiredSupplies: Record<string, number> = {};

    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod || !prod.active) {
        return { success: false, error: `Producto no disponible: ${item.productId}` };
      }
      if (item.quantity <= 0) {
        return { success: false, error: 'La cantidad debe ser mayor a cero' };
      }

      const costInfo = this.calculateProductCost(item.productId, item.options);
      const lineTotal = prod.priceCents * item.quantity;
      calculatedTotalCents += lineTotal;

      saleItems.push({
        productId: prod.id,
        productName: prod.name,
        quantity: item.quantity,
        unitPriceCents: prod.priceCents,
        unitCostSnapshotCents: costInfo.costCents,
        options: item.options,
        recipeUsedVersion: prod.recipeVersion || 1,
      });

      // Accumulate required supplies for stock decrement
      if (prod.id === 'prod_rosca') {
        requiredSupplies['sup_rosca'] = (requiredSupplies['sup_rosca'] || 0) + item.quantity;
      } else if (prod.id === 'prod_cafe_8oz') {
        requiredSupplies['sup_cafe'] = (requiredSupplies['sup_cafe'] || 0) + 2 * item.quantity;
        requiredSupplies['sup_vaso_8oz'] = (requiredSupplies['sup_vaso_8oz'] || 0) + 1 * item.quantity;
        if (item.options?.withLid !== false) {
          requiredSupplies['sup_tapa_8oz'] = (requiredSupplies['sup_tapa_8oz'] || 0) + 1 * item.quantity;
        }
        requiredSupplies['sup_palito'] = (requiredSupplies['sup_palito'] || 0) + 1 * item.quantity;
        requiredSupplies['sup_agua'] = (requiredSupplies['sup_agua'] || 0) + 200 * item.quantity;
        requiredSupplies['sup_servilleta'] = (requiredSupplies['sup_servilleta'] || 0) + 1 * item.quantity;

        const sugar = item.options?.sugar || 'blanca';
        if (sugar === 'blanca') {
          requiredSupplies['sup_azucar_blanca'] = (requiredSupplies['sup_azucar_blanca'] || 0) + 1 * item.quantity;
        } else if (sugar === 'rubia') {
          requiredSupplies['sup_azucar_rubia'] = (requiredSupplies['sup_azucar_rubia'] || 0) + 1 * item.quantity;
        }
      }
    }

    // 4. Validate Payments (RN-04, TC-03)
    const paidSum = payments.cashCents + payments.yapeCents;
    if (paidSum !== calculatedTotalCents) {
      return {
        success: false,
        error: `El pago (${paidSum / 100} S/) debe ser igual al total de la venta (${calculatedTotalCents / 100} S/).`,
      };
    }

    // 5. Validate Stock (RN-09, TC-06)
    for (const [supId, neededQty] of Object.entries(requiredSupplies)) {
      const supply = supplyMap.get(supId);
      if (!supply) {
        return { success: false, error: `Insumo no encontrado: ${supId}` };
      }
      if (supply.stockQuantity < neededQty) {
        return {
          success: false,
          error: `Stock insuficiente de "${supply.name}". Disponible: ${supply.stockQuantity} ${supply.baseUnit}, requerido: ${neededQty} ${supply.baseUnit}.`,
        };
      }
    }

    // 6. Execute atomic deductions & create sale record
    const saleId = `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const today = getTodayLimaDate();
    const nowIso = new Date().toISOString();

    let changeCents = 0;
    if (tenderedCashCents !== undefined && tenderedCashCents > payments.cashCents) {
      changeCents = tenderedCashCents - payments.cashCents;
    }

    const newSale: Sale = {
      id: saleId,
      idempotencyKey,
      businessDate: today,
      userId,
      status: 'completed',
      items: saleItems,
      totalCents: calculatedTotalCents,
      payments,
      tenderedCashCents,
      changeCents,
      createdAt: nowIso,
    };

    // Decrement stock and build stock movements
    const movements = this.getMovements();
    const newMovements: StockMovement[] = [];

    for (const [supId, neededQty] of Object.entries(requiredSupplies)) {
      const supply = supplyMap.get(supId)!;
      supply.stockQuantity -= neededQty;
      newMovements.push({
        id: `mov_${saleId}_${supId}`,
        supplyId: supId,
        supplyName: supply.name,
        type: 'sale_consumption',
        quantityDelta: -neededQty,
        costSnapshotMicros: supply.avgCostMicros,
        sourceType: 'sale',
        sourceId: saleId,
        note: `Venta ${saleId}`,
        date: today,
        timestamp: nowIso,
      });
    }

    // Update Cash Session with payments
    const cashSessions = this.getCashSessions();
    const sessionIndex = cashSessions.findIndex((s) => s.id === activeSession.id);
    if (sessionIndex >= 0) {
      cashSessions[sessionIndex].expectedCashCents += payments.cashCents;
      cashSessions[sessionIndex].yapeCollectedCents += payments.yapeCents;
    }

    // Save all changes atomically
    idempotencyStore[idempotencyKey] = saleId;
    this.set(STORAGE_KEYS.IDEMPOTENCY, idempotencyStore);
    this.set(STORAGE_KEYS.SUPPLIES, Array.from(supplyMap.values()));
    this.set(STORAGE_KEYS.MOVEMENTS, [...movements, ...newMovements]);
    this.set(STORAGE_KEYS.SALES, [newSale, ...this.getSales()]);
    this.set(STORAGE_KEYS.CASH_SESSIONS, cashSessions);

    // Audit log
    this.logAudit({
      actorUid: userId,
      action: 'SALE_CONFIRMED',
      entityId: saleId,
      details: { totalCents: calculatedTotalCents, payments },
    });

    return { success: true, sale: newSale };
  }

  // --- CANCEL / REVERSE SALE (RF-16, TC-11) ---
  public cancelSale(saleId: string, reason: string, actorUid = 'owner'): { success: boolean; error?: string } {
    const sales = this.getSales();
    const saleIndex = sales.findIndex((s) => s.id === saleId);
    if (saleIndex < 0) {
      return { success: false, error: 'Venta no encontrada' };
    }
    const sale = sales[saleIndex];
    if (sale.status === 'cancelled') {
      return { success: false, error: 'La venta ya se encuentra anulada' };
    }

    const today = getTodayLimaDate();
    const nowIso = new Date().toISOString();

    // 1. Mark sale as cancelled
    sale.status = 'cancelled';
    sale.cancellationReason = reason;
    sale.cancelledAt = nowIso;

    // 2. Revert cash movements in active session
    const activeSession = this.getActiveCashSession();
    if (activeSession) {
      const cashSessions = this.getCashSessions();
      const sessionIndex = cashSessions.findIndex((s) => s.id === activeSession.id);
      if (sessionIndex >= 0) {
        cashSessions[sessionIndex].expectedCashCents -= sale.payments.cashCents;
        cashSessions[sessionIndex].yapeCollectedCents -= sale.payments.yapeCents;
        this.set(STORAGE_KEYS.CASH_SESSIONS, cashSessions);
      }
    }

    // 3. Revert stock movements (find all movements originated from this sale)
    const movements = this.getMovements();
    const originalMovements = movements.filter((m) => m.sourceId === saleId && m.type === 'sale_consumption');
    const supplies = this.getSupplies();
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));

    const reversalMovements: StockMovement[] = [];
    for (const orig of originalMovements) {
      const supply = supplyMap.get(orig.supplyId);
      if (supply) {
        const returnedQty = Math.abs(orig.quantityDelta);
        supply.stockQuantity += returnedQty;
        reversalMovements.push({
          id: `rev_${orig.id}`,
          supplyId: supply.id,
          supplyName: supply.name,
          type: 'reversal',
          quantityDelta: returnedQty,
          costSnapshotMicros: orig.costSnapshotMicros,
          sourceType: 'cancellation',
          sourceId: saleId,
          note: `Reverso anulación venta: ${reason}`,
          date: today,
          timestamp: nowIso,
        });
      }
    }

    this.set(STORAGE_KEYS.SALES, sales);
    this.set(STORAGE_KEYS.SUPPLIES, Array.from(supplyMap.values()));
    this.set(STORAGE_KEYS.MOVEMENTS, [...movements, ...reversalMovements]);

    this.logAudit({
      actorUid,
      action: 'SALE_CANCELLED',
      entityId: saleId,
      reason,
    });

    return { success: true };
  }

  // --- CASH SESSIONS MANAGEMENT ---
  public openCashSession(openingCents: number, actorUid = 'owner'): { success: boolean; session?: CashSession; error?: string } {
    const active = this.getActiveCashSession();
    if (active) {
      return { success: false, error: 'Ya existe una caja abierta actualmente.' };
    }
    const today = getTodayLimaDate();
    const newSession: CashSession = {
      id: `cs_${Date.now()}`,
      businessDate: today,
      openingCents,
      openingAt: new Date().toISOString(),
      expectedCashCents: openingCents,
      yapeCollectedCents: 0,
      state: 'open',
    };

    const sessions = this.getCashSessions();
    this.set(STORAGE_KEYS.CASH_SESSIONS, [newSession, ...sessions]);

    this.logAudit({
      actorUid,
      action: 'CASH_SESSION_OPENED',
      entityId: newSession.id,
      details: { openingCents },
    });

    return { success: true, session: newSession };
  }

  public closeCashSession(
    sessionId: string,
    countedCashCents: number,
    notes?: string,
    actorUid = 'owner'
  ): { success: boolean; session?: CashSession; error?: string } {
    const sessions = this.getCashSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index < 0) {
      return { success: false, error: 'Sesión de caja no encontrada.' };
    }
    const session = sessions[index];
    if (session.state === 'closed') {
      return { success: false, error: 'Esta sesión ya fue cerrada.' };
    }

    const difference = countedCashCents - session.expectedCashCents;
    session.countedCashCents = countedCashCents;
    session.differenceCashCents = difference;
    session.closingAt = new Date().toISOString();
    session.state = 'closed';
    session.notes = notes;

    this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);

    this.logAudit({
      actorUid,
      action: 'CASH_SESSION_CLOSED',
      entityId: sessionId,
      details: { countedCashCents, differenceCashCents: difference },
    });

    return { success: true, session };
  }

  // --- EXPENSES & OWNER WITHDRAWALS ---
  public addExpense(params: {
    category: ExpenseCategory;
    amountCents: number;
    account: 'cash' | 'yape';
    note: string;
    actorUid?: string;
  }): { success: boolean; expense?: Expense; error?: string } {
    const { category, amountCents, account, note, actorUid = 'owner' } = params;
    if (amountCents <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0.' };
    }

    const activeSession = this.getActiveCashSession();
    if (account === 'cash' && activeSession) {
      const sessions = this.getCashSessions();
      const sIndex = sessions.findIndex((s) => s.id === activeSession.id);
      if (sIndex >= 0) {
        sessions[sIndex].expectedCashCents -= amountCents;
        this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);
      }
    }

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      category,
      amountCents,
      account,
      businessDate: getTodayLimaDate(),
      isCOGS: false, // Per RN-08
      note,
      createdAt: new Date().toISOString(),
    };

    const expenses = this.getExpenses();
    this.set(STORAGE_KEYS.EXPENSES, [newExpense, ...expenses]);

    this.logAudit({
      actorUid,
      action: 'EXPENSE_RECORDED',
      entityId: newExpense.id,
      details: { category, amountCents, account },
    });

    return { success: true, expense: newExpense };
  }

  // --- PURCHASES (RF-08, TC-09) ---
  public recordPurchase(params: {
    supplyId: string;
    packageName: string;
    packageCount: number;
    unitsPerPackage: number;
    totalCents: number;
    paidAccount: 'cash' | 'yape' | 'credit';
    supplier?: string;
    actorUid?: string;
  }): { success: boolean; purchase?: Purchase; error?: string } {
    const {
      supplyId,
      packageName,
      packageCount,
      unitsPerPackage,
      totalCents,
      paidAccount,
      supplier,
      actorUid = 'owner',
    } = params;

    const supplies = this.getSupplies();
    const supplyIndex = supplies.findIndex((s) => s.id === supplyId);
    if (supplyIndex < 0) {
      return { success: false, error: 'Insumo no encontrado.' };
    }
    const supply = supplies[supplyIndex];

    const totalBaseUnits = packageCount * unitsPerPackage;
    if (totalBaseUnits <= 0 || totalCents <= 0) {
      return { success: false, error: 'Las unidades y el costo deben ser mayores a 0.' };
    }

    // Cost in micro-soles per base unit for this batch
    const purchaseUnitCostMicros = Math.round((totalCents * MICROS_PER_CENT) / totalBaseUnits);

    // Weighted average cost update (Section 7.3)
    // newAvg = (oldUnits * oldAvg + totalCostMicros) / (oldUnits + newUnits)
    const oldStock = Math.max(0, supply.stockQuantity);
    const oldTotalValMicros = oldStock * supply.avgCostMicros;
    const addedValMicros = totalCents * MICROS_PER_CENT;
    const newStock = oldStock + totalBaseUnits;
    const newAvgCostMicros = newStock > 0 ? Math.round((oldTotalValMicros + addedValMicros) / newStock) : purchaseUnitCostMicros;

    supply.stockQuantity += totalBaseUnits;
    supply.avgCostMicros = newAvgCostMicros;

    const purchaseId = `pur_${Date.now()}`;
    const today = getTodayLimaDate();
    const nowIso = new Date().toISOString();

    const newPurchase: Purchase = {
      id: purchaseId,
      supplyId,
      supplyName: supply.name,
      packageName,
      packageCount,
      unitsPerPackage,
      totalBaseUnits,
      totalCents,
      unitCostMicros: purchaseUnitCostMicros,
      paidAccount,
      supplier,
      businessDate: today,
      createdAt: nowIso,
    };

    // Add Kardex movement
    const movements = this.getMovements();
    const newMovement: StockMovement = {
      id: `mov_${purchaseId}`,
      supplyId: supply.id,
      supplyName: supply.name,
      type: 'purchase',
      quantityDelta: totalBaseUnits,
      costSnapshotMicros: purchaseUnitCostMicros,
      sourceType: 'purchase',
      sourceId: purchaseId,
      note: `Compra de ${packageName}${supplier ? ` (${supplier})` : ''}`,
      date: today,
      timestamp: nowIso,
    };

    // If paid with cash, deduct from active cash session
    if (paidAccount === 'cash') {
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        const cashSessions = this.getCashSessions();
        const sIndex = cashSessions.findIndex((s) => s.id === activeSession.id);
        if (sIndex >= 0) {
          cashSessions[sIndex].expectedCashCents -= totalCents;
          this.set(STORAGE_KEYS.CASH_SESSIONS, cashSessions);
        }
      }
    }

    this.set(STORAGE_KEYS.SUPPLIES, supplies);
    this.set(STORAGE_KEYS.MOVEMENTS, [...movements, newMovement]);
    this.set(STORAGE_KEYS.PURCHASES, [newPurchase, ...this.getPurchases()]);

    this.logAudit({
      actorUid,
      action: 'PURCHASE_RECORDED',
      entityId: purchaseId,
      details: { supplyId, totalBaseUnits, totalCents, newAvgCostMicros },
    });

    return { success: true, purchase: newPurchase };
  }

  // --- STOCK ADJUSTMENT / MERMA (RF-11, TC-10) ---
  public adjustStock(params: {
    supplyId: string;
    quantityDelta: number; // e.g. -5 for damaged cups
    reason: string;
    actorUid?: string;
  }): { success: boolean; error?: string } {
    const { supplyId, quantityDelta, reason, actorUid = 'owner' } = params;
    const supplies = this.getSupplies();
    const supply = supplies.find((s) => s.id === supplyId);
    if (!supply) {
      return { success: false, error: 'Insumo no encontrado.' };
    }

    supply.stockQuantity += quantityDelta;

    const today = getTodayLimaDate();
    const movement: StockMovement = {
      id: `mov_adj_${Date.now()}`,
      supplyId,
      supplyName: supply.name,
      type: 'waste_adjustment',
      quantityDelta,
      costSnapshotMicros: supply.avgCostMicros,
      sourceType: 'adjustment',
      sourceId: `adj_${Date.now()}`,
      note: reason,
      date: today,
      timestamp: new Date().toISOString(),
    };

    const movements = this.getMovements();
    this.set(STORAGE_KEYS.SUPPLIES, supplies);
    this.set(STORAGE_KEYS.MOVEMENTS, [...movements, movement]);

    this.logAudit({
      actorUid,
      action: 'STOCK_ADJUSTMENT',
      entityId: supplyId,
      reason,
      details: { quantityDelta },
    });

    return { success: true };
  }

  // --- PRODUCT & SUPPLY CONFIGURATION ---
  public updateProductPrice(productId: string, newPriceCents: number): boolean {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      prod.priceCents = newPriceCents;
      this.set(STORAGE_KEYS.PRODUCTS, products);
      this.logAudit({
        actorUid: 'owner',
        action: 'PRODUCT_PRICE_UPDATED',
        entityId: productId,
        details: { newPriceCents },
      });
      return true;
    }
    return false;
  }

  public updateSupply(supplyId: string, updates: Partial<Supply>): boolean {
    const supplies = this.getSupplies();
    const sup = supplies.find((s) => s.id === supplyId);
    if (sup) {
      Object.assign(sup, updates);
      this.set(STORAGE_KEYS.SUPPLIES, supplies);
      return true;
    }
    return false;
  }

  public updateRecipe(recipeId: string, updates: Partial<Recipe>): boolean {
    const recipes = this.getRecipes();
    const rec = recipes.find((r) => r.id === recipeId);
    if (rec) {
      Object.assign(rec, updates);
      this.set(STORAGE_KEYS.RECIPES, recipes);
      return true;
    }
    return false;
  }

  public updateSettings(updates: Partial<BusinessSettings>): void {
    const current = this.getSettings();
    this.set(STORAGE_KEYS.SETTINGS, { ...current, ...updates });
  }

  // --- AUDIT LOGGER ---
  private logAudit(entry: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const auditEvents = this.getAuditEvents();
    const newEvent: AuditEvent = {
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.set(STORAGE_KEYS.AUDIT, [newEvent, ...auditEvents]);
  }

  // --- CSV EXPORT (RF-20, RNF-08) ---
  public exportSalesCSV(): string {
    const sales = this.getSales();
    const headers = [
      'ID Venta',
      'Fecha Lima',
      'Hora Lima',
      'Estado',
      'Items',
      'Total S/',
      'Efectivo S/',
      'Yape S/',
      'Costo COGS S/',
      'Motivo Anulación',
    ];

    const rows = sales.map((s) => {
      const itemsSummary = s.items.map((i) => `${i.quantity}x ${i.productName}`).join('; ');
      const totalCOGS = s.items.reduce((sum, i) => sum + i.unitCostSnapshotCents * i.quantity, 0);
      return [
        s.id,
        s.businessDate,
        s.createdAt.slice(11, 19),
        s.status === 'completed' ? 'Completada' : 'Anulada',
        `"${itemsSummary}"`,
        (s.totalCents / 100).toFixed(2),
        (s.payments.cashCents / 100).toFixed(2),
        (s.payments.yapeCents / 100).toFixed(2),
        (totalCOGS / 100).toFixed(2),
        `"${s.cancellationReason || ''}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  public exportKardexCSV(): string {
    const movements = this.getMovements();
    const headers = [
      'ID Movimiento',
      'Fecha',
      'Insumo',
      'Tipo Operacion',
      'Cantidad Delta',
      'Costo Snapshot S/',
      'Origen',
      'Nota',
    ];

    const rows = movements.map((m) => {
      return [
        m.id,
        m.date,
        `"${m.supplyName}"`,
        m.type,
        m.quantityDelta,
        (m.costSnapshotMicros / 1_000_000).toFixed(4),
        m.sourceId,
        `"${m.note || ''}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // --- RESET / SANDBOX SEED ---
  public resetToFreshDefaults(): void {
    localStorage.clear();
    this.ensureInitialized();
    this.notify();
  }

  /**
   * Loads the exact illustrative day from PRD Section 9.2:
   * - 30 Cafés sold (S/ 75.00)
   * - 20 Roscas sold (S/ 40.00)
   * - Total Sales: S/ 115.00 (S/ 70 Efectivo, S/ 45 Yape)
   * - Opening Cash: S/ 20.00
   * - Owner withdrawal: S/ 5.00
   * - Expected Cash: S/ 85.00
   * - COGS: S/ 47.91 (Café S/ 27.91 + Roscas S/ 20.00)
   * - Operating expenses: S/ 10.00
   * - Estimated Profit: S/ 57.09
   */
  public loadIllustrativeDemoDay(): void {
    this.resetToFreshDefaults();

    // Ensure supplies have ample stock
    const supplies = this.getSupplies();
    supplies.forEach((s) => {
      s.stockQuantity = 500;
    });
    this.set(STORAGE_KEYS.SUPPLIES, supplies);

    // Create 30 cafés and 20 roscas across sales
    // Split payments: S/ 70 cash, S/ 45 yape
    // Sale 1: 15 cafes + 10 roscas = 15*2.50 + 10*2.00 = 37.50 + 20.00 = S/ 57.50 (Paid: Cash S/ 35.00, Yape S/ 22.50)
    this.processSale({
      idempotencyKey: 'demo_sale_01',
      items: [
        { productId: 'prod_cafe_8oz', quantity: 15, options: { sugar: 'blanca', withLid: true } },
        { productId: 'prod_rosca', quantity: 10 },
      ],
      payments: { cashCents: 3500, yapeCents: 2250 },
    });

    // Sale 2: 15 cafes + 10 roscas = S/ 57.50 (Paid: Cash S/ 35.00, Yape S/ 22.50)
    this.processSale({
      idempotencyKey: 'demo_sale_02',
      items: [
        { productId: 'prod_cafe_8oz', quantity: 15, options: { sugar: 'rubia', withLid: true } },
        { productId: 'prod_rosca', quantity: 10 },
      ],
      payments: { cashCents: 3500, yapeCents: 2250 },
    });

    // Add withdrawal: Retiro del dueño S/ 5.00
    this.addExpense({
      category: 'retiro_dueño',
      amountCents: 500,
      account: 'cash',
      note: 'Retiro de ganancia para el dueño',
    });

    // Add operating expense: S/ 10.00
    this.addExpense({
      category: 'operativo',
      amountCents: 1000,
      account: 'cash',
      note: 'Gasto operativo del día (ej. bolsas y artículos de limpieza)',
    });
  }
}

export const storage = new StorageService();
