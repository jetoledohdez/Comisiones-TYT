import { Invoice, KpiData, BusinessLine, MonthlyHistory, YearlyHistory, UserRole } from '../types';

// Mock Hierarchy
export const MOCK_HIERARCHY = {
  directors: [{ id: 'd1', name: 'Carlos Director', territory: 'Global' }],
  managers: [
    { id: 'm1', name: 'Laura Norte', territory: 'Norte', directorId: 'd1' },
    { id: 'm2', name: 'Pedro Sur', territory: 'Sur', directorId: 'd1' }
  ],
  reps: [
    { id: 'r1', name: 'Juan Vendedor', managerId: 'm1', territory: 'Norte' },
    { id: 'r2', name: 'Ana Ventas', managerId: 'm1', territory: 'Norte' },
    { id: 'r3', name: 'Luis Sur', managerId: 'm2', territory: 'Sur' },
  ]
};

const CUSTOMERS = [
  "Cementos Moctezuma S.A.", "Ternium México", "Kia Motors", "Nemak Global", "Cervecería Cuauhtémoc", "Ford Planta", "Bimbo S.A."
];

const BUSINESS_LINES: BusinessLine[] = [
  'Ventas', 'Renta', 'Mantenimiento', 'Calibración', 'Capacitación', 'Supervisión', 'Proyectos'
];

const generateRandomDate = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
};

export const getMockInvoices = (month: number, year: number): Invoice[] => {
  // SCENARIO LOGIC:
  // Months 1, 2, 3, 4: High Performance (Overachievers + Bonuses)
  // Months 5, 6, 7, 8: On Target (100% - 110%)
  // Months 9, 10: Partial Penalty (80% - 90%)
  // Months 11, 12: Failure (< 70%)
  
  let performanceMultiplier = 1.0;
  let bonusChance = 0.05;

  if ([1, 2, 3, 4].includes(month)) {
    performanceMultiplier = 1.5; // Way above target
    bonusChance = 0.4; // High chance of new clients
  } else if ([5, 6, 7, 8].includes(month)) {
    performanceMultiplier = 1.05; // Just right
    bonusChance = 0.1;
  } else if ([9, 10].includes(month)) {
    performanceMultiplier = 0.85; // Penalty zone
    bonusChance = 0.0;
  } else {
    performanceMultiplier = 0.5; // Failure zone
    bonusChance = 0.0;
  }

  const baseCount = Math.floor(35 * performanceMultiplier);

  return Array.from({ length: baseCount }).map((_, i) => {
    const rep = MOCK_HIERARCHY.reps[Math.floor(Math.random() * MOCK_HIERARCHY.reps.length)];
    const manager = MOCK_HIERARCHY.managers.find(m => m.id === rep.managerId);
    const line = BUSINESS_LINES[Math.floor(Math.random() * BUSINESS_LINES.length)];
    
    let baseAmount = 10000;
    if (line === 'Ventas') baseAmount = 45000;
    if (line === 'Proyectos') baseAmount = 120000;
    if (line === 'Renta') baseAmount = 20000;

    // Add randomness to amounts
    const amount = (baseAmount * 0.5) + (Math.random() * baseAmount);

    return {
      docNum: 100020 + i + (month * 100),
      customerName: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
      docDate: generateRandomDate(year, month),
      docTotal: Math.floor(amount),
      currency: 'MXN',
      isPaid: Math.random() > 0.2,
      itemGroupCode: 100,
      isNewClient: Math.random() < bonusChance, 
      isRecoveredClient: Math.random() < (bonusChance / 2),
      businessLine: line,
      salesRepId: rep.id,
      salesRepName: rep.name,
      managerName: manager?.name,
      territory: rep.territory
    };
  });
};

export const getMonthlyHistory = (): MonthlyHistory[] => {
  return [
    { month: 'Junio', year: 2024, commissionEarned: 25400, payoutDate: '2024-08-15' },
    { month: 'Mayo', year: 2024, commissionEarned: 18200, payoutDate: '2024-07-15' },
    { month: 'Abril', year: 2024, commissionEarned: 21000, payoutDate: '2024-06-15' },
  ];
};

export const getYearlyHistory = (): YearlyHistory[] => {
  return [
    { year: 2026, totalCommission: 345000, isCurrent: false },
    { year: 2027, totalCommission: 380000, isCurrent: false },
    { year: 2028, totalCommission: 115000, isCurrent: true },
  ];
};