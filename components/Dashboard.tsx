import React, { useMemo, useState } from 'react';
import { CommissionConfig, User, FilterState, UserRole, LINE_COLORS, ClientActivity, OpportunityData } from '../types';
import { calculateCommissionsBatch } from '../services/commissionLogic';
import { getMockInvoices, getMockActivities, getMockOpportunities } from '../services/mockSapService';
import { FilterBar } from './FilterBar';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react';

interface DashboardProps {
  user: User;
  config: CommissionConfig;
  isDarkMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, config, isDarkMode }) => {
  const [filters, setFilters] = useState<FilterState>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    selectedTerritory: 'ALL',
    selectedManager: 'ALL',
    selectedRep: user.role === UserRole.SALES_REP ? user.id : 'ALL',
  });

  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  // 1. Data Fetching & Processing
  const rawInvoices = useMemo(() => getMockInvoices(filters.month, filters.year), [filters.month, filters.year]);
  
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter(inv => {
      if (user.role === UserRole.SALES_REP) return inv.salesRepId === user.id;
      let match = true;
      if (filters.selectedTerritory !== 'ALL') match = match && inv.territory === filters.selectedTerritory;
      if (filters.selectedManager !== 'ALL') match = match && (inv.managerName === `Manager ${filters.selectedManager}` || true);
      if (filters.selectedRep !== 'ALL') match = match && inv.salesRepId === filters.selectedRep;
      return match;
    });
  }, [rawInvoices, filters, user]);

  const currentTotalSales = filteredInvoices.reduce((acc, inv) => acc + inv.docTotal, 0);
  const processedInvoices = useMemo(() => calculateCommissionsBatch(filteredInvoices, config, currentTotalSales), [filteredInvoices, config, currentTotalSales]);
  const totalCommission = processedInvoices.reduce((acc, curr) => acc + curr.finalCommissionAmount, 0);

  // Mocked Activities & Opportunities based on filtered data context
  const clientActivities = useMemo(() => getMockActivities(filteredInvoices), [filteredInvoices]);
  const opportunities = useMemo(() => getMockOpportunities(filteredInvoices), [filteredInvoices]);

  // Coverage Metrics
  const activeClientsCount = clientActivities.length;
  const portfolioTarget = config.portfolioActivityTarget;
  const portfolioAchievedPct = portfolioTarget > 0 ? (activeClientsCount / portfolioTarget) * 100 : 0;

  const wonOpportunities = opportunities.filter(o => o.status === 'Won').length;
  const totalOpportunities = opportunities.length;
  const closingRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0;
  
  // Chart Data
  const chartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    processedInvoices.forEach(inv => {
      dataMap[inv.businessLine] = (dataMap[inv.businessLine] || 0) + inv.docTotal;
    });
    return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  }, [processedInvoices]);

  // Consolidated Table Data
  const consolidatedTable = useMemo(() => {
    const lines = Object.keys(config.rates) as string[];
    return lines.map(line => {
      const lineInvoices = processedInvoices.filter(inv => inv.businessLine === line);
      const income = lineInvoices.reduce((sum, inv) => sum + inv.docTotal, 0);
      const commission = lineInvoices.reduce((sum, inv) => sum + inv.finalCommissionAmount, 0);
      const rate = config.rates[line as keyof typeof config.rates];
      
      return {
        line,
        income,
        target: config.lineTargets[line as keyof typeof config.lineTargets] || 0,
        rate,
        commission,
        invoices: lineInvoices
      };
    });
  }, [processedInvoices, config]);

  // Styles
  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const tableHeaderClass = isDarkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200';
  const tableRowHover = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50';

  return (
    <div className="space-y-6">
      <FilterBar user={user} filters={filters} onFilterChange={setFilters} />

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 border-[#003366] col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Venta Total</p>
          <h3 className="text-2xl font-bold">${currentTotalSales.toLocaleString()}</h3>
          <p className={`text-xs mt-1 ${subTextClass}`}>vs Meta ${config.globalTarget.toLocaleString()}</p>
        </div>
        
        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 ${portfolioAchievedPct < 100 ? 'border-red-500' : 'border-green-500'} col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Cobertura Cartera</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-2xl font-bold">{portfolioAchievedPct.toFixed(1)}%</h3>
          </div>
          <p className={`text-xs mt-1 ${subTextClass}`}>{activeClientsCount} de {portfolioTarget} clientes</p>
        </div>

        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 border-[#FFB800] col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Tasa Cierres</p>
          <h3 className="text-2xl font-bold">{closingRate.toFixed(1)}%</h3>
          <p className={`text-xs mt-1 ${subTextClass}`}>Meta: {config.closingPercentageTarget}%</p>
        </div>

        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 border-green-600 col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Comisión Estimada</p>
          <h3 className="text-2xl font-bold">${totalCommission.toLocaleString()}</h3>
          <p className={`text-xs mt-1 ${subTextClass}`}>Neta a Pagar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pie Chart */}
        <div className={`lg:col-span-2 ${cardClass} p-6 rounded-lg shadow-sm flex flex-col items-center`}>
          <div className="w-full flex justify-between items-center mb-2">
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Distribución por Línea de Negocio</h3>
          </div>
          <div className="h-[300px] w-full relative"> 
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={LINE_COLORS[entry.name as keyof typeof LINE_COLORS] || '#999'} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFF', borderColor: isDarkMode ? '#374151' : '#E5E7EB', color: isDarkMode ? '#FFF' : '#000' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend Overlay */}
            <div className="absolute top-0 right-0 h-full overflow-y-auto text-xs space-y-1 p-2">
               {chartData.map(d => (
                 <div key={d.name} className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LINE_COLORS[d.name as keyof typeof LINE_COLORS] }}></span>
                   <span className={subTextClass}>{d.name}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Rules Summary (Read Only) */}
        <div className={`${cardClass} p-6 rounded-lg shadow-sm flex flex-col overflow-y-auto max-h-[400px]`}>
          <h3 className="font-bold mb-4 text-[#FFB800] border-b pb-2 border-gray-600">Reglas de Juego (Configuración)</h3>
          
          <div className="space-y-4 text-sm">
             <div>
               <span className="block text-xs uppercase font-bold opacity-50">Meta Mensual Ventas</span>
               <span className="font-mono font-bold text-lg">${config.globalTarget.toLocaleString()}</span>
             </div>

             <div>
               <span className="block text-xs uppercase font-bold opacity-50 mb-1">Escala Positiva (Mayor a Meta)</span>
               <div className="grid grid-cols-2 gap-1">
                 {config.positiveScales.map((s, i) => (
                   <div key={i} className="bg-green-900/20 p-1 rounded text-xs flex justify-between">
                      <span>Nivel {i+1}</span>
                      <span className="font-bold text-green-500">{s.commissionPercentage}%</span>
                   </div>
                 ))}
               </div>
             </div>

             <div>
               <span className="block text-xs uppercase font-bold opacity-50 mb-1">Escala Negativa (Menor a Meta)</span>
               <div className="grid grid-cols-2 gap-1">
                 {config.negativeScales.map((s, i) => (
                   <div key={i} className="bg-red-900/20 p-1 rounded text-xs flex justify-between">
                      <span>Nivel {i+1}</span>
                      <span className="font-bold text-red-500">{s.commissionPercentage}%</span>
                   </div>
                 ))}
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <span className="block text-xs uppercase font-bold opacity-50">Cobertura Cartera</span>
                   <span className={`font-bold ${config.enablePortfolioCoverage ? 'text-green-500' : 'text-gray-500'}`}>
                     {config.enablePortfolioCoverage ? 'ACTIVO' : 'INACTIVO'}
                   </span>
                </div>
                <div>
                   <span className="block text-xs uppercase font-bold opacity-50">Cobertura Cierres</span>
                   <span className={`font-bold ${config.enableClosingCoverage ? 'text-green-500' : 'text-gray-500'}`}>
                     {config.enableClosingCoverage ? 'ACTIVO' : 'INACTIVO'}
                   </span>
                </div>
             </div>
             
             <div>
                <span className="block text-xs uppercase font-bold opacity-50 mb-1">Bonos Disponibles</span>
                <div className="flex flex-wrap gap-2">
                   {config.enableBonusNewClient && <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs border border-blue-800">Cte. Nuevo</span>}
                   {config.enableBonusRecovered && <span className="px-2 py-1 bg-indigo-900/30 text-indigo-400 rounded text-xs border border-indigo-800">Recuperado</span>}
                   {config.enableBonusVolume && <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs border border-yellow-800">Volumen</span>}
                </div>
             </div>

          </div>
        </div>
      </div>

      {/* NEW: Detalle Cobertura Clientes */}
      <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className="font-bold text-[#FFB800]">Detalle de Cobertura de Clientes</h3>
            <p className="text-xs opacity-70">Actividades registradas en CRM (Odoo) vs Meta de {config.portfolioActivityTarget} Clientes</p>
          </div>
          <div className="text-right">
             <span className="text-2xl font-bold">{portfolioAchievedPct.toFixed(0)}%</span>
             <span className="text-xs block opacity-70">Logro vs Meta</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-64">
           <table className="w-full text-sm text-left">
             <thead className={`text-xs uppercase border-b sticky top-0 ${tableHeaderClass}`}>
               <tr>
                 <th className="px-6 py-3">Cliente</th>
                 <th className="px-6 py-3 text-center">Llamadas</th>
                 <th className="px-6 py-3 text-center">Correos</th>
                 <th className="px-6 py-3 text-center">Visitas</th>
                 <th className="px-6 py-3 text-center">Reuniones</th>
                 <th className="px-6 py-3 text-right font-bold">Total Actividades</th>
               </tr>
             </thead>
             <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
               {clientActivities.map(activity => (
                 <tr key={activity.clientId} className={tableRowHover}>
                   <td className="px-6 py-2 font-medium">{activity.clientName}</td>
                   <td className="px-6 py-2 text-center">{activity.calls}</td>
                   <td className="px-6 py-2 text-center">{activity.emails}</td>
                   <td className="px-6 py-2 text-center">{activity.visits}</td>
                   <td className="px-6 py-2 text-center">{activity.meetings}</td>
                   <td className="px-6 py-2 text-right font-bold text-[#FFB800]">{activity.totalActivities}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {/* NEW: Detalle Cobertura Cierres */}
      <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className="font-bold text-[#FFB800]">Detalle de Cobertura de Cierres</h3>
            <p className="text-xs opacity-70">Oportunidades Generadas vs Ganadas (Facturadas)</p>
          </div>
          <div className="text-right">
             <span className="text-2xl font-bold">{closingRate.toFixed(0)}%</span>
             <span className="text-xs block opacity-70">Tasa Conversión Real</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-64">
           <table className="w-full text-sm text-left">
             <thead className={`text-xs uppercase border-b sticky top-0 ${tableHeaderClass}`}>
               <tr>
                 <th className="px-6 py-3">ID Oportunidad</th>
                 <th className="px-6 py-3">Cliente</th>
                 <th className="px-6 py-3">Descripción</th>
                 <th className="px-6 py-3 text-center">Estatus</th>
                 <th className="px-6 py-3 text-right">Monto</th>
                 <th className="px-6 py-3 text-right">Factura Asoc.</th>
               </tr>
             </thead>
             <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
               {opportunities.map(opp => (
                 <tr key={opp.oppId} className={tableRowHover}>
                   <td className="px-6 py-2 font-mono text-xs opacity-70">{opp.oppId}</td>
                   <td className="px-6 py-2 font-medium">{opp.clientName}</td>
                   <td className="px-6 py-2 text-xs">{opp.description}</td>
                   <td className="px-6 py-2 text-center">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${
                       opp.status === 'Won' ? 'bg-green-900 text-green-300' : 
                       opp.status === 'Lost' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
                     }`}>
                       {opp.status}
                     </span>
                   </td>
                   <td className="px-6 py-2 text-right">${opp.amount.toLocaleString()}</td>
                   <td className="px-6 py-2 text-right font-mono text-[#FFB800]">
                     {opp.invoiceNumber ? `#${opp.invoiceNumber}` : '-'}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {/* Commission Breakdown Table */}
      <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden`}>
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className="font-bold text-[#FFB800]">Detalle de Comisiones (Tabla Maestra)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase border-b ${tableHeaderClass}`}>
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-6 py-3">Línea</th>
                <th className="px-6 py-3 text-right">Venta Real</th>
                <th className="px-6 py-3 text-center">% Base</th>
                <th className="px-6 py-3 text-right">Comisión Final</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {consolidatedTable.map((row) => (
                <React.Fragment key={row.line}>
                  <tr 
                    className={`cursor-pointer transition-colors ${tableRowHover}`}
                    onClick={() => setExpandedLine(expandedLine === row.line ? null : row.line)}
                  >
                    <td className="px-4 py-4 text-center">
                      {expandedLine === row.line ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LINE_COLORS[row.line as keyof typeof LINE_COLORS] }}></span>
                      {row.line}
                    </td>
                    <td className="px-6 py-4 text-right">${row.income.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-mono">{(row.rate * 100).toFixed(2)}%</td>
                    <td className="px-6 py-4 text-right font-bold text-[#FFB800]">
                      ${row.commission.toLocaleString()}
                    </td>
                  </tr>
                  
                  {expandedLine === row.line && (
                     <tr className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}>
                       <td colSpan={6} className="p-4">
                         <div className={`rounded border p-2 ${isDarkMode ? 'border-gray-700 bg-black' : 'border-gray-200 bg-white'}`}>
                           <h4 className="text-xs font-bold uppercase mb-2 text-[#003366]">Detalle: {row.line}</h4>
                           <table className={`w-full text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                             <thead>
                               <tr>
                                 <th className="p-2 text-left">Factura</th>
                                 <th className="p-2 text-left">Cliente</th>
                                 <th className="p-2 text-right">Monto</th>
                               </tr>
                             </thead>
                             <tbody>
                               {row.invoices.map(inv => (
                                 <tr key={inv.docNum} className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                   <td className="p-2 font-mono">#{inv.docNum}</td>
                                   <td className="p-2">{inv.customerName}</td>
                                   <td className="p-2 text-right">${inv.docTotal.toLocaleString()}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </td>
                     </tr>
                  )}
                </React.Fragment>
              ))}
              <tr className="bg-[#FFB800] text-black font-bold">
                <td className="px-4 py-4"></td>
                <td className="px-6 py-4">TOTAL</td>
                <td className="px-6 py-4 text-right">${currentTotalSales.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">-</td>
                <td className="px-6 py-4 text-right">${totalCommission.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};