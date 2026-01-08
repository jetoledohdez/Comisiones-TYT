import { CommissionConfig, Invoice, CommissionRecord } from '../types';

export const calculatePaymentDate = (invoiceDateStr: string): string => {
  const invoiceDate = new Date(invoiceDateStr);
  const baseDate = new Date(invoiceDate);
  baseDate.setDate(baseDate.getDate() + 60);

  const baseDay = baseDate.getDate();
  const baseMonth = baseDate.getMonth();
  const baseYear = baseDate.getFullYear();

  if (baseDay <= 15) {
    return new Date(baseYear, baseMonth, 15).toISOString().split('T')[0];
  } else {
    return new Date(baseYear, baseMonth + 1, 15).toISOString().split('T')[0];
  }
};

export const calculateCommissionsBatch = (
  invoices: Invoice[],
  config: CommissionConfig,
  currentTotalSales: number
): CommissionRecord[] => {
  
  // --- 1. CALCULATE FINANCIAL FACTOR (ESCALAS) ---
  let financialPercentage = 0; 
  
  if (currentTotalSales > config.globalTarget) {
    // POSITIVE SCALES
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
    // NEGATIVE SCALES
    const n1 = config.negativeScales[0];
    const n2 = config.negativeScales[1];
    const n3 = config.negativeScales[2];
    const n4 = config.negativeScales[3];

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

  // --- 2. CALCULATE COVERAGE FACTORS ---
  const uniqueCustomers = new Set(invoices.map(i => i.customerName)).size;
  let portfolioFactor = 1.0;
  
  if (config.enablePortfolioCoverage) {
    const coverageAchievedPct = config.portfolioActivityTarget > 0 
      ? (uniqueCustomers / config.portfolioActivityTarget) * 100 
      : 0;

    if (coverageAchievedPct >= config.portfolioScales[0].startPercentage) {
        portfolioFactor = config.portfolioScales[0].payoutFactor;
    } else if (coverageAchievedPct >= config.portfolioScales[1].startPercentage) {
        portfolioFactor = config.portfolioScales[1].payoutFactor;
    } else {
        portfolioFactor = config.portfolioScales[2].payoutFactor;
    }
  }

  const mockClosingRate = 35; // Simulated for now
  let closingFactor = 1.0;

  if (config.enableClosingCoverage) {
      if (mockClosingRate >= config.closingScales[0].startPercentage) {
          closingFactor = config.closingScales[0].payoutFactor;
      } else if (mockClosingRate >= config.closingScales[1].startPercentage) {
          closingFactor = config.closingScales[1].payoutFactor;
      } else {
          closingFactor = config.closingScales[2].payoutFactor;
      }
  }

  return invoices.map(inv => {
    const paymentDate = calculatePaymentDate(inv.docDate);
    const baseDate = new Date(inv.docDate);
    baseDate.setDate(baseDate.getDate() + 60);

    const baseRate = config.rates[inv.businessLine] || 0;
    
    // Base Commission
    let rawCommission = inv.docTotal * baseRate;

    // Apply Factors
    const adjustedCommission = rawCommission * financialFactor * portfolioFactor * closingFactor;

    // Add Bonuses (Granular Checks)
    let bonusAmount = 0;
    
    // 1. New Client Bonus
    if (config.enableBonusNewClient && inv.isNewClient && inv.docTotal >= config.bonusNewClient.minPurchaseAmount) {
        bonusAmount += config.bonusNewClient.rewardAmount;
    }
    
    // 2. Recovered Client Bonus
    if (config.enableBonusRecovered && inv.isRecoveredClient && inv.docTotal >= config.bonusRecoveredClient.minPurchaseAmount) {
        bonusAmount += config.bonusRecoveredClient.rewardAmount;
    }

    // 3. Volume Bonus (Calculation usually done per Rep aggregate, but here applied flat for simplicity or as a 'share')
    // For this simulation, we'll apply it if they met the volume target in the month (passed via config if needed, but handled simpler here)
    
    const finalTotal = adjustedCommission + bonusAmount;

    return {
      ...inv,
      baseDate: baseDate.toISOString().split('T')[0],
      paymentDate: paymentDate,
      appliedRate: baseRate,
      baseCommissionAmount: rawCommission,
      finalCommissionAmount: finalTotal,
      
      // Breakdown
      financialFactor,
      portfolioFactor,
      closingFactor,
      penaltyFactor: financialFactor * portfolioFactor * closingFactor,
      
      status: 'Pending'
    };
  });
};