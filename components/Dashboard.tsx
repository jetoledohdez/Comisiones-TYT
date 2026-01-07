import React, { useMemo, useState } from 'react';
import { CommissionConfig, User, FilterState, UserRole } from '../types';
import { calculateCommissionsBatch } from '../services/commissionLogic';
import { getMockInvoices, getMonthlyHistory, getYearlyHistory } from '../services/mockSapService';
import { FilterBar } from './FilterBar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell
} from 'recharts';
import { DollarSign, Calendar, TrendingUp, Users, AlertCircle } from 'lucide-react';

interface DashboardProps {
  user: User;
  config: CommissionConfig;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, config }) => {
  const [filters, setFilters] = useState<FilterState>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    selectedTerritory: 'ALL',
    selectedManager: 'ALL',
    selectedRep: user.role === UserRole.SALES_REP ? user.id : 'ALL',
  });

  // 1. Fetch & Filter Data
  const rawInvoices = useMemo(() => getMockInvoices(filters.month, filters.year), [filters.month, filters.year]);
  
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter(inv => {
      if (user.role === UserRole.SALES_REP) return inv.salesRepId === user.id;
      
      let match = true;
      if (filters.selectedTerritory !== 'ALL') match = match && inv.territory === filters.selectedTerritory;
      if (filters.selectedManager !== 'ALL') match = match && (inv.managerName === `Manager ${filters.selectedManager}` || true); // Simplified matching for mock
      if (filters.selectedRep !== 'ALL') match = match && inv.salesRepId === filters.selectedRep;
      return match;
    });
  }, [rawInvoices, filters, user]);

  // 2. Calculate Commissions (Apply Penalty Logic)
  const currentTotalSales = filteredInvoices.reduce((acc, inv) => acc + inv.docTotal, 0);
  
  // Need to adjust target based on filters (simulated logic)
  // If viewing 1 rep, target is X. If viewing all, target is X * N reps.
  // For this demo, we scale target by number of distinct reps found or global config if ALL
  const uniqueReps = new Set(filteredInvoices.map(i => i.salesRepId)).size;
  const adjustedTarget = uniqueReps > 1 ? config.globalTarget * (uniqueReps * 0.5) : config.globalTarget; 
  // * 0.5 factor because mock target is usually for a team, not individual, just for demo visuals.

  const processedInvoices = useMemo(() => {
    return calculateCommissionsBatch(filteredInvoices, config, currentTotalSales);
  }, [filteredInvoices, config, currentTotalSales]);

  // 3. KPI Calculations
  const totalCommission = processedInvoices.reduce((acc, curr) => acc + curr.finalCommissionAmount, 0);
  const totalSales = processedInvoices.reduce((acc, curr) => acc + curr.docTotal, 0);
  const achievementRate = adjustedTarget > 0 ? totalSales / adjustedTarget : 0;
  const penaltyFactor = processedInvoices.length > 0 ? processedInvoices[0].penaltyFactor : 1;

  // 4. Grouping for Charts
  // If Manager/Director -> Group by Rep
  // If Rep -> Group by Business Line
  const isHierarchyView = (user.role === UserRole.MANAGER || user.role === UserRole.DIRECTOR) && filters.selectedRep === 'ALL';
  
  const chartData = useMemo(() => {
    if (isHierarchyView) {
      // Group by Sales Rep
      const grouped: Record<string, number> = {};
      processedInvoices.forEach(inv => {
        grouped[inv.salesRepName] = (grouped[inv.salesRepName] || 0) + inv.docTotal;
      });
      return Object.entries(grouped).map(([name, sales]) => ({ name, sales }));
    } else {
      // Group by Business Line
      const grouped: Record<string, number> = {};
      processedInvoices.forEach(inv => {
        grouped[inv.businessLine] = (grouped[inv.businessLine] || 0) + inv.docTotal;
      });
      return Object.entries(grouped).map(([name, sales]) => ({ name, sales }));
    }
  }, [processedInvoices, isHierarchyView]);

  // Consolidate Table Data (Income vs Target by Line)
  // Replicating PDF Table Structure: Linea | Ingreso | Meta | Penalización | % Com | Ingreso Vendedor
  const consolidatedTable = useMemo(() => {
    const lines = Object.keys(config.rates) as string[];
    return lines.map(line => {
      const lineInvoices = processedInvoices.filter(inv => inv.businessLine === line);
      const income = lineInvoices.reduce((sum, inv) => sum + inv.docTotal, 0);
      const commission = lineInvoices.reduce((sum, inv) => sum + inv.finalCommissionAmount, 0);
      const rate = config.rates[line as keyof typeof config.rates];
      
      // Mock Line Target (Global Target / Lines count approx)
      const lineTarget = adjustedTarget * 0.15; 

      return {
        line,
        income,
        target: lineTarget,
        penalty: 'N/A', // Visual placeholder
        rate: rate,
        commission
      };
    });
  }, [processedInvoices, config, adjustedTarget]);

  return (
    <div className="space-y-6">
      <FilterBar user={user} filters={filters} onFilterChange={setFilters} />

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-[#003366]">
          <p className="text-xs text-gray-500 uppercase font-bold">Venta Total</p>
          <h3 className="text-2xl font-bold text-[#1A1A1A]">${totalSales.toLocaleString()}</h3>
          <p className="text-xs text-gray-400 mt-1">vs Meta ${adjustedTarget.toLocaleString()}</p>
        </div>
        
        <div className={`bg-white p-5 rounded-lg shadow-sm border-t-4 ${achievementRate < 0.7 ? 'border-red-500' : 'border-[#FFB800]'}`}>
          <p className="text-xs text-gray-500 uppercase font-bold">Cumplimiento</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-2xl font-bold text-[#1A1A1A]">{(achievementRate * 100).toFixed(1)}%</h3>
            {achievementRate < 0.7 && <span className="text-xs font-bold text-red-500 bg-red-50 px-1 rounded mb-1">PISO NO ALCANZADO</span>}
          </div>
          <p className="text-xs text-gray-400 mt-1">Factor Pago: {penaltyFactor * 100}%</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-green-600">
          <p className="text-xs text-gray-500 uppercase font-bold">Comisión a Pagar</p>
          <h3 className="text-2xl font-bold text-[#1A1A1A]">${totalCommission.toLocaleString()}</h3>
          <p className="text-xs text-gray-400 mt-1">Ya incluye penalizaciones</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-gray-400">
          <p className="text-xs text-gray-500 uppercase font-bold">Facturas</p>
          <h3 className="text-2xl font-bold text-[#1A1A1A]">{processedInvoices.length}</h3>
          <p className="text-xs text-gray-400 mt-1">Procesadas en periodo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-[#003366]">
              {isHierarchyView ? 'Desempeño por Vendedor' : 'Desempeño por Línea de Negocio'}
            </h3>
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-3 h-3 bg-[#003366] rounded-full"></span>
              <span>Venta Real</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Venta']}
                  contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', color: '#fff', borderRadius: '4px' }}
                />
                <Bar dataKey="sales" fill="#003366" radius={[4, 4, 0, 0]} barSize={isHierarchyView ? 40 : 60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#003366' : '#FFB800'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Penalty Info Box / Rules Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col">
          <h3 className="font-bold text-[#003366] mb-4">Reglas Aplicadas</h3>
          <div className="space-y-4 flex-1">
             <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Factor de Castigo</span>
                <span className={`font-bold ${penaltyFactor < 1 ? 'text-red-500' : 'text-green-600'}`}>
                  {penaltyFactor * 100}%
                </span>
             </div>
             <p className="text-xs text-gray-400 px-1">
               Basado en cumplimiento del {(achievementRate * 100).toFixed(0)}% sobre la meta.
               {achievementRate < 0.7 && " ¡Alerta! Menos del 70% implica $0 comisión."}
             </p>

             <div className="mt-4">
               <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Tasas Activas</h4>
               <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config.rates).slice(0,6).map(([line, rate]) => (
                    <div key={line} className="text-xs flex justify-between border-b border-gray-100 pb-1">
                      <span>{line}</span>
                      <span className="font-bold">{(rate * 100).toFixed(1)}%</span>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* PDF Style Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-[#003366]">Escenarios de Ingresos (Detalle por Línea)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Línea de Negocio</th>
                <th className="px-6 py-3 text-right">Ingreso Real</th>
                <th className="px-6 py-3 text-right">Meta (Ref)</th>
                <th className="px-6 py-3 text-center">Penalización</th>
                <th className="px-6 py-3 text-center">% Comisión</th>
                <th className="px-6 py-3 text-right">Ingreso Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consolidatedTable.map((row) => (
                <tr key={row.line} className="hover:bg-blue-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{row.line}</td>
                  <td className="px-6 py-4 text-right bg-blue-50/30">${row.income.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-gray-500">${row.target.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-gray-400">-</td>
                  <td className="px-6 py-4 text-center font-mono">{(row.rate * 100).toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right font-bold text-[#1A1A1A]">
                    ${row.commission.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Footer Row */}
              <tr className="bg-[#FFB800] text-black font-bold">
                <td className="px-6 py-4">TOTAL</td>
                <td className="px-6 py-4 text-right">${totalSales.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-center">-</td>
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