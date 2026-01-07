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

export interface CommissionConfig {
  // Logic Toggles (Renamed)
  enablePortfolioCoverage: boolean; // Was isActive
  enableConversionRate: boolean;    // Was enablePenalties
  enableBonuses: boolean;

  // Global Rules
  globalTarget: number; 
  floorPercentage: number; 
  overFloorPercentage: number; // New: Sobre Piso
  
  // Penalties / Scales 
  scale90to100: number; 
  scale80to89: number;  
  scale70to79: number;  
  scaleBelow70: number; 

  // Specific Targets
  minPortfolioCoverage: number; // Target % e.g. 90
  minConversionRate: number;    // Target % e.g. 40

  // Business Line Commission Rates & Targets
  rates: Record<BusinessLine, number>;
  lineTargets: Record<BusinessLine, number>;

  // Bonuses Configuration (Value and Reward)
  bonusNewClientTarget: number; // e.g. 1 client
  bonusNewClientReward: number; // e.g. $500
  
  bonusRecoveredTarget: number; // e.g. 1 client
  bonusRecoveredReward: number; // e.g. $500
  
  bonusGoalNewClientsTarget: number; // e.g. 5 clients
  bonusGoalNewClientsReward: number; // e.g. $1500
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