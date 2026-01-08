
export enum UserRole {
  SALES_REP = 'SALES_REP',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  territory?: string;
  managerId?: string;
}

export type BusinessLine = 
  | 'Ventas' | 'Renta' | 'Mantenimiento' | 'Calibración' 
  | 'Capacitación' | 'Supervisión' | 'Proyectos' | 'Otros';

export const LINE_COLORS: Record<BusinessLine, string> = {
  'Ventas': '#3B82F6',        // Blue
  'Renta': '#10B981',         // Emerald
  'Mantenimiento': '#F59E0B', // Amber
  'Calibración': '#EF4444',   // Red
  'Capacitación': '#8B5CF6',  // Violet
  'Supervisión': '#EC4899',   // Pink
  'Proyectos': '#6366F1',     // Indigo
  'Otros': '#9CA3AF'          // Gray
};

export interface FinancialScaleRow {
  endAmount?: number;
  commissionPercentage: number;
}

export interface CoverageScaleRow {
  startPercentage: number;
  endPercentage: number;
  payoutFactor: number;
}

export interface BonusRule {
  targetQty: number;
  rewardAmount: number;
  minPurchaseAmount: number;
}

export interface CommissionConfig {
  // 1. FINANCIAL TARGETS
  globalTarget: number;
  
  positiveScales: [FinancialScaleRow, FinancialScaleRow, FinancialScaleRow, FinancialScaleRow];
  negativeScales: [FinancialScaleRow, FinancialScaleRow, FinancialScaleRow, FinancialScaleRow];

  // 2. COVERAGES
  enablePortfolioCoverage: boolean;
  portfolioActivityTarget: number; 
  portfolioScales: [CoverageScaleRow, CoverageScaleRow, CoverageScaleRow]; 

  enableClosingCoverage: boolean;
  closingPercentageTarget: number; 
  closingScales: [CoverageScaleRow, CoverageScaleRow, CoverageScaleRow]; 

  // 3. BONUSES (Granular)
  enableBonusNewClient: boolean;
  enableBonusRecovered: boolean;
  enableBonusVolume: boolean;

  bonusNewClient: BonusRule;
  bonusRecoveredClient: BonusRule;
  bonusVolumeClients: { // Renamed from bonusGoalNewClients
    targetQty: number;
    rewardAmount: number;
    // Multiplier removed
  };

  // 4. BUSINESS LINES
  rates: Record<BusinessLine, number>;
  lineTargets: Record<BusinessLine, number>;
}

export interface Invoice {
  docNum: number;
  customerName: string;
  docDate: string;
  docTotal: number;
  currency: string;
  isPaid: boolean; 
  itemGroupCode: number; 
  isNewClient: boolean;
  isRecoveredClient: boolean;
  businessLine: BusinessLine;
  salesRepId: string;
  salesRepName: string;
  managerName?: string;
  territory?: string;
}

export interface CommissionRecord extends Invoice {
  baseDate: string;
  paymentDate: string;
  baseCommissionAmount: number; 
  finalCommissionAmount: number;
  appliedRate: number;
  
  financialFactor: number;
  portfolioFactor: number;
  closingFactor: number;
  
  penaltyFactor: number;
  status: 'Pending' | 'Approved' | 'Paid';
}

export interface FilterState {
  month: number;
  year: number;
  selectedTerritory: string | 'ALL';
  selectedManager: string | 'ALL';
  selectedRep: string | 'ALL';
}

// Mock Data Interfaces for New Dashboard Tables
export interface ClientActivity {
  clientId: string;
  clientName: string;
  calls: number;
  emails: number;
  visits: number;
  meetings: number;
  totalActivities: number;
}

export interface OpportunityData {
  oppId: string;
  clientName: string;
  description: string;
  status: 'Won' | 'Lost' | 'Open';
  invoiceNumber?: number; // Linked if won
  amount: number;
}

export interface MonthlyHistory {
  month: string;
  year: number;
  commissionEarned: number;
  payoutDate: string;
}

export interface YearlyHistory {
  year: number;
  totalCommission: number;
  isCurrent: boolean;
}
