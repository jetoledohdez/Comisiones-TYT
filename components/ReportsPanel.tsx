
import React, { useState } from 'react';
import { User, UserRole, CommissionConfig, Invoice } from '../types';
import { FileText, Download, Lock, Printer, BarChart3, Globe } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getMockInvoices, getMockActivities, getMockOpportunities, MOCK_HIERARCHY } from '../services/mockSapService';
import { calculateCommissionsBatch } from '../services/commissionLogic';

interface ReportsPanelProps {
  user: User;
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  allowedRoles: UserRole[];
  type: 'MONTHLY' | 'HISTORY' | 'MANAGER' | 'DIRECTOR';
  icon: React.ReactNode;
}

// Configuration for simulation (In real app, this comes from Context/API)
const MOCK_CONFIG: CommissionConfig = {
  globalTarget: 700000,
  positiveScales: [
    { endAmount: 750000, commissionPercentage: 105 },
    { endAmount: 850000, commissionPercentage: 110 },
    { endAmount: 1000000, commissionPercentage: 115 },
    { endAmount: undefined, commissionPercentage: 120 }
  ],
  negativeScales: [
    { endAmount: 600000, commissionPercentage: 90 },
    { endAmount: 500000, commissionPercentage: 80 },
    { endAmount: 400000, commissionPercentage: 70 },
    { endAmount: undefined, commissionPercentage: 50 }
  ],
  enablePortfolioCoverage: true,
  portfolioActivityTarget: 50,
  portfolioScales: [
    { startPercentage: 100, endPercentage: 90, payoutFactor: 1.0 },
    { startPercentage: 89, endPercentage: 80, payoutFactor: 0.9 },
    { startPercentage: 79, endPercentage: 0, payoutFactor: 0.8 }
  ],
  enableClosingCoverage: true,
  closingPercentageTarget: 30,
  closingScales: [
    { startPercentage: 100, endPercentage: 90, payoutFactor: 1.0 },
    { startPercentage: 89, endPercentage: 80, payoutFactor: 0.9 },
    { startPercentage: 79, endPercentage: 0, payoutFactor: 0.8 }
  ],
  enableBonusNewClient: true,
  enableBonusRecovered: true,
  enableBonusVolume: true,
  bonusNewClient: { targetQty: 2, rewardAmount: 500, minPurchaseAmount: 5000 },
  bonusRecoveredClient: { targetQty: 2, rewardAmount: 500, minPurchaseAmount: 5000 },
  bonusVolumeClients: { targetQty: 5, rewardAmount: 1500 },
  rates: {
    'Ventas': 0.015, 'Renta': 0.02, 'Mantenimiento': 0.015, 'Calibración': 0.015,
    'Capacitación': 0.10, 'Supervisión': 0.03, 'Proyectos': 0.03, 'Otros': 0.00
  },
  lineTargets: { 'Ventas': 300000, 'Renta': 250000, 'Mantenimiento': 30000, 'Calibración': 30000, 'Capacitación': 20000, 'Supervisión': 40000, 'Proyectos': 30000, 'Otros': 0 }
};

