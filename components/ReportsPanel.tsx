import React from 'react';
import { User, UserRole } from '../types';
import { FileText, Download, Lock, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getMockInvoices } from '../services/mockSapService';
import { calculateCommissionsBatch } from '../services/commissionLogic';

interface ReportsPanelProps {
  user: User;
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  allowedRoles: UserRole[];
  type: 'MONTHLY' | 'HISTORY' | 'GENERAL';
}

const REPORTS_DB: ReportDefinition[] = [
  // Sales Rep Reports
  {
    id: 'rep_monthly',
    name: 'Estado de Cuenta de Comisiones (Mensual)',
    description: 'Desglose detallado de facturas, cálculo de tasas y fechas de pago.',
    allowedRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.DIRECTOR],
    type: 'MONTHLY'
  },
  {
    id: 'rep_history',
    name: 'Historial Anual de Compensaciones',
    description: 'Resumen histórico de pagos, bonos y penalizaciones acumuladas.',
    allowedRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.DIRECTOR],
    type: 'HISTORY'
  },
  // Manager Reports
  {
    id: 'zone_performance',
    name: 'KPIs de Zona (Gerencial)',
    description: 'Consolidado de ventas y comisiones por territorio.',
    allowedRoles: [UserRole.MANAGER, UserRole.DIRECTOR],
    type: 'GENERAL'
  },
  // Director Reports
  {
    id: 'global_sales',
    name: 'Reporte Global de Ventas y Márgenes',
    description: 'Visión completa de todas las zonas y líneas de negocio.',
    allowedRoles: [UserRole.DIRECTOR],
    type: 'GENERAL'
  }
];

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ user }) => {

  const generatePDF = (report: ReportDefinition) => {
    const doc = new jsPDF();
    const now = new Date();
    const serialNumber = `RPT-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // --- Mock Data Generation for PDF Context ---
    // In a real app, this would use the current 'config' state
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const invoices = getMockInvoices(currentMonth, currentYear);
    const mockConfig: any = { // Replicating default config for report generation
      globalTarget: 700000, 
      rates: { 'Ventas': 0.015, 'Renta': 0.02, 'Mantenimiento': 0.015, 'Calibración': 0.015, 'Capacitación': 0.10, 'Supervisión': 0.03, 'Proyectos': 0.03, 'Otros': 0.00 },
      enableBonuses: true, enablePortfolioCoverage: true, scale90to100: 1.0, scaleBelow70: 0.0,
      bonusNewClientReward: 500, bonusRecoveredReward: 500
    };
    const totalSales = invoices.reduce((sum, inv) => sum + inv.docTotal, 0);
    const processedData = calculateCommissionsBatch(invoices, mockConfig, totalSales);
    // ---------------------------------------------

    // 1. Header
    doc.setFillColor(255, 184, 0); // #FFB800
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("TORQUE Y TENSIÓN - REPORTE OFICIAL", 14, 16);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Serie: ${serialNumber}`, 150, 16);
    doc.text(`Fecha Impresión: ${now.toLocaleString()}`, 150, 21);

    // 2. User Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Reporte: ${report.name}`, 14, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Usuario: ${user.name}`, 14, 42);
    doc.text(`Rol: ${user.role}`, 14, 47);
    doc.text(`ID Empleado: ${user.id}`, 14, 52);
    doc.text(`Territorio: ${user.territory || 'N/A'}`, 80, 52);

    let startY = 60;

    if (report.type === 'MONTHLY') {
      // 3. Summary Section
      const totalCommission = processedData.reduce((acc, curr) => acc + curr.finalCommissionAmount, 0);
      const penaltyFactor = processedData.length > 0 ? processedData[0].penaltyFactor : 1.0;

      doc.setDrawColor(200);
      doc.line(14, 55, 196, 55);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102); // #003366
      doc.text("Resumen Ejecutivo del Periodo", 14, startY);
      
      const summaryData = [
        ['Venta Total', 'Meta Global', '% Cumplimiento', 'Factor Penalización', 'Total a Pagar'],
        [
          `$${totalSales.toLocaleString()}`, 
          `$${mockConfig.globalTarget.toLocaleString()}`, 
          `${((totalSales/mockConfig.globalTarget)*100).toFixed(1)}%`,
          `${(penaltyFactor * 100)}%`,
          `$${totalCommission.toLocaleString()}`
        ]
      ];

      autoTable(doc, {
        startY: startY + 5,
        head: [summaryData[0]],
        body: [summaryData[1]],
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 }
      });

      startY = (doc as any).lastAutoTable.finalY + 15;

      // 4. Business Line Breakdown
      doc.text("Desglose por Línea de Negocio y Bonos", 14, startY);
      
      const lines = Object.keys(mockConfig.rates);
      const tableRows = lines.map(line => {
        const lineInvoices = processedData.filter(i => i.businessLine === line);
        const lineSales = lineInvoices.reduce((s, i) => s + i.docTotal, 0);
        const lineComm = lineInvoices.reduce((s, i) => s + i.baseCommissionAmount, 0);
        return [
          line,
          `${(mockConfig.rates[line] * 100).toFixed(2)}%`,
          `$${lineSales.toLocaleString()}`,
          `$${lineComm.toLocaleString()}` // Before penalty
        ];
      });

      autoTable(doc, {
        startY: startY + 5,
        head: [['Línea de Negocio', 'Tasa', 'Venta Real', 'Comisión Base']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
        styles: { fontSize: 9 }
      });

      startY = (doc as any).lastAutoTable.finalY + 15;

      // 5. Bonuses & Penalties Detail
      doc.text("Detalle de Ajustes (Bonos y Penalizaciones)", 14, startY);
      
      const bonuses = processedData.filter(i => i.isNewClient || i.isRecoveredClient);
      const bonusTotal = bonuses.reduce((acc, curr) => {
         let b = 0;
         if(curr.isNewClient) b += 500;
         if(curr.isRecoveredClient) b += 500;
         return acc + b;
      }, 0);

      const penaltyDeduction = processedData.reduce((acc, curr) => acc + (curr.baseCommissionAmount - curr.finalCommissionAmount), 0);

      const adjustmentRows = [
        ['Bonos por Clientes Nuevos/Recuperados', `+ $${bonusTotal.toLocaleString()}`, 'Pagado'],
        ['Ajuste por Cobertura de Cartera (Factor)', `- $${penaltyDeduction.toLocaleString()}`, penaltyFactor < 1 ? 'APLICADO' : 'N/A'],
      ];

      autoTable(doc, {
        startY: startY + 5,
        head: [['Concepto', 'Monto Impacto', 'Estado']],
        body: adjustmentRows,
        theme: 'plain',
        styles: { fontSize: 9 },
        columnStyles: { 
          1: { fontStyle: 'bold', textColor: penaltyDeduction > 0 ? [200, 0, 0] : [0, 100, 0] } 
        }
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount} - Generado por T&T Systems`, 14, 285);
      doc.text(`UUID: ${crypto.randomUUID()}`, 130, 285);
    }

    doc.save(`${report.name.replace(/\s+/g, '_')}_${serialNumber}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 border-b pb-4 border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-[#003366] dark:text-white mb-2">Centro de Reportes</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Generación de documentos oficiales. Los reportes incluyen número de serie y firma digital simulada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTS_DB.map((report) => {
          const isAllowed = report.allowedRoles.includes(user.role);
          
          return (
            <div 
              key={report.id} 
              className={`p-6 rounded-lg border flex flex-col justify-between transition-all ${
                isAllowed 
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#FFB800]' 
                  : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-full ${isAllowed ? 'bg-blue-50 dark:bg-gray-700 text-[#003366] dark:text-[#FFB800]' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                    {report.type === 'HISTORY' ? <Printer size={24} /> : <FileText size={24} />}
                  </div>
                  {!isAllowed && <Lock size={20} className="text-gray-400" />}
                </div>
                <h3 className="font-bold text-lg text-[#1A1A1A] dark:text-white mb-2">{report.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{report.description}</p>
              </div>

              <button
                disabled={!isAllowed}
                onClick={() => generatePDF(report)}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded font-medium transition-colors w-full ${
                  isAllowed 
                    ? 'bg-[#1A1A1A] text-white hover:bg-[#FFB800] hover:text-black dark:bg-[#FFB800] dark:text-black dark:hover:bg-yellow-400' 
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <Download size={18} />
                <span>{isAllowed ? 'Generar PDF Oficial' : 'Acceso Restringido'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};