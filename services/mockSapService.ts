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
  // Generate ~40 invoices for the selected month to distribute among reps
  return Array.from({ length: 40 }).map((_, i) => {
    const rep = MOCK_HIERARCHY.reps[Math.floor(Math.random() * MOCK_HIERARCHY.reps.length)];
    const manager = MOCK_HIERARCHY.managers.find(m => m.id === rep.managerId);
    const line = BUSINESS_LINES[Math.floor(Math.random() * BUSINESS_LINES.length)];
    
    // Higher values for 'Proyectos' and 'Ventas', lower for 'Mantenimiento'
    let baseAmount = 5000;
    if (line === 'Ventas') baseAmount = 50000;
    if (line === 'Proyectos') baseAmount = 150000;
    if (line === 'Renta') baseAmount = 25000;

    return {
      docNum: 100020 + i,
      customerName: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
      docDate: generateRandomDate(year, month),
      docTotal: Math.floor(Math.random() * baseAmount) + 5000,
      currency: 'MXN',
      isPaid: Math.random() > 0.2,
      itemGroupCode: 100,
      isNewClient: Math.random() > 0.9, // 10% chance
      isRecoveredClient: Math.random() > 0.95, // 5% chance
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
    { month: 'Marzo', year: 2024, commissionEarned: 19500, payoutDate: '2024-05-15' },
    { month: 'Febrero', year: 2024, commissionEarned: 28000, payoutDate: '2024-04-15' },
    { month: 'Enero', year: 2024, commissionEarned: 22100, payoutDate: '2024-03-15' },
  ];
};

export const getYearlyHistory = (): YearlyHistory[] => {
  return [
    { year: 2026, totalCommission: 345000, isCurrent: false },
    { year: 2027, totalCommission: 380000, isCurrent: false },
    { year: 2028, totalCommission: 115000, isCurrent: true },
  ];
};