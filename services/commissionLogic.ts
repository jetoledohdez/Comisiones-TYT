
import { CommissionConfig, Invoice, CommissionRecord } from '../types';

/**
 * LÓGICA DE NEGOCIO: CÁLCULO DE FECHAS DE PAGO
 * 
 * Regla:
 * 1. Se toma la fecha de la factura.
 * 2. Se suman 60 días (Política de crédito estándar).
 * 3. Se ajusta al día de pago más cercano:
 *    - Si la fecha cae entre el 1 y el 15, se paga el día 15 de ese mes.
 *    - Si cae después del 15, se mueve al día 15 del siguiente mes.
 * 
 * @param invoiceDateStr Fecha original de la factura (YYYY-MM-DD)
 * @returns Fecha estimada de pago de la comisión (YYYY-MM-DD)
 */
export const calculatePaymentDate = (invoiceDateStr: string): string => {
  const invoiceDate = new Date(invoiceDateStr);
  const baseDate = new Date(invoiceDate);
  
  // Regla: Política de +60 días naturales
  baseDate.setDate(baseDate.getDate() + 60);

  const baseDay = baseDate.getDate();
  const baseMonth = baseDate.getMonth();
  const baseYear = baseDate.getFullYear();

  // Regla: Cortes de caja los días 15
  if (baseDay <= 15) {
    return new Date(baseYear, baseMonth, 15).toISOString().split('T')[0];
  } else {
    return new Date(baseYear, baseMonth + 1, 15).toISOString().split('T')[0];
  }
};

/**
 * MOTOR PRINCIPAL DE CÁLCULO DE COMISIONES
 * 
 * Este proceso ejecuta la "cascada" de reglas de negocio en el siguiente orden:
 * 1. Determina el Factor Financiero (Escalas Positivas/Negativas) basado en la venta total global.
 * 2. Determina el Factor de Cobertura de Cartera (Penalización/Premio por actividad en CRM).
 * 3. Determina el Factor de Cierre (Penalización/Premio por efectividad de oportunidades).
 * 4. Itera factura por factura aplicando: (Monto * Tasa Línea * Factores) + Bonos Fijos.
 * 
 * @param invoices Lista de facturas del periodo seleccionado.
 * @param config Configuración activa (JSON) con las reglas del POS.
 * @param currentTotalSales Sumatoria total de ventas para determinar escala global.
 */
