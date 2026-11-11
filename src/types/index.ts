/**
 * Domain Types for Café & Roscas | Control
 * Monetary amounts stored strictly as integer CENTS.
 * Fractional unit costs stored in MICROS (1 Sol = 1,000,000 micros = 10,000 cents).
 */

export type BaseUnit = 'g' | 'ml' | 'und';

export type ProductType = 'prepared' | 'resale';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  priceCents: number; // e.g. 250 for S/ 2.50
  active: boolean;
  unit: string;
  recipeVersion?: number;
  imageUrl?: string;
}

export type SupplyCategory = 'ingrediente' | 'insumo' | 'consumible' | 'reventa';

export interface Supply {
  id: string;
  name: string;
  category: SupplyCategory;
  baseUnit: BaseUnit;
  stockQuantity: number; // In base units
  avgCostMicros: number; // In micro-soles (1 Sol = 1,000,000 micros). 0 if cost pending
  minStock: number;
  active: boolean;
}

export interface RecipeLine {
  supplyId: string;
  quantity: number; // in supply's baseUnit
  optional?: boolean;
  variantKey?: string; // e.g. 'sugar_blanca', 'sugar_rubia', 'lid'
}

export interface Recipe {
  id: string;
  productId: string;
  version: number;
  effectiveAt: string;
  lines: RecipeLine[];
  overheadCents: number; // e.g. 7 cents (S/ 0.07) for water/energy
}

export interface CartItemOption {
  sugar: 'blanca' | 'rubia' | 'sin_azucar';
  withLid: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  unitCostSnapshotCents: number;
  options?: CartItemOption;
  recipeUsedVersion?: number;
}

export type PaymentMethod = 'cash' | 'yape' | 'mixed';

export interface PaymentBreakdown {
  cashCents: number;
  yapeCents: number;
}

export type SaleStatus = 'completed' | 'cancelled';

export interface Sale {
  id: string;
  idempotencyKey: string;
  businessDate: string; // YYYY-MM-DD in Lima
  userId: string;
  status: SaleStatus;
  items: SaleItem[];
  totalCents: number;
  payments: PaymentBreakdown;
  tenderedCashCents?: number;
  changeCents?: number;
  createdAt: string; // ISO
  cancellationReason?: string;
  cancelledAt?: string;
}

export type StockMovementType =
  | 'initial_inventory'
  | 'purchase'
  | 'sale_consumption'
  | 'waste_adjustment'
  | 'reversal';

export interface StockMovement {
  id: string;
  supplyId: string;
  supplyName: string;
  type: StockMovementType;
  quantityDelta: number; // positive or negative
  costSnapshotMicros: number;
  sourceType: 'sale' | 'purchase' | 'adjustment' | 'opening' | 'cancellation';
  sourceId: string;
  note?: string;
  date: string;
  timestamp: string;
}

export type CashSessionState = 'open' | 'closed';

export interface CashSession {
  id: string;
  businessDate: string; // YYYY-MM-DD
  openingCents: number;
  openingAt: string;
  closingAt?: string;
  expectedCashCents: number;
  countedCashCents?: number;
  differenceCashCents?: number;
  yapeCollectedCents: number;
  state: CashSessionState;
  notes?: string;
}

export type ExpenseCategory = 'operativo' | 'retiro_dueño' | 'compra_insumo';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amountCents: number;
  account: 'cash' | 'yape';
  businessDate: string;
  isCOGS: boolean; // Retiros del dueño y egresos no son COGS
  note: string;
  sourceId?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  supplyId: string;
  supplyName: string;
  packageName: string;
  packageCount: number; // e.g. 1 package
  unitsPerPackage: number; // e.g. 100 units
  totalBaseUnits: number; // e.g. 100
  totalCents: number; // e.g. 1400 (S/ 14.00)
  unitCostMicros: number;
  paidAccount: 'cash' | 'yape' | 'credit';
  supplier?: string;
  businessDate: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorUid: string;
  action: string;
  entityId: string;
  reason?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface BusinessSettings {
  id: string;
  name: string;
  currency: 'PEN';
  timezone: 'America/Lima';
  taxId?: string;
  address?: string;
  phone?: string;
  yapePhone?: string;
  yapeOwnerName?: string;
  roundPriceDecimals: boolean;
  targetMarginPercent: number; // e.g. 60
}

export type TabDestination = 'dashboard' | 'pos' | 'inventory' | 'cash' | 'more';
export type SubViewDestination = 'calculator' | 'reports' | 'purchases' | 'settings' | 'qa_runner';
