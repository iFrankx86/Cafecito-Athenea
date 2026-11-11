/**
 * Money utilities with exact integer céntimos arithmetic.
 * Eliminates floating point inaccuracies (e.g. 0.1 + 0.2 != 0.3).
 *
 * 1 Sol (PEN) = 100 céntimos (cents)
 * 1 Sol (PEN) = 1,000,000 micro-soles (micros)
 * 1 céntimo   = 10,000 micro-soles
 */

export const MICROS_PER_CENT = 10_000;
export const MICROS_PER_SOL = 1_000_000;
export const CENTS_PER_SOL = 100;

/**
 * Format integer céntimos to Peruvian Soles string: "S/ 2.50"
 */
export function formatPEN(cents: number | undefined | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) return 'S/ 0.00';
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const soles = Math.floor(abs / 100);
  const remainder = abs % 100;
  const formatted = `${soles}.${remainder.toString().padStart(2, '0')}`;
  return isNegative ? `-S/ ${formatted}` : `S/ ${formatted}`;
}

/**
 * Format integer céntimos as just the number: "2.50"
 */
export function formatNumberOnly(cents: number): string {
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const soles = Math.floor(abs / 100);
  const remainder = abs % 100;
  const formatted = `${soles}.${remainder.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format micro-soles for unit cost display (up to 4 decimals, e.g. "S/ 0.3933")
 */
export function formatUnitCostMicros(micros: number | undefined | null): string {
  if (!micros || micros <= 0) return 'Costo pendiente';
  const soles = micros / MICROS_PER_SOL;
  return `S/ ${soles.toFixed(4)}`;
}

/**
 * Parse a string or number input into integer céntimos.
 * e.g. "2.50" -> 250, "0.10" -> 10, "14" -> 1400
 */
export function parseToCents(val: string | number): number {
  if (typeof val === 'number') {
    return Math.round(val * 100);
  }
  if (!val || typeof val !== 'string') return 0;
  const clean = val.replace(/[^0-9.-]/g, '');
  const floatVal = parseFloat(clean);
  if (isNaN(floatVal)) return 0;
  return Math.round(floatVal * 100);
}

/**
 * Convert céntimos to micro-soles
 */
export function centsToMicros(cents: number): number {
  return Math.round(cents * MICROS_PER_CENT);
}

/**
 * Convert micro-soles to integer céntimos (rounded)
 */
export function microsToCents(micros: number): number {
  return Math.round(micros / MICROS_PER_CENT);
}

/**
 * Calculate commercial profit margin percentage
 * Formula from PDF: Margen (%) = ((Precio - Costo) / Precio) * 100
 */
export function calculateMarginPercent(priceCents: number, costCents: number): number {
  if (priceCents <= 0) return 0;
  const profit = priceCents - costCents;
  return (profit / priceCents) * 100;
}

/**
 * Calculate unit contribution in céntimos
 * Contribución = Precio - Costo
 */
export function calculateContributionCents(priceCents: number, costCents: number): number {
  return priceCents - costCents;
}

/**
 * Calculate recommended price for a target margin
 * Formula from PDF: Precio = Costo / (1 - MargenObjetivo/100)
 */
export function calculatePriceForTargetMargin(costCents: number, targetMarginPercent: number): number {
  if (costCents <= 0) return 0;
  const marginFraction = targetMarginPercent / 100;
  if (marginFraction >= 1) return costCents;
  const rawPriceCents = costCents / (1 - marginFraction);
  return Math.round(rawPriceCents);
}

/**
 * Round price to commercial S/ 0.50 steps (optional commercial rounding)
 * e.g. 233 -> 250 (S/ 2.50), 210 -> 200 (S/ 2.00)
 */
export function roundToCommercialHalfSol(cents: number): number {
  const step = 50; // 50 céntimos
  return Math.round(cents / step) * step;
}
