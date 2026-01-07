export enum UserRole {
  SALES_REP = 'SALES_REP',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR' // Admin
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  territory?: string; // For Directors/Managers
  managerId?: string; // For Reps
}

export type BusinessLine = 
  | 'Ventas' 
  | 'Renta' 
  | 'Mantenimiento' 
  | 'Calibración' 
  | 'Capacitación' 
  | 'Supervisión' 
  | 'Proyectos' 
  | 'Otros';

// Configuration now supports specific values, not just booleans
export interface CommissionConfig {
  // Global Rules
  globalTarget: number; // $700,000 example
  floorPercentage: number; // 70%
  
  // Penalties / Scales (Percentage of commission paid based on achievement)
  scale90to100: number; // 100%
  scale80to89: number;  // 80%
  scale70to79: number;  // 70%
  scaleBelow70: number; // 0%

  // Business Line Commission Rates (decimal, e.g., 0.015 for 1.5%)
  rates: Record<BusinessLine, number>;
  
  // Business Line Targets (Specific targets per line if needed, otherwise global)
  lineTargets: Record<BusinessLine, number>;

  // Bonuses
  bonusNewClient: number;      // $500
  bonusRecoveredClient: number; // $500
  bonusGoalNewClients: number; // $1500 for 5 clients
}

export interface Invoice {
  docNum: number;
  customerName: string;
  docDate: string; // ISO Date
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
  baseCommissionAmount: number; // Before penalty
  finalCommissionAmount: number; // After penalty
  appliedRate: number;
  penaltyFactor: number; // 1.0, 0.8, 0.7 or 0
  status: 'Pending' | 'Approved' | 'Paid';
}

export interface KpiData {
  salesTarget: number;
  currentSales: number;
  visitCoverage: number; // Percentage
  closingRate: number; 
  lastYearSales: number;
  projectedCommission: number;
  achievementRate: number; // % of target reached
}

export interface FilterState {
  month: number;
  year: number;
  selectedTerritory: string | 'ALL';
  selectedManager: string | 'ALL';
  selectedRep: string | 'ALL';
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