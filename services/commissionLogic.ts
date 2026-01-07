import { CommissionConfig, Invoice, CommissionRecord, KpiData } from '../types';

// ==========================================
// A. Lógica Financiera Crítica (The Algorithm)
// ==========================================

export const calculatePaymentDate = (invoiceDateStr: string): string => {
  const invoiceDate = new Date(invoiceDateStr);
  const baseDate = new Date(invoiceDate);
  baseDate.setDate(baseDate.getDate() + 60);

  const baseDay = baseDate.getDate();
  const baseMonth = baseDate.getMonth();
  const baseYear = baseDate.getFullYear();

  let payDate: Date;

  if (baseDay <= 15) {
    payDate = new Date(baseYear, baseMonth, 15);
  } else {
    payDate = new Date(baseYear, baseMonth + 1, 15);
  }

  return payDate.toISOString().split('T')[0];
};

/**
 * Calculates commission considering:
 * 1. Specific Rate per Business Line
 * 2. Global Penalty Factor based on Total Sales vs Target
 */
export const calculateCommissionsBatch = (
  invoices: Invoice[],
  config: CommissionConfig,
  currentTotalSales: number // Passed from outside to determine penalty factor
): CommissionRecord[] => {
  
  // 1. Determine Global Penalty Factor
  // Logic from PDF: 
  // 90%+ = 100% comm, 80-89% = 80%, 70-79% = 70%, <70% = 0%
  const achievement = currentTotalSales / config.globalTarget;
  let penaltyFactor = 0;

  if (achievement >= 0.90) {
    penaltyFactor = config.scale90to100; // 1.0
  } else if (achievement >= 0.80) {
    penaltyFactor = config.scale80to89;  // 0.8
  } else if (achievement >= 0.70) {
    penaltyFactor = config.scale70to79;  // 0.7
  } else {
    penaltyFactor = config.scaleBelow70; // 0.0
  }

  return invoices.map(inv => {
    const paymentDate = calculatePaymentDate(inv.docDate);
    const baseDate = new Date(inv.docDate);
    baseDate.setDate(baseDate.getDate() + 60);

    // Get specific rate for business line
    const baseRate = config.rates[inv.businessLine] || 0;
    
    // Calculate raw commission
    let rawCommission = inv.docTotal * baseRate;

    // Apply Bonuses directly to raw amount (Bonuses usually exempt from penalty? 
    // PDF implies "Costo Vendedor 6.1% CASTIGO" applies to variable income. 
    // Let's assume bonuses are part of variable income and subject to floor, 
    // unless specified otherwise. We will apply penalty to everything for safety).
    let bonusAmount = 0;
    if (inv.isNewClient) bonusAmount += config.bonusNewClient;
    if (inv.isRecoveredClient) bonusAmount += config.bonusRecoveredClient;

    const totalBeforePenalty = rawCommission + bonusAmount;
    const finalCommission = totalBeforePenalty * penaltyFactor;

    return {
      ...inv,
      baseDate: baseDate.toISOString().split('T')[0],
      paymentDate: paymentDate,
      appliedRate: baseRate,
      baseCommissionAmount: totalBeforePenalty,
      finalCommissionAmount: finalCommission,
      commissionAmount: finalCommission, // Mapping for UI compatibility
      commissionRate: baseRate, // Mapping for UI compatibility
      penaltyFactor: penaltyFactor,
      status: 'Pending'
    };
  });
};