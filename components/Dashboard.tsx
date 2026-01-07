import React, { useMemo, useState } from 'react';
import { CommissionConfig, User, FilterState, UserRole, Invoice } from '../types';
import { calculateCommissionsBatch } from '../services/commissionLogic';
import { getMockInvoices } from '../services/mockSapService';
import { FilterBar } from './FilterBar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { ChevronDown, ChevronRight, AlertTriangle, Clock, Mail } from 'lucide-react';

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

  // 1. Fetch & Filter Data
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
  const uniqueReps = new Set(filteredInvoices.map(i => i.salesRepId)).size;
  // Use uniqueReps to scale target for visualization if viewing multiple people
  const effectiveTarget = uniqueReps > 1 ? config.globalTarget * (uniqueReps * 0.5) : config.globalTarget; 
  
  const processedInvoices = useMemo(() => calculateCommissionsBatch(filteredInvoices, config, currentTotalSales), [filteredInvoices, config, currentTotalSales]);

  const totalCommission = processedInvoices.reduce((acc, curr) => acc + curr.finalCommissionAmount, 0);
  const achievementRate = effectiveTarget > 0 ? currentTotalSales / effectiveTarget : 0;
  const penaltyFactor = processedInvoices.length > 0 ? processedInvoices[0].penaltyFactor : 1;

  // Countdown & Alert Logic
  const today = new Date();
  const daysInMonth = new Date(filters.year, filters.month, 0).getDate();
  let daysLeft = 0;
  if (today.getMonth() + 1 === filters.month && today.getFullYear() === filters.year) {
    daysLeft = daysInMonth - today.getDate();
  }
  const showUrgencyAlert = daysLeft <= 5 && achievementRate < 1.0;

  // Chart Data
  const chartData = useMemo(() => {
    const allLines = Object.keys(config.rates);
    const dataMap: Record<string, number> = {};
    allLines.forEach(l => dataMap[l] = 0);
    processedInvoices.forEach(inv => {
      dataMap[inv.businessLine] = (dataMap[inv.businessLine] || 0) + inv.docTotal;
    });
    return Object.entries(dataMap).map(([name, sales]) => ({ name, sales }));
  }, [processedInvoices, config]);

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

      {/* Alert Banner */}
      {showUrgencyAlert && (
        <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
             <AlertTriangle size={24} />
             <div>
               <h3 className="font-bold text-lg">¡ATENCIÓN! CIERRE DE MES CRÍTICO</h3>
               <p className="text-sm text-red-100">Meta no alcanzada. Quedan {daysLeft} días. Reporte de desviación enviado a Dirección.</p>
             </div>
          </div>
          <div className="flex items-center space-x-2 bg-red-800 px-3 py-1 rounded">
            <Mail size={16} />
            <span className="text-xs font-bold uppercase">Correo Enviado</span>
          </div>
        </div>
      )}

      {/* Top Level KPIs & Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        
        {/* Countdown Widget */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow-sm border-l-4 border-[#FFB800] flex flex-col items-center justify-center`}>
           <div className="flex items-center space-x-2 mb-1">
             <Clock className="text-[#FFB800]" size={18} />
             <span className={`text-xs font-bold uppercase ${subTextClass}`}>Días Restantes</span>
           </div>
           <span className="text-4xl font-black text-[#FFB800]">{daysLeft > 0 ? daysLeft : '-'}</span>
           <span className="text-[10px] text-gray-500">Cierre de Mes</span>
        </div>

        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 border-[#003366] col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Venta Total</p>
          <h3 className="text-2xl font-bold">${currentTotalSales.toLocaleString()}</h3>
          <p className={`text-xs mt-1 ${subTextClass}`}>vs Meta ${effectiveTarget.toLocaleString()}</p>
        </div>
        
        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 ${achievementRate < 0.7 ? 'border-red-500' : 'border-[#FFB800]'} col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Cumplimiento</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-2xl font-bold">{(achievementRate * 100).toFixed(1)}%</h3>
          </div>
          <p className={`text-xs mt-1 ${subTextClass}`}>Factor Pago: {penaltyFactor * 100}%</p>
        </div>

        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 border-green-600 col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Comisión</p>
          <h3 className="text-2xl font-bold">${totalCommission.toLocaleString()}</h3>
          <p className={`text-xs mt-1 ${subTextClass}`}>Neta a Pagar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className={`lg:col-span-2 ${cardClass} p-6 rounded-lg shadow-sm`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Desempeño por Línea de Negocio</h3>
          </div>
          <div className="h-[300px] w-full bg-white rounded p-2 text-black"> 
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={12} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Venta']}
                  contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', color: '#fff', borderRadius: '4px' }}
                />
                <Bar dataKey="sales" fill="#003366" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Ventas' ? '#FFB800' : '#003366'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Updated Rules Summary with Monetary Equivalents */}
        <div className={`${cardClass} p-6 rounded-lg shadow-sm flex flex-col`}>
          <h3 className="font-bold mb-4 text-[#FFB800]">Reglas y Condiciones (Detalle)</h3>
          
          <div className="overflow-x-auto mb-4">
             <table className="w-full text-xs">
                <thead>
                   <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className={`text-left py-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Concepto</th>
                      <th className={`text-center py-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>%</th>
                      <th className={`text-right py-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Valor ($)</th>
                   </tr>
                </thead>
                <tbody className={subTextClass}>
                   <tr>
                      <td className={`py-1 font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Meta (100%)</td>
                      <td className="text-center">-</td>
                      <td className="text-right">${effectiveTarget.toLocaleString()}</td>
                   </tr>
                   <tr>
                      <td className="py-1 text-red-500">Piso (Mín)</td>
                      <td className="text-center">{config.floorPercentage}%</td>
                      <td className="text-right">${(effectiveTarget * (config.floorPercentage/100)).toLocaleString()}</td>
                   </tr>
                   <tr>
                      <td className="py-1 text-green-500">Sobre Piso</td>
                      <td className="text-center">{config.overFloorPercentage}%</td>
                      <td className="text-right">${(effectiveTarget * (config.overFloorPercentage/100)).toLocaleString()}</td>
                   </tr>
                </tbody>
             </table>
          </div>

          <div className={`space-y-3 flex-1 text-sm border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
             <div className="flex justify-between items-center">
                <span>Castigo Global</span>
                <span className={`font-bold ${penaltyFactor < 1 ? 'text-red-500' : 'text-green-500'}`}>
                  {penaltyFactor * 100}%
                </span>
             </div>
             
             {config.enablePortfolioCoverage && (
               <div className="flex justify-between items-center">
                  <span>Cobertura Cartera</span>
                  <span className="font-mono text-xs">Obj: {config.minPortfolioCoverage}%</span>
               </div>
             )}
             
             {config.enableConversionRate && (
               <div className="flex justify-between items-center">
                  <span>Tasa Conversión</span>
                  <span className="font-mono text-xs">Obj: {config.minConversionRate}%</span>
               </div>
             )}
             
             <div className="mt-4 bg-gray-900 p-3 rounded text-gray-300 text-xs">
                {achievementRate < (config.floorPercentage/100)
                  ? "❌ Sin Comisión (Piso no alcanzado)" 
                  : penaltyFactor < 1 
                    ? "⚠️ Comisión Penalizada (Ver tabla)" 
                    : "✅ Comisión al 100%"}
             </div>
          </div>
        </div>
      </div>

      {/* Expandable Invoice Table */}
      <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden`}>
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className="font-bold text-[#FFB800]">Escenarios de Ingresos (Detalle Desplegable)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase border-b ${tableHeaderClass}`}>
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-6 py-3">Línea de Negocio</th>
                <th className="px-6 py-3 text-right">Ingreso Real</th>
                <th className="px-6 py-3 text-right">Meta (Ref)</th>
                <th className="px-6 py-3 text-center">% Comisión</th>
                <th className="px-6 py-3 text-right">Ingreso Vendedor</th>
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
                    <td className="px-6 py-4 font-medium">{row.line}</td>
                    <td className="px-6 py-4 text-right">${row.income.toLocaleString()}</td>
                    <td className={`px-6 py-4 text-right ${subTextClass}`}>${row.target.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-mono">{(row.rate * 100).toFixed(2)}%</td>
                    <td className="px-6 py-4 text-right font-bold text-[#FFB800]">
                      ${row.commission.toLocaleString()}
                    </td>
                  </tr>
                  
                  {expandedLine === row.line && (
                     <tr className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}>
                       <td colSpan={6} className="p-4">
                         <div className={`rounded border p-2 ${isDarkMode ? 'border-gray-700 bg-black' : 'border-gray-200 bg-white'}`}>
                           <h4 className="text-xs font-bold uppercase mb-2 text-[#003366]">Detalle de Facturas: {row.line}</h4>
                           <table className={`w-full text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                             <thead className="opacity-50 text-left">
                               <tr>
                                 <th className="p-2">Factura</th>
                                 <th className="p-2">Cliente</th>
                                 <th className="p-2">Fecha</th>
                                 <th className="p-2 text-right">Monto</th>
                               </tr>
                             </thead>
                             <tbody>
                               {row.invoices.map(inv => (
                                 <tr key={inv.docNum} className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                   <td className="p-2 font-mono">#{inv.docNum}</td>
                                   <td className="p-2">{inv.customerName}</td>
                                   <td className="p-2">{inv.docDate}</td>
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
                <td className="px-6 py-4 text-right">-</td>
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