const REPORTS_DB: ReportDefinition[] = [
  {
    id: 'rep_monthly',
    name: 'Estado de Cuenta de Comisiones',
    description: 'Desglose detallado mensual: Reglas, Composición, Facturas y Bonos.',
    allowedRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.DIRECTOR],
    type: 'MONTHLY',
    icon: <FileText size={24} />
  },
  {
    id: 'rep_history',
    name: 'Historial Anual de Compensaciones',
    description: 'Evolución mensual de ventas, coberturas y comisiones totales.',
    allowedRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.DIRECTOR],
    type: 'HISTORY',
    icon: <Printer size={24} />
  },
  {
    id: 'zone_performance',
    name: 'KPIs de Zona (Gerencial)',
    description: 'Tabla comparativa de desempeño de vendedores por zona.',
    allowedRoles: [UserRole.MANAGER, UserRole.DIRECTOR],
    type: 'MANAGER',
    icon: <BarChart3 size={24} />
  },
  {
    id: 'global_sales',
    name: 'Reporte Global de Dirección',
    description: 'Consolidado total agrupado por Gerencias y Vendedores.',
    allowedRoles: [UserRole.DIRECTOR],
    type: 'DIRECTOR',
    icon: <Globe size={24} />
  }
];

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ user }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // --- HELPERS FOR PDF GENERATION ---

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  // DRAW HEADER (Simulating Odoo Data Extraction)
  const drawHeader = (doc: jsPDF, title: string, specificUser: User | null, printId: string) => {
    // 1. Yellow Brand Bar
    doc.setFillColor(255, 184, 0); // #FFB800
    doc.rect(0, 0, 216, 30, 'F'); // Letter Width approx 216mm

    // 2. Logo (Simulated)
    doc.setFillColor(0, 0, 0);
    doc.rect(14, 5, 20, 20, 'F');
    doc.setTextColor(255, 184, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("T&T", 16, 18);
    
    // 3. Title & ID
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text("TORQUE Y TENSIÓN", 40, 12);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(title.toUpperCase(), 40, 19);
    
    doc.setFontSize(9);
    doc.text(`ID Impresión: ${printId}`, 150, 10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 150, 15);

    // 4. User Info Context (Simulated Odoo Data)
    // Try to find full hierarchy info based on the user passed
    let repName = specificUser?.name || 'N/A';
    let territory = specificUser?.territory || 'Global';
    let managerName = 'N/A';

    if (specificUser?.role === UserRole.SALES_REP) {
        const repData = MOCK_HIERARCHY.reps.find(r => r.id === specificUser.id);
        if (repData) {
            territory = repData.territory;
            const mgr = MOCK_HIERARCHY.managers.find(m => m.id === repData.managerId);
            managerName = mgr ? mgr.name : 'N/A';
        }
    } else if (specificUser?.role === UserRole.MANAGER) {
        managerName = specificUser.name; // Self
        repName = 'Equipo de Zona';
        const mgrData = MOCK_HIERARCHY.managers.find(m => m.id === specificUser.id);
        if(mgrData) territory = mgrData.territory;
    } else if (specificUser?.role === UserRole.DIRECTOR) {
        managerName = 'Dirección General';
        repName = 'Global';
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 200, 32);
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    // Left Side
    doc.text(`Vendedor / Responsable:`, 14, 38);
    doc.setFont("helvetica", "bold");
    doc.text(repName, 50, 38);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Territorio (Odoo):`, 14, 43);
    doc.setFont("helvetica", "bold");
    doc.text(territory, 50, 43);

    // Right Side
    doc.setFont("helvetica", "normal");
    doc.text(`Gerente (Odoo):`, 120, 38);
    doc.setFont("helvetica", "bold");
    doc.text(managerName, 150, 38);

    doc.setFont("helvetica", "normal");
    doc.text(`Periodo:`, 120, 43);
    doc.setFont("helvetica", "bold");
    doc.text(`${new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase()}`, 150, 43);

    return 50; // Return Y start position for content
  };

  // --- REPORT GENERATION LOGIC ---

  const generatePDF = async (report: ReportDefinition) => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // UI Feedback

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const printId = Math.random().toString(36).substring(2, 10).toUpperCase();

    // DETERMINE ACTIVE BONUSES FOR COLUMNS
    const activeBonusDefs = [];
    if (MOCK_CONFIG.enableBonusNewClient) activeBonusDefs.push({ key: 'new', label: 'Bono Nvo Cte' });
    if (MOCK_CONFIG.enableBonusRecovered) activeBonusDefs.push({ key: 'rec', label: 'Bono Recup' });
    if (MOCK_CONFIG.enableBonusVolume) activeBonusDefs.push({ key: 'vol', label: 'Bono Vol' });

    // Helper to calc bonus amounts for a processed batch
    const calculateBonuses = (processedInvoices: any[]) => {
       const bonusNew = processedInvoices.filter(i => i.isNewClient).length * (MOCK_CONFIG.enableBonusNewClient ? MOCK_CONFIG.bonusNewClient.rewardAmount : 0);
       const bonusRec = processedInvoices.filter(i => i.isRecoveredClient).length * (MOCK_CONFIG.enableBonusRecovered ? MOCK_CONFIG.bonusRecoveredClient.rewardAmount : 0);
       const uniqueNew = new Set(processedInvoices.filter(i => i.isNewClient).map(i => i.customerName)).size;
       const bonusVol = (MOCK_CONFIG.enableBonusVolume && uniqueNew >= MOCK_CONFIG.bonusVolumeClients.targetQty) ? MOCK_CONFIG.bonusVolumeClients.rewardAmount : 0;
       
       return { new: bonusNew, rec: bonusRec, vol: bonusVol, totalBonuses: bonusNew + bonusRec + bonusVol };
    };

    // --- DATA PREPARATION (Shared Logic) ---
    // Simulate current month data
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // 1. REPORTE MENSUAL (DETALLADO)
    if (report.type === 'MONTHLY') {
        const startY = drawHeader(doc, "Estado de Cuenta de Comisiones", user, printId);
        
        const invoices = getMockInvoices(currentMonth, currentYear).filter(inv => 
            user.role === UserRole.SALES_REP ? inv.salesRepId === user.id : true
        );
        const totalSales = invoices.reduce((sum, i) => sum + i.docTotal, 0);
        const processedInvoices = calculateCommissionsBatch(invoices, MOCK_CONFIG, totalSales);

        // CALC COMPOSITION
        const baseComm = processedInvoices.reduce((sum, i) => sum + i.baseCommissionAmount, 0);
        const factors = processedInvoices.length > 0 ? processedInvoices[0] : { financialFactor: 1, portfolioFactor: 1, closingFactor: 1 };
        
        const impactScale = (baseComm * factors.financialFactor) - baseComm;
        const impactPortfolio = (baseComm * factors.financialFactor * factors.portfolioFactor) - (baseComm * factors.financialFactor);
        const impactClosing = (baseComm * factors.financialFactor * factors.portfolioFactor * factors.closingFactor) - (baseComm * factors.financialFactor * factors.portfolioFactor);
        
        const bonuses = calculateBonuses(processedInvoices);
        const totalFinal = baseComm + impactScale + impactPortfolio + impactClosing + bonuses.totalBonuses;

        // TABLE 1: GAME RULES
        doc.setFontSize(10);
        doc.setTextColor(0, 51, 102);
        doc.text("1. Reglas de Juego del Periodo", 14, startY);
        
        autoTable(doc, {
            startY: startY + 2,
            head: [['Concepto', 'Meta / Configuración']],
            body: [
                ['Meta Global de Venta', formatCurrency(MOCK_CONFIG.globalTarget)],
                ['Meta Cobertura Cartera', `${MOCK_CONFIG.portfolioActivityTarget}% de Clientes con Actividad`],
                ['Meta Tasa de Cierre', `${MOCK_CONFIG.closingPercentageTarget}% de Oportunidades Ganadas`],
                ['Bono Vol. Clientes Nuevos', `Meta: ${MOCK_CONFIG.bonusVolumeClients.targetQty} clientes -> Premio: ${formatCurrency(MOCK_CONFIG.bonusVolumeClients.rewardAmount)}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [80, 80, 80] },
            styles: { fontSize: 8 }
        });

        // TABLE 2: COMMISSION COMPOSITION
        let nextY = (doc as any).lastAutoTable.finalY + 10;
        doc.text("2. Composición de la Comisión", 14, nextY);

        autoTable(doc, {
            startY: nextY + 2,
            head: [['Componente', 'Referencia', 'Impacto', 'Subtotal']],
            body: [
                ['Comisión Base', 'Ventas * Tasa Línea', formatCurrency(baseComm), formatCurrency(baseComm)],
                ['Impacto Escala Financiera', `Factor ${(factors.financialFactor * 100).toFixed(0)}%`, formatCurrency(impactScale), formatCurrency(baseComm + impactScale)],
                ['Impacto Cobertura Cartera', `Factor x${factors.portfolioFactor.toFixed(2)}`, formatCurrency(impactPortfolio), formatCurrency(baseComm + impactScale + impactPortfolio)],
                ['Impacto Cobertura Cierres', `Factor x${factors.closingFactor.toFixed(2)}`, formatCurrency(impactClosing), formatCurrency(baseComm + impactScale + impactPortfolio + impactClosing)],
                ['Bonos Adicionales', 'Nuevos + Recuperados + Volumen', formatCurrency(bonuses.totalBonuses), formatCurrency(totalFinal)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [0, 51, 102] },
            columnStyles: { 3: { fontStyle: 'bold', halign: 'right' }, 2: { halign: 'right' } },
            foot: [['', '', 'TOTAL A PAGAR', formatCurrency(totalFinal)]],
            footStyles: { fillColor: [255, 184, 0], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' }
        });

        // TABLE 3: DETAILED COMMISSIONS (EXPANDED)
        nextY = (doc as any).lastAutoTable.finalY + 10;
        doc.text("3. Detalle de Comisiones (Factura a Factura)", 14, nextY);

        autoTable(doc, {
            startY: nextY + 2,
            head: [['Factura', 'Fecha', 'Cliente', 'Línea', 'Importe', 'Tasa', 'Base', 'Final (Inc. Factores)']],
            body: processedInvoices.map(inv => [
                inv.docNum,
                inv.docDate,
                inv.customerName.substring(0, 20),
                inv.businessLine,
                formatCurrency(inv.docTotal),
                `${(inv.appliedRate * 100).toFixed(1)}%`,
                formatCurrency(inv.baseCommissionAmount),
                formatCurrency(inv.finalCommissionAmount)
            ]),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [60, 60, 60] }
        });

        // TABLE 4: CLOSING COVERAGE DETAILED
        nextY = (doc as any).lastAutoTable.finalY + 10;
        if(nextY > 250) { doc.addPage(); nextY = 20; }
        
        doc.text("4. Detalle de Cobertura de Cierres (Oportunidades)", 14, nextY);
        const opportunities = getMockOpportunities(invoices);
        
        autoTable(doc, {
            startY: nextY + 2,
            head: [['ID Oportunidad', 'Cliente', 'Estatus', 'Monto']],
            body: opportunities.map(op => [
                op.oppId,
                op.clientName,
                op.status,
                formatCurrency(op.amount)
            ]),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [60, 60, 60] }
        });

        // TABLE 5: CLIENT COVERAGE DETAILED
        nextY = (doc as any).lastAutoTable.finalY + 10;
         if(nextY > 250) { doc.addPage(); nextY = 20; }

        doc.text("5. Detalle de Cobertura de Clientes (Actividad)", 14, nextY);
        const activities = getMockActivities(invoices);

        autoTable(doc, {
            startY: nextY + 2,
            head: [['Cliente', 'Llamadas', 'Correos', 'Visitas', 'Total Actividades']],
            body: activities.map(act => [
                act.clientName, act.calls, act.emails, act.visits, act.totalActivities
            ]),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [60, 60, 60] }
        });

        // TABLE 6: BONUSES DETAIL
        nextY = (doc as any).lastAutoTable.finalY + 10;
        if(nextY > 250) { doc.addPage(); nextY = 20; }
        
        doc.text("6. Detalle de Bonos Activos", 14, nextY);
        autoTable(doc, {
            startY: nextY + 2,
            head: [['Bono', 'Meta', 'Resultado', 'Pagado']],
            body: [
                ['Cliente Nuevo (x Factura)', 'N/A', `${processedInvoices.filter(i=>i.isNewClient).length} facturas`, formatCurrency(bonuses.new)],
                ['Recuperado (x Factura)', 'N/A', `${processedInvoices.filter(i=>i.isRecoveredClient).length} facturas`, formatCurrency(bonuses.rec)],
                ['Volumen Clientes Nuevos', `${MOCK_CONFIG.bonusVolumeClients.targetQty} Clientes Únicos`, `${(bonuses.vol > 0 ? 'Meta Cumplida' : 'No Cumplida')}`, formatCurrency(bonuses.vol)]
            ],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 100, 0] }
        });
    }

    // 2. REPORTE HISTORIAL ANUAL (UPDATED WITH BONUS COLUMNS)
    if (report.type === 'HISTORY') {
        const startY = drawHeader(doc, "Historial Anual de Compensaciones", user, printId);
        
        const historyRows = [];
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Dynamic Columns
        const columns = [
            'Mes', 
            'Venta Total vs Meta', 
            'Cobertura vs Meta', 
            'Tasa Cierre vs Meta',
            ...activeBonusDefs.map(b => b.label),
            'Comisión Total'
        ];

        for (let m = 1; m <= 12; m++) {
            const mInvoices = getMockInvoices(m, currentYear).filter(inv => 
                user.role === UserRole.SALES_REP ? inv.salesRepId === user.id : true
            );
            
            if (mInvoices.length === 0 && m > currentMonth) {
                // Empty row with correct number of columns
                historyRows.push([months[m-1], '-', '-', '-', ...activeBonusDefs.map(() => '-'), '-']);
                continue;
            }

            const mTotalSales = mInvoices.reduce((s,i) => s + i.docTotal, 0);
            const mProcessed = calculateCommissionsBatch(mInvoices, MOCK_CONFIG, mTotalSales);
            
            // Calculate components
            const baseComm = mProcessed.reduce((s,i) => s + i.baseCommissionAmount, 0);
            const factors = mProcessed[0] || { financialFactor: 1, portfolioFactor: 1, closingFactor: 1};
            const impactScale = (baseComm * factors.financialFactor) - baseComm;
            const impactPortfolio = (baseComm * factors.financialFactor * factors.portfolioFactor) - (baseComm * factors.financialFactor);
            const impactClosing = (baseComm * factors.financialFactor * factors.portfolioFactor * factors.closingFactor) - (baseComm * factors.financialFactor * factors.portfolioFactor);
            
            const bonuses = calculateBonuses(mProcessed);
            const mTotalComm = baseComm + impactScale + impactPortfolio + impactClosing + bonuses.totalBonuses;
            
            // Metrics
            const activeClients = Math.floor(Math.random() * 50);
            const coveragePct = (activeClients / 40) * 100;
            const closingPct = 25 + Math.floor(Math.random() * 20);

            // Construct Row
            const row = [
                months[m-1],
                formatCurrency(mTotalSales),
                `${coveragePct.toFixed(0)}% / ${MOCK_CONFIG.portfolioActivityTarget}%`,
                `${closingPct.toFixed(0)}% / ${MOCK_CONFIG.closingPercentageTarget}%`
            ];

            // Add dynamic bonus values
            activeBonusDefs.forEach(def => {
                // @ts-ignore
                row.push(formatCurrency(bonuses[def.key]));
            });

            row.push(formatCurrency(mTotalComm));
            historyRows.push(row);
        }

        autoTable(doc, {
            startY: startY + 10,
            head: [columns],
            body: historyRows,
            theme: 'striped',
            headStyles: { fillColor: [0, 51, 102] },
            // Dynamically calculate right-align for last column
            columnStyles: { [columns.length - 1]: { fontStyle: 'bold', halign: 'right' }, 1: { halign: 'right'} }
        });
    }

    // 3. REPORTE KPIS ZONA (GERENTE) (UPDATED WITH BONUS COLUMNS)
    if (report.type === 'MANAGER') {
        const startY = drawHeader(doc, "KPIs de Zona - Desempeño Comercial", user, printId);

        const myReps = MOCK_HIERARCHY.reps.filter(r => 
            user.role === UserRole.DIRECTOR ? true : r.managerId === user.id
        );

        // Dynamic Columns
        const columns = [
            'Vendedor', 
            'Comisión Base', 
            'Impacto Escala', 
            'Impacto Coberturas',
            ...activeBonusDefs.map(b => b.label),
            'TOTAL MES'
        ];

        const rows = [];
        for (const rep of myReps) {
             const repInvoices = getMockInvoices(currentMonth, currentYear).filter(i => i.salesRepId === rep.id);
             const repTotalSales = repInvoices.reduce((s,i) => s + i.docTotal, 0);
             const repProcessed = calculateCommissionsBatch(repInvoices, MOCK_CONFIG, repTotalSales);
             
             const base = repProcessed.reduce((s,i) => s + i.baseCommissionAmount, 0);
             const factors = repProcessed[0] || { financialFactor: 1, portfolioFactor: 1, closingFactor: 1};
             
             const scaleImpact = (base * factors.financialFactor) - base;
             const coverageImpact = (base * factors.financialFactor * factors.portfolioFactor) - (base * factors.financialFactor);
             const closingImpact = (base * factors.financialFactor * factors.portfolioFactor * factors.closingFactor) - (base * factors.financialFactor * factors.portfolioFactor);
             
             const bonuses = calculateBonuses(repProcessed);
             const total = base + scaleImpact + coverageImpact + closingImpact + bonuses.totalBonuses;

             const row = [
                 rep.name,
                 formatCurrency(base),
                 formatCurrency(scaleImpact),
                 formatCurrency(coverageImpact + closingImpact)
             ];

             activeBonusDefs.forEach(def => {
                 // @ts-ignore
                 row.push(formatCurrency(bonuses[def.key]));
             });

             row.push(formatCurrency(total));
             rows.push(row);
        }

        autoTable(doc, {
            startY: startY + 10,
            head: [columns],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [255, 184, 0], textColor: [0,0,0] },
            columnStyles: { [columns.length - 1]: { fontStyle: 'bold', halign: 'right' }, 1: { halign: 'right' } }
        });
    }

    // 4. REPORTE GLOBAL DIRECTOR (UPDATED WITH BONUS COLUMNS)
    if (report.type === 'DIRECTOR') {
        const startY = drawHeader(doc, "Reporte Global de Ventas y Comisiones", user, printId);
        
        let currentY = startY + 10;

        // Dynamic Columns
        const columns = [
            'Vendedor', 
            'Venta Total', 
            'Com. Base', 
            'Cob. Cartera', 
            'Tasa Cierre',
            ...activeBonusDefs.map(b => b.label),
            'Comisión Final'
        ];

        for (const mgr of MOCK_HIERARCHY.managers) {
            
            doc.setFontSize(11);
            doc.setTextColor(0, 51, 102);
            doc.setFont("helvetica", "bold");
            doc.text(`Gerencia: ${mgr.name} (${mgr.territory})`, 14, currentY);

            const mgrReps = MOCK_HIERARCHY.reps.filter(r => r.managerId === mgr.id);
            const rows = [];

            for (const rep of mgrReps) {
                 const repInvoices = getMockInvoices(currentMonth, currentYear).filter(i => i.salesRepId === rep.id);
                 const repTotalSales = repInvoices.reduce((s,i) => s + i.docTotal, 0);
                 const repProcessed = calculateCommissionsBatch(repInvoices, MOCK_CONFIG, repTotalSales);
                 
                 const base = repProcessed.reduce((s,i) => s + i.baseCommissionAmount, 0);
                 
                 // Calculate full composition for total
                 const factors = repProcessed[0] || { financialFactor: 1, portfolioFactor: 1, closingFactor: 1};
                 const scaleImpact = (base * factors.financialFactor) - base;
                 const coverageImpact = (base * factors.financialFactor * factors.portfolioFactor) - (base * factors.financialFactor);
                 const closingImpact = (base * factors.financialFactor * factors.portfolioFactor * factors.closingFactor) - (base * factors.financialFactor * factors.portfolioFactor);
                 const bonuses = calculateBonuses(repProcessed);
                 
                 const total = base + scaleImpact + coverageImpact + closingImpact + bonuses.totalBonuses;
                 
                 const coverage = (Math.random() * 100).toFixed(0) + '%';
                 const closing = (20 + Math.random() * 30).toFixed(0) + '%';

                 const row = [
                     rep.name, 
                     formatCurrency(repTotalSales), 
                     formatCurrency(base), 
                     coverage, 
                     closing
                 ];

                 activeBonusDefs.forEach(def => {
                     // @ts-ignore
                     row.push(formatCurrency(bonuses[def.key]));
                 });

                 row.push(formatCurrency(total));
                 rows.push(row);
            }

            autoTable(doc, {
                startY: currentY + 2,
                head: [columns],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [60, 60, 60] },
                styles: { fontSize: 8 },
                columnStyles: { [columns.length - 1]: { fontStyle: 'bold', halign: 'right', textColor: [0, 100, 0] } }
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;
        }
    }


    doc.save(`${report.name.replace(/\s+/g, '_')}_${printId}.pdf`);
    setIsGenerating(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8 border-b pb-4 border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-[#003366] dark:text-white mb-2">Centro de Reportes Oficiales</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Generación de documentos PDF con validez oficial, folio único y datos sincronizados con Odoo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTS_DB.map((report) => {
          const isAllowed = report.allowedRoles.includes(user.role);
          
          return (
            <div 
              key={report.id} 
              className={`p-6 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
                isAllowed 
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#FFB800]' 
                  : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
              }`}
            >
              {isAllowed && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFB800] opacity-5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
              )}
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${isAllowed ? 'bg-blue-50 dark:bg-gray-700 text-[#003366] dark:text-[#FFB800]' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                    {report.icon}
                  </div>
                  {!isAllowed && <Lock size={20} className="text-gray-400" />}
                </div>
                <h3 className="font-bold text-lg text-[#1A1A1A] dark:text-white mb-2">{report.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 min-h-[40px]">{report.description}</p>
              </div>

              <button
                disabled={!isAllowed || isGenerating}
                onClick={() => generatePDF(report)}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded font-bold transition-transform active:scale-95 w-full ${
                  isAllowed 
                    ? 'bg-[#1A1A1A] text-white hover:bg-[#FFB800] hover:text-black dark:bg-[#FFB800] dark:text-black dark:hover:bg-yellow-400 shadow-lg' 
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                    <span className="animate-pulse">Generando...</span>
                ) : (
                    <>
                        <Download size={18} />
                        <span>{isAllowed ? 'Descargar PDF Oficial' : 'Acceso Restringido'}</span>
                    </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