export const calculateCommissionsBatch = (
  invoices: Invoice[],
  config: CommissionConfig,
  currentTotalSales: number
): CommissionRecord[] => {
  
  // =================================================================================
  // PASO 1: CÁLCULO DEL FACTOR FINANCIERO (OBJETIVO DE VENTA)
  // =================================================================================
  // Nota: Este factor afecta a TODAS las facturas del periodo por igual.
  let financialPercentage = 0; 
  
  if (currentTotalSales > config.globalTarget) {
    // ESCENARIO ÉXITO: Se superó la meta global. Usamos Escalas Positivas.
    // Lógica: Comparar venta total contra los rangos definidos para asignar % extra.
    const p1 = config.positiveScales[0];
    const s1Start = config.globalTarget + 1;
    
    const p2 = config.positiveScales[1];
    const s2Start = (p1.endAmount || s1Start) + 1;

    const p3 = config.positiveScales[2];
    const s3Start = (p2.endAmount || s2Start) + 1;

    const p4 = config.positiveScales[3];
    const s4Start = (p3.endAmount || s3Start) + 1;

    if (currentTotalSales >= s4Start) {
        financialPercentage = p4.commissionPercentage;
    } else if (currentTotalSales >= s3Start) {
        financialPercentage = p3.commissionPercentage;
    } else if (currentTotalSales >= s2Start) {
        financialPercentage = p2.commissionPercentage;
    } else {
        financialPercentage = p1.commissionPercentage;
    }

  } else {
    // ESCENARIO DÉFICIT: No se llegó a la meta. Usamos Escalas Negativas (Penalización).
    const n1 = config.negativeScales[0];
    const n2 = config.negativeScales[1];
    const n3 = config.negativeScales[2];
    const n4 = config.negativeScales[3];

    // Nota: Las escalas negativas verifican si estamos "por encima" de los pisos mínimos de venta.
    if (currentTotalSales > (n1.endAmount || 0)) {
        financialPercentage = n1.commissionPercentage;
    } else if (currentTotalSales > (n2.endAmount || 0)) {
        financialPercentage = n2.commissionPercentage;
    } else if (currentTotalSales > (n3.endAmount || 0)) {
        financialPercentage = n3.commissionPercentage;
    } else {
        financialPercentage = n4.commissionPercentage;
    }
  }

  const financialFactor = financialPercentage / 100;

  // =================================================================================
  // PASO 2: CÁLCULO DE FACTORES DE COBERTURA (ACTIVIDAD Y CIERRES)
  // =================================================================================
  
  // A. COBERTURA DE CARTERA (Actividades CRM)
  const uniqueCustomers = new Set(invoices.map(i => i.customerName)).size;
  let portfolioFactor = 1.0;
  
  // TODO: Conectar con API real para obtener tamaño real de cartera asignada.
  const MOCK_TOTAL_PORTFOLIO_SIZE = 40; 

  if (config.enablePortfolioCoverage) {
    const actualCoveragePct = (uniqueCustomers / MOCK_TOTAL_PORTFOLIO_SIZE) * 100;
    
    // Cálculo de "Attainment": ¿Qué porcentaje de la meta cumplimos?
    const coverageAttainmentPct = config.portfolioActivityTarget > 0 
      ? (actualCoveragePct / config.portfolioActivityTarget) * 100 
      : 0;

    // Lógica Descendente: Buscamos en qué rango cae el cumplimiento
    const matchedScale = config.portfolioScales.find(scale => 
       coverageAttainmentPct <= scale.startPercentage && coverageAttainmentPct >= scale.endPercentage
    );

    if (coverageAttainmentPct > config.portfolioScales[0].startPercentage) {
        portfolioFactor = config.portfolioScales[0].payoutFactor; // Tope máximo
    } else if (matchedScale) {
        portfolioFactor = matchedScale.payoutFactor;
    } else {
        // Castigo severo si cae por debajo del rango mínimo configurado
        const lowestScale = config.portfolioScales[config.portfolioScales.length - 1];
        if (coverageAttainmentPct < lowestScale.endPercentage) {
            portfolioFactor = 0; 
        }
    }
  }

  // B. COBERTURA DE CIERRES (Win Rate)
  // TODO: Conectar con API de Oportunidades para obtener dato real.
  const mockClosingRate = 35; 
  let closingFactor = 1.0;

  if (config.enableClosingCoverage) {
      const matchedClosingScale = config.closingScales.find(scale => 
         mockClosingRate <= scale.startPercentage && mockClosingRate >= scale.endPercentage
      );

      if (mockClosingRate > config.closingScales[0].startPercentage) {
          closingFactor = config.closingScales[0].payoutFactor;
      } else if (matchedClosingScale) {
          closingFactor = matchedClosingScale.payoutFactor;
      } else {
           const lowestClosingScale = config.closingScales[config.closingScales.length - 1];
           if (mockClosingRate < lowestClosingScale.endPercentage) {
               closingFactor = 0;
           }
      }
  }

  // =================================================================================
  // PASO 3: PROCESAMIENTO INDIVIDUAL DE FACTURAS
  // =================================================================================
  
  const processedInvoices = invoices.map(inv => {
    // Calculamos fechas para esta factura específica
    const paymentDate = calculatePaymentDate(inv.docDate);
    const baseDate = new Date(inv.docDate);
    baseDate.setDate(baseDate.getDate() + 60);

    const baseRate = config.rates[inv.businessLine] || 0;
    
    // 1. Comisión Base (Venta * Tasa de Línea)
    let rawCommission = inv.docTotal * baseRate;

    // 2. Aplicación de Factores (Multiplicadores)
    // Fórmula: Base * (Factor $$) * (Factor Cartera) * (Factor Cierre)
    const adjustedCommission = rawCommission * financialFactor * portfolioFactor * closingFactor;

    // 3. Suma de Bonos Fijos (Granulares por Factura)
    // Nota: Los bonos se suman AL FINAL, no se ven afectados por los factores de penalización.
    let bonusAmount = 0;
    
    // Bono: Cliente Nuevo
    if (config.enableBonusNewClient && inv.isNewClient && inv.docTotal >= config.bonusNewClient.minPurchaseAmount) {
        bonusAmount += config.bonusNewClient.rewardAmount;
    }
    
    // Bono: Cliente Recuperado
    if (config.enableBonusRecovered && inv.isRecoveredClient && inv.docTotal >= config.bonusRecoveredClient.minPurchaseAmount) {
        bonusAmount += config.bonusRecoveredClient.rewardAmount;
    }
    
    const finalTotal = adjustedCommission + bonusAmount;

    return {
      ...inv,
      baseDate: baseDate.toISOString().split('T')[0],
      paymentDate: paymentDate,
      appliedRate: baseRate,
      baseCommissionAmount: rawCommission,
      finalCommissionAmount: finalTotal,
      
      // Guardamos los factores usados para trazabilidad en reportes
      financialFactor,
      portfolioFactor,
      closingFactor,
      penaltyFactor: financialFactor * portfolioFactor * closingFactor,
      
      status: 'Pending' as const
    };
  });

  return processedInvoices;
};
