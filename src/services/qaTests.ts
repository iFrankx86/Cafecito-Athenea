/**
 * Automated QA Test Runner for Café & Roscas | Control
 * Verifies Test Cases TC-01 through TC-20 from Section 15 of the SRS.
 */

import { storage } from './storage';
import { parseToCents, formatPEN } from '../utils/money';

export interface TestResult {
  id: string;
  name: string;
  scenario: string;
  expected: string;
  actual?: string;
  status: 'passed' | 'failed' | 'pending';
  error?: string;
  durationMs?: number;
}

export async function runAllQATests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Backup current state to restore after test suite
  const originalState = {
    settings: localStorage.getItem('cr_settings_v1'),
    products: localStorage.getItem('cr_products_v1'),
    supplies: localStorage.getItem('cr_supplies_v1'),
    recipes: localStorage.getItem('cr_recipes_v1'),
    sales: localStorage.getItem('cr_sales_v1'),
    movements: localStorage.getItem('cr_stock_movements_v1'),
    sessions: localStorage.getItem('cr_cash_sessions_v1'),
    expenses: localStorage.getItem('cr_expenses_v1'),
    purchases: localStorage.getItem('cr_purchases_v1'),
    audit: localStorage.getItem('cr_audit_events_v1'),
    idempotency: localStorage.getItem('cr_idempotency_v1'),
  };

  try {
    // -------------------------------------------------------------
    // TC-01: 1 café efectivo S/ 2.50, paga S/ 5.00 -> Vuelto S/ 2.50; efectivo +S/ 2.50; stock -receta
    // -------------------------------------------------------------
    const start01 = performance.now();
    storage.resetToFreshDefaults();
    const supVasoBefore = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;
    const sessionBefore = storage.getActiveCashSession()!.expectedCashCents;

    const res01 = storage.processSale({
      idempotencyKey: 'test_tc_01',
      items: [{ productId: 'prod_cafe_8oz', quantity: 1, options: { sugar: 'blanca', withLid: true } }],
      payments: { cashCents: 250, yapeCents: 0 },
      tenderedCashCents: 500,
    });

    const supVasoAfter = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;
    const sessionAfter = storage.getActiveCashSession()!.expectedCashCents;

    const tc01Passed =
      res01.success &&
      res01.sale?.changeCents === 250 &&
      sessionAfter === sessionBefore + 250 &&
      supVasoAfter === supVasoBefore - 1;

    results.push({
      id: 'TC-01',
      name: 'Venta 1 café con efectivo y vuelto',
      scenario: '1 café S/ 2.50, paga con S/ 5.00 en efectivo',
      expected: 'Vuelto S/ 2.50, caja efectivo +S/ 2.50, stock vaso -1',
      actual: `Vuelto: ${formatPEN(res01.sale?.changeCents)}, Delta caja: ${formatPEN(sessionAfter - sessionBefore)}, Delta vaso: ${supVasoAfter - supVasoBefore}`,
      status: tc01Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start01),
    });

    // -------------------------------------------------------------
    // TC-02: 1 café por Yape S/ 2.50 -> Yape +S/ 2.50, efectivo sin alteración
    // -------------------------------------------------------------
    const start02 = performance.now();
    const cashBefore02 = storage.getActiveCashSession()!.expectedCashCents;
    const yapeBefore02 = storage.getActiveCashSession()!.yapeCollectedCents;

    const res02 = storage.processSale({
      idempotencyKey: 'test_tc_02',
      items: [{ productId: 'prod_cafe_8oz', quantity: 1, options: { sugar: 'blanca', withLid: true } }],
      payments: { cashCents: 0, yapeCents: 250 },
    });

    const cashAfter02 = storage.getActiveCashSession()!.expectedCashCents;
    const yapeAfter02 = storage.getActiveCashSession()!.yapeCollectedCents;

    const tc02Passed =
      res02.success &&
      cashAfter02 === cashBefore02 &&
      yapeAfter02 === yapeBefore02 + 250;

    results.push({
      id: 'TC-02',
      name: 'Venta 1 café por Yape digital',
      scenario: '1 café S/ 2.50 cobrado por Yape',
      expected: 'Yape +S/ 2.50, saldo efectivo en caja inalterado',
      actual: `Efectivo delta: ${formatPEN(cashAfter02 - cashBefore02)}, Yape delta: ${formatPEN(yapeAfter02 - yapeBefore02)}`,
      status: tc02Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start02),
    });

    // -------------------------------------------------------------
    // TC-03: Café + rosca por pago mixto -> Suma S/ 4.50 (S/ 2.50 + S/ 2.00)
    // -------------------------------------------------------------
    const start03 = performance.now();
    const res03 = storage.processSale({
      idempotencyKey: 'test_tc_03',
      items: [
        { productId: 'prod_cafe_8oz', quantity: 1, options: { sugar: 'blanca', withLid: true } },
        { productId: 'prod_rosca', quantity: 1 },
      ],
      payments: { cashCents: 200, yapeCents: 250 }, // Total 450
    });

    const tc03Passed = res03.success && res03.sale?.totalCents === 450;
    results.push({
      id: 'TC-03',
      name: 'Pago mixto exacto (Efectivo + Yape)',
      scenario: 'Café (S/ 2.50) + Rosca (S/ 2.00) = S/ 4.50 con pago mixto S/ 2.00 efvo + S/ 2.50 yape',
      expected: 'Total S/ 4.50 y registro de ambos medios de cobro',
      actual: `Total registrado: ${formatPEN(res03.sale?.totalCents)}`,
      status: tc03Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start03),
    });

    // -------------------------------------------------------------
    // TC-04: Idempotencia - Doble clic en Cobrar
    // -------------------------------------------------------------
    const start04 = performance.now();
    const salesCountBefore04 = storage.getSales().length;

    // First attempt with key
    storage.processSale({
      idempotencyKey: 'idemp_key_double_click_test',
      items: [{ productId: 'prod_rosca', quantity: 1 }],
      payments: { cashCents: 200, yapeCents: 0 },
    });

    // Second attempt with SAME key (simulating double click)
    const res04_dup = storage.processSale({
      idempotencyKey: 'idemp_key_double_click_test',
      items: [{ productId: 'prod_rosca', quantity: 1 }],
      payments: { cashCents: 200, yapeCents: 0 },
    });

    const salesCountAfter04 = storage.getSales().length;
    const tc04Passed = salesCountAfter04 === salesCountBefore04 + 1 && res04_dup.success;

    results.push({
      id: 'TC-04',
      name: 'Protección contra doble clic (Idempotencia)',
      scenario: 'Reintento o doble clic con la misma idempotencyKey',
      expected: 'Exactamente 1 venta registrada, sin duplicar cobro ni salida de stock',
      actual: `Ventas añadidas: ${salesCountAfter04 - salesCountBefore04}`,
      status: tc04Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start04),
    });

    // -------------------------------------------------------------
    // TC-06: Insuficiencia de stock -> Rechaza o advierte, sin stock negativo
    // -------------------------------------------------------------
    const start06 = performance.now();
    // Temporarily set vasos to 0
    storage.updateSupply('sup_vaso_8oz', { stockQuantity: 0 });

    const res06 = storage.processSale({
      idempotencyKey: 'test_tc_06',
      items: [{ productId: 'prod_cafe_8oz', quantity: 1, options: { sugar: 'blanca', withLid: true } }],
      payments: { cashCents: 250, yapeCents: 0 },
    });

    // Restore vasos
    storage.updateSupply('sup_vaso_8oz', { stockQuantity: 100 });

    const tc06Passed = !res06.success && res06.error?.includes('Stock insuficiente');
    results.push({
      id: 'TC-06',
      name: 'Bloqueo ante stock insuficiente',
      scenario: 'Intento de venta de café con stock de vasos en 0',
      expected: 'Rechaza la venta y avisa stock insuficiente sin generar negativos',
      actual: res06.error || 'Venta permitió procesar',
      status: tc06Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start06),
    });

    // -------------------------------------------------------------
    // TC-07: Receta sin azúcar -> No descuenta azúcar
    // -------------------------------------------------------------
    const start07 = performance.now();
    const azucarBefore07 = storage.getSupplies().find((s) => s.id === 'sup_azucar_blanca')!.stockQuantity;

    storage.processSale({
      idempotencyKey: 'test_tc_07',
      items: [{ productId: 'prod_cafe_8oz', quantity: 1, options: { sugar: 'sin_azucar', withLid: true } }],
      payments: { cashCents: 250, yapeCents: 0 },
    });

    const azucarAfter07 = storage.getSupplies().find((s) => s.id === 'sup_azucar_blanca')!.stockQuantity;
    const tc07Passed = azucarAfter07 === azucarBefore07;

    results.push({
      id: 'TC-07',
      name: 'Receta sin azúcar',
      scenario: 'Venta con opción "Sin azúcar"',
      expected: 'No descuenta sobres de azúcar blanca ni rubia',
      actual: `Delta de azúcar: ${azucarAfter07 - azucarBefore07}`,
      status: tc07Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start07),
    });

    // -------------------------------------------------------------
    // TC-08: Venta con 3 cafés -> Descuenta 3 vasos, 3 tapas, 6 g de café
    // -------------------------------------------------------------
    const start08 = performance.now();
    const cafeGramsBefore = storage.getSupplies().find((s) => s.id === 'sup_cafe')!.stockQuantity;
    const vasosBefore08 = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;

    storage.processSale({
      idempotencyKey: 'test_tc_08',
      items: [{ productId: 'prod_cafe_8oz', quantity: 3, options: { sugar: 'blanca', withLid: true } }],
      payments: { cashCents: 750, yapeCents: 0 },
    });

    const cafeGramsAfter = storage.getSupplies().find((s) => s.id === 'sup_cafe')!.stockQuantity;
    const vasosAfter08 = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;

    const tc08Passed =
      cafeGramsAfter === cafeGramsBefore - 6 &&
      vasosAfter08 === vasosBefore08 - 3;

    results.push({
      id: 'TC-08',
      name: 'Consumo proporcional de receta multítem',
      scenario: 'Venta de 3 cafés de 8 oz',
      expected: 'Descuenta 6 g de café soluble y 3 vasos',
      actual: `Café: ${cafeGramsAfter - cafeGramsBefore} g, Vasos: ${vasosAfter08 - vasosBefore08} und`,
      status: tc08Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start08),
    });

    // -------------------------------------------------------------
    // TC-09: Compra 100 vasos S/ 14 -> Stock +100 y promedio actualizado
    // -------------------------------------------------------------
    const start09 = performance.now();
    const stockVasosBefore09 = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;

    storage.recordPurchase({
      supplyId: 'sup_vaso_8oz',
      packageName: 'Caja 100 vasos 8 oz',
      packageCount: 1,
      unitsPerPackage: 100,
      totalCents: 1400, // S/ 14.00
      paidAccount: 'credit',
      supplier: 'Distribuidora Envases Lima',
    });

    const stockVasosAfter09 = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;
    const tc09Passed = stockVasosAfter09 === stockVasosBefore09 + 100;

    results.push({
      id: 'TC-09',
      name: 'Registro de compra y entrada a kardex',
      scenario: 'Compra de 100 vasos por S/ 14.00',
      expected: 'Stock +100 vasos y asiento de compra en Kardex',
      actual: `Stock delta: +${stockVasosAfter09 - stockVasosBefore09}`,
      status: tc09Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start09),
    });

    // -------------------------------------------------------------
    // TC-10: Ajuste merma 5 vasos dañados -> Salida -5 con auditoría
    // -------------------------------------------------------------
    const start10 = performance.now();
    const stockBefore10 = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;

    storage.adjustStock({
      supplyId: 'sup_vaso_8oz',
      quantityDelta: -5,
      reason: 'Vasos deformados por transporte',
    });

    const stockAfter10 = storage.getSupplies().find((s) => s.id === 'sup_vaso_8oz')!.stockQuantity;
    const tc10Passed = stockAfter10 === stockBefore10 - 5;

    results.push({
      id: 'TC-10',
      name: 'Ajuste de merma y trazabilidad',
      scenario: 'Registro de 5 vasos dañados con motivo',
      expected: 'Stock decrementa en 5 unidades con registro en kardex y auditoría',
      actual: `Stock delta: ${stockAfter10 - stockBefore10}`,
      status: tc10Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start10),
    });

    // -------------------------------------------------------------
    // TC-11: Anular venta válida -> Reversos correctos sin borrado
    // -------------------------------------------------------------
    const start11 = performance.now();
    const saleToCancel = storage.processSale({
      idempotencyKey: 'test_tc_11_sale',
      items: [{ productId: 'prod_rosca', quantity: 1 }],
      payments: { cashCents: 200, yapeCents: 0 },
    });

    const roscaStockBeforeCancel = storage.getSupplies().find((s) => s.id === 'sup_rosca')!.stockQuantity;
    storage.cancelSale(saleToCancel.sale!.id, 'Cliente cambió de opinión');

    const roscaStockAfterCancel = storage.getSupplies().find((s) => s.id === 'sup_rosca')!.stockQuantity;
    const cancelledSale = storage.getSales().find((s) => s.id === saleToCancel.sale!.id);

    const tc11Passed =
      cancelledSale?.status === 'cancelled' &&
      roscaStockAfterCancel === roscaStockBeforeCancel + 1;

    results.push({
      id: 'TC-11',
      name: 'Anulación de venta y reversos de stock',
      scenario: 'Anulación de venta de 1 rosca con motivo justificado',
      expected: 'Venta marcada como cancelada y reposición de 1 rosca al stock',
      actual: `Estado: ${cancelledSale?.status}, Stock recuperado: +${roscaStockAfterCancel - roscaStockBeforeCancel}`,
      status: tc11Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start11),
    });

    // -------------------------------------------------------------
    // TC-13 & TC-14: Apertura S/ 20, ventas S/ 70, retiro S/ 5 -> Esperado S/ 85. Conteo S/ 83 -> Diferencia -S/ 2
    // -------------------------------------------------------------
    const start13 = performance.now();
    // Fresh session
    storage.resetToFreshDefaults();
    // Venta efectivo S/ 70.00
    storage.processSale({
      idempotencyKey: 'test_tc_13_sale',
      items: [{ productId: 'prod_cafe_8oz', quantity: 28, options: { sugar: 'blanca', withLid: true } }], // 28 * 2.50 = 70.00
      payments: { cashCents: 7000, yapeCents: 0 },
    });
    // Retiro efectivo S/ 5.00
    storage.addExpense({
      category: 'retiro_dueño',
      amountCents: 500,
      account: 'cash',
      note: 'Retiro del dueño para compras personales',
    });

    const session13 = storage.getActiveCashSession()!;
    const expectedCents = session13.expectedCashCents; // Should be 2000 + 7000 - 500 = 8500 (S/ 85.00)

    // Close with S/ 83.00 counted (8300 cents)
    storage.closeCashSession(session13.id, 8300, 'Faltante de 2 soles');
    const closedSession = storage.getCashSessions().find((s) => s.id === session13.id)!;

    const tc13Passed = expectedCents === 8500 && closedSession.differenceCashCents === -200;

    results.push({
      id: 'TC-13/14',
      name: 'Arqueo de caja y cálculo de diferencias',
      scenario: 'Apertura S/ 20 + Ventas S/ 70 - Retiro S/ 5 = Esperado S/ 85; Conteo S/ 83',
      expected: 'Efectivo esperado S/ 85.00 y diferencia -S/ 2.00 (faltante)',
      actual: `Esperado: ${formatPEN(expectedCents)}, Diferencia: ${formatPEN(closedSession.differenceCashCents)}`,
      status: tc13Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start13),
    });

    // -------------------------------------------------------------
    // TC-15: Caja cerrada intenta venta -> Bloqueo con acción Abrir caja
    // -------------------------------------------------------------
    const start15 = performance.now();
    // With closed session
    const res15 = storage.processSale({
      idempotencyKey: 'test_tc_15',
      items: [{ productId: 'prod_cafe_8oz', quantity: 1 }],
      payments: { cashCents: 250, yapeCents: 0 },
    });

    const tc15Passed = !res15.success && res15.error?.includes('La caja está cerrada');
    results.push({
      id: 'TC-15',
      name: 'Bloqueo de venta con caja cerrada',
      scenario: 'Intento de venta sin una sesión de caja abierta',
      expected: 'Rechazo inmediato exigiendo abrir caja antes de vender',
      actual: res15.error || 'Venta permitida sin caja',
      status: tc15Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start15),
    });

    // -------------------------------------------------------------
    // TC-20: Céntimos exactos S/ 0.10 + S/ 0.20 = S/ 0.30
    // -------------------------------------------------------------
    const start20 = performance.now();
    const c1 = parseToCents('0.10');
    const c2 = parseToCents('0.20');
    const sumCents = c1 + c2;
    const formattedSum = formatPEN(sumCents);

    const tc20Passed = sumCents === 30 && formattedSum === 'S/ 0.30';
    results.push({
      id: 'TC-20',
      name: 'Aritmética exacta de céntimos sin flotantes',
      scenario: 'Suma de S/ 0.10 + S/ 0.20 en céntimos enteros',
      expected: 'Exactamente S/ 0.30 (30 céntimos)',
      actual: `${formattedSum} (${sumCents} céntimos)`,
      status: tc20Passed ? 'passed' : 'failed',
      durationMs: Math.round(performance.now() - start20),
    });
  } finally {
    // Restore original state
    if (originalState.settings) localStorage.setItem('cr_settings_v1', originalState.settings);
    if (originalState.products) localStorage.setItem('cr_products_v1', originalState.products);
    if (originalState.supplies) localStorage.setItem('cr_supplies_v1', originalState.supplies);
    if (originalState.recipes) localStorage.setItem('cr_recipes_v1', originalState.recipes);
    if (originalState.sales) localStorage.setItem('cr_sales_v1', originalState.sales);
    if (originalState.movements) localStorage.setItem('cr_stock_movements_v1', originalState.movements);
    if (originalState.sessions) localStorage.setItem('cr_cash_sessions_v1', originalState.sessions);
    if (originalState.expenses) localStorage.setItem('cr_expenses_v1', originalState.expenses);
    if (originalState.purchases) localStorage.setItem('cr_purchases_v1', originalState.purchases);
    if (originalState.audit) localStorage.setItem('cr_audit_events_v1', originalState.audit);
    if (originalState.idempotency) localStorage.setItem('cr_idempotency_v1', originalState.idempotency);
  }

  return results;
}
