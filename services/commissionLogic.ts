import { CommissionConfig, Invoice, CommissionRecord, KpiData } from '../types';

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

export const calculateCommissionsBatch = (
  invoices: Invoice[],
  config: CommissionConfig,
  currentTotalSales: number
): CommissionRecord[] => {
  
  // 1. Determine Global Penalty Factor
  // NOTE: If Portfolio Coverage is DISABLED, we assume full achievement (no penalty from system level)
  // or we stick to the Sales Target penalty. The prompt says "ligarlo al dato". 
  // For this simulation, we'll keep the Sales Target penalty as the primary driver, 
  // but if Portfolio toggle is OFF, we might enforce a minimum factor of 1.0 (no penalty) 
  // OR just hide the metric. Usually sales penalties apply regardless.
  // Let's assume the Penalty Scale is ALWAYS active if enabled, but the specific KPIs 
  // (Portfolio/Conversion) are extra conditions.
  
  const achievement = config.globalTarget > 0 ? currentTotalSales / config.globalTarget : 0;
  let penaltyFactor = 1.0;

  // Only apply target-based penalties if Portfolio Coverage (Simulated as "System Active" in prompt) is ON.
  // The prompt asked to change "Active System" to "Portfolio Coverage".
  if (config.enablePortfolioCoverage) {
    if (achievement >= 0.90) {
      penaltyFactor = config.scale90to100;
    } else if (achievement >= 0.80) {
      penaltyFactor = config.scale80to89; 
    } else if (achievement >= 0.70) {
      penaltyFactor = config.scale70to79;  
    } else {
      penaltyFactor = config.scaleBelow70;
    }
  } else {
    // If coverage logic is disabled, pay 100% of generated commission without scale penalties
    penaltyFactor = 1.0; 
  }

  return invoices.map(inv => {
    const paymentDate = calculatePaymentDate(inv.docDate);
    const baseDate = new Date(inv.docDate);
    baseDate.setDate(baseDate.getDate() + 60);

    const baseRate = config.rates[inv.businessLine] || 0;
    let rawCommission = inv.docTotal * baseRate;

    let bonusAmount = 0;
    if (config.enableBonuses) {
        if (inv.isNewClient) bonusAmount += config.bonusNewClientReward;
        if (inv.isRecoveredClient) bonusAmount += config.bonusRecoveredReward;
    }

    const totalBeforePenalty = rawCommission + bonusAmount;
    const finalCommission = totalBeforePenalty * penaltyFactor;

    return {
      ...inv,
      baseDate: baseDate.toISOString().split('T')[0],
      paymentDate: paymentDate,
      appliedRate: baseRate,
      baseCommissionAmount: totalBeforePenalty,
      finalCommissionAmount: finalCommission,
      commissionAmount: finalCommission,
      commissionRate: baseRate,
      penaltyFactor: penaltyFactor,
      status: 'Pending'
    };
  });
};