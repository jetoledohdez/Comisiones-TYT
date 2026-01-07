import React from 'react';
import { User, UserRole } from '../types';
import { FileText, Download, Lock } from 'lucide-react';

interface ReportsPanelProps {
  user: User;
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  allowedRoles: UserRole[];
}

const REPORTS_DB: ReportDefinition[] = [
  // Sales Rep Reports
  {
    id: 'rep_monthly',
    name: 'Mis Comisiones (Mes Actual)',
    description: 'Desglose detallado de facturas y cálculo de fechas de pago.',
    allowedRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.DIRECTOR]
  },
  {
    id: 'rep_history',
    name: 'Historial de Pagos (Anual)',
    description: 'Resumen de comisiones cobradas agrupadas por mes.',
    allowedRoles: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.DIRECTOR]
  },
  // Manager Reports
  {
    id: 'zone_performance',
    name: 'Desempeño de Zona',
    description: 'KPIs consolidados de todos los vendedores de la zona.',
    allowedRoles: [UserRole.MANAGER, UserRole.DIRECTOR]
  },
  {
    id: 'zone_detail',
    name: 'Detalle por Vendedor',
    description: 'Reporte individual de cada vendedor asignado.',
    allowedRoles: [UserRole.MANAGER, UserRole.DIRECTOR]
  },
  // Director Reports
  {
    id: 'global_sales',
    name: 'Reporte Global de Ventas',
    description: 'Visión completa de todas las zonas y líneas de negocio.',
    allowedRoles: [UserRole.DIRECTOR]
  },
  {
    id: 'profitability',
    name: 'Rentabilidad por Línea de Negocio',
    description: 'Análisis de márgenes y comisiones pagadas por división.',
    allowedRoles: [UserRole.DIRECTOR]
  },
  {
    id: 'payout_forecast',
    name: 'Proyección de Flujo (Pagos)',
    description: 'Estimación de salidas de efectivo por comisiones a 60 días.',
    allowedRoles: [UserRole.DIRECTOR]
  }
];

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ user }) => {

  const handleDownload = (reportName: string) => {
    alert(`Descargando reporte: ${reportName}\nFormato: Excel (.xlsx)`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#003366] mb-2">Centro de Reportes</h2>
        <p className="text-gray-600">
          Descarga de información histórica y operativa. 
          Su nivel de acceso es: <span className="font-bold bg-gray-200 px-2 py-0.5 rounded text-sm">{user.role}</span>
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
                  ? 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-[#FFB800]' 
                  : 'bg-gray-100 border-gray-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-full ${isAllowed ? 'bg-blue-50 text-[#003366]' : 'bg-gray-200 text-gray-400'}`}>
                    <FileText size={24} />
                  </div>
                  {!isAllowed && <Lock size={20} className="text-gray-400" />}
                </div>
                <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">{report.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{report.description}</p>
              </div>

              <button
                disabled={!isAllowed}
                onClick={() => handleDownload(report.name)}
                className={`flex items-center justify-center space-x-2 py-2 px-4 rounded font-medium transition-colors w-full ${
                  isAllowed 
                    ? 'bg-[#1A1A1A] text-white hover:bg-[#FFB800] hover:text-black' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Download size={18} />
                <span>{isAllowed ? 'Descargar' : 'Acceso Restringido'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};