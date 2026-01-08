
import React, { useMemo, useState } from 'react';
import { CommissionConfig, User, FilterState, UserRole, LINE_COLORS, ClientActivity, OpportunityData } from '../types';
import { calculateCommissionsBatch } from '../services/commissionLogic';
import { getMockInvoices, getMockActivities, getMockOpportunities } from '../services/mockSapService';
import { FilterBar } from './FilterBar';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { ChevronDown, ChevronRight, AlertTriangle, Clock, Shield, Target, Wallet, TrendingUp, Users, PlusCircle } from 'lucide-react';

interface DashboardProps {
  user: User;
  config: CommissionConfig;
  isDarkMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, config, isDarkMode }) => {
  // Estado para los filtros globales del Dashboard
  const [filters, setFilters] = useState<FilterState>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    selectedTerritory: 'ALL',
    selectedManager: 'ALL',
    selectedRep: user.role === UserRole.SALES_REP ? user.id : 'ALL',
  });

  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [expandedClosingClient, setExpandedClosingClient] = useState<string | null>(null);

  // 1. OBTENCIÓN DE DATOS (Simulación SAP)
  const rawInvoices = useMemo(() => getMockInvoices(filters.month, filters.year), [filters.month, filters.year]);
  
  // 2. FILTRADO DE SEGURIDAD
  // Regla: Los vendedores solo ven sus datos. Directores ven todo o filtran.
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

  // 3. CÁLCULO CORE
  // Se invoca al motor de cálculo (commissionLogic) con los datos filtrados.
  const currentTotalSales = filteredInvoices.reduce((acc, inv) => acc + inv.docTotal, 0);
  const processedInvoices = useMemo(() => calculateCommissionsBatch(filteredInvoices, config, currentTotalSales), [filteredInvoices, config, currentTotalSales]);
  
  // =================================================================================
  // LÓGICA DE COMPOSICIÓN DE COMISIONES (DESGLOSE PARA TABLA SUPERIOR)
  // =================================================================================
  // Objetivo: Mostrar al usuario exactamente cuánto gana/pierde por cada regla de negocio.
  
  // 1. Comisión Base: La suma pura de (Venta * Tasa Línea) sin factores.
  const totalBaseCommission = processedInvoices.reduce((acc, curr) => acc + curr.baseCommissionAmount, 0);

  // Obtenemos los factores aplicados (son iguales para todo el lote de facturas filtrado)
  const financialFactor = processedInvoices.length > 0 ? processedInvoices[0].financialFactor : 1;
  const portfolioFactor = processedInvoices.length > 0 ? processedInvoices[0].portfolioFactor : 1;
  const closingFactor = processedInvoices.length > 0 ? processedInvoices[0].closingFactor : 1;

  // 2. Impacto Escala Financiera
  // Diferencia monetaria entre la Base y la Base ajustada por el factor financiero.
  const amountAfterFinancial = totalBaseCommission * financialFactor;
  const impactFinancialScale = amountAfterFinancial - totalBaseCommission;

  // 3. Impacto Coberturas
  // Se calculan secuencialmente para aislar el valor monetario de cada "castigo" o "premio".
  const amountAfterPortfolio = amountAfterFinancial * portfolioFactor;
  const impactPortfolioCoverage = amountAfterPortfolio - amountAfterFinancial;

  const amountAfterClosing = amountAfterPortfolio * closingFactor;
  const impactClosingCoverage = amountAfterClosing - amountAfterPortfolio;

  // 4. Bonos por Factura (Suma de bonos individuales)
  const bonusNewClientTotal = processedInvoices.reduce((sum, inv) => {
    return (config.enableBonusNewClient && inv.isNewClient && inv.docTotal >= config.bonusNewClient.minPurchaseAmount) 
      ? sum + config.bonusNewClient.rewardAmount 
      : sum;
  }, 0);

  const bonusRecoveredTotal = processedInvoices.reduce((sum, inv) => {
    return (config.enableBonusRecovered && inv.isRecoveredClient && inv.docTotal >= config.bonusRecoveredClient.minPurchaseAmount) 
      ? sum + config.bonusRecoveredClient.rewardAmount 
      : sum;
  }, 0);

  // 5. Bono Global de Volumen (Regla especial: cuenta clientes únicos, no facturas)
  const uniqueNewClientsCount = new Set(processedInvoices.filter(i => i.isNewClient).map(i => i.customerName)).size;
  const bonusVolumeTotal = (config.enableBonusVolume && uniqueNewClientsCount >= config.bonusVolumeClients.targetQty)
      ? config.bonusVolumeClients.rewardAmount
      : 0;

  // 6. GRAN TOTAL (KPI Principal)
  // Suma del monto base ajustado por todos los factores + todos los bonos fijos.
  const grandTotalCommission = amountAfterClosing + bonusNewClientTotal + bonusRecoveredTotal + bonusVolumeTotal;

  // =================================================================================

  // Mocked Activities & Opportunities logic for detailed tables...
  const clientActivities = useMemo(() => getMockActivities(filteredInvoices), [filteredInvoices]);
  const opportunities = useMemo(() => getMockOpportunities(filteredInvoices), [filteredInvoices]);

  // Group Opportunities by Client for the closing coverage table
  const opportunitiesByClient = useMemo(() => {
    const grouped: Record<string, OpportunityData[]> = {};
    opportunities.forEach(opp => {
      if (!grouped[opp.clientName]) grouped[opp.clientName] = [];
      grouped[opp.clientName].push(opp);
    });
    return Object.entries(grouped).map(([clientName, opps]) => ({
      clientName,
      opps,
      totalAmount: opps.reduce((sum, o) => sum + o.amount, 0),
      wonCount: opps.filter(o => o.status === 'Won').length,
      totalCount: opps.length
    }));
  }, [opportunities]);

  // Métricas de Cobertura para KPIs visuales
  const activeClientsCount = clientActivities.length;
  const MOCK_TOTAL_PORTFOLIO = 40; 
  
  const actualCoveragePct = (activeClientsCount / MOCK_TOTAL_PORTFOLIO) * 100;
  const portfolioTargetPct = config.portfolioActivityTarget;
  const portfolioAttainmentPct = portfolioTargetPct > 0 ? (actualCoveragePct / portfolioTargetPct) * 100 : 0;

  const wonOpportunities = opportunities.filter(o => o.status === 'Won').length;
  const totalOpportunities = opportunities.length;
  const closingRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0;
  
  // Datos para Gráfica de Pastel (Distribución por Línea)
  const chartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    processedInvoices.forEach(inv => {
      dataMap[inv.businessLine] = (dataMap[inv.businessLine] || 0) + inv.docTotal;
    });
    return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  }, [processedInvoices]);

  // Tabla Consolidada por Línea (Master Table)
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
        commission, // Incluye factores pero NO el bono global de volumen (ese es aparte)
        invoices: lineInvoices
      };
    });
  }, [processedInvoices, config]);

  // --- RENDERING HELPERS & STYLES ---
  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const getScaleText = (scales: any[], isPositive: boolean) => {
    return scales.map((s, i) => {
      let start = 0;
      if (isPositive) {
         start = i === 0 ? config.globalTarget + 1 : (scales[i-1].endAmount || 0) + 1;
      } else {
         start = i === 0 ? config.globalTarget : (scales[i-1].endAmount || 0) - 1;
      }
      
      const rangeText = s.endAmount 
        ? `Rango desde ${formatCurrency(start)} hasta ${formatCurrency(s.endAmount)}`
        : `Rango desde ${formatCurrency(start)} en adelante`;

      return (
        <div key={i} className={`p-1 rounded text-xs flex justify-between ${isPositive ? 'bg-green-900/10 dark:bg-green-900/30' : 'bg-red-900/10 dark:bg-red-900/30'}`}>
          <span>Escala {i + 1} - {rangeText}</span>
          <span className={`font-bold ml-2 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {s.commissionPercentage}%
          </span>
        </div>
      );
    });
  };

  const getCoverageText = (scales: any[]) => {
      return scales.map((s: any, i: number) => (
         <div key={i} className="p-1 rounded text-xs flex justify-between bg-blue-900/10 dark:bg-blue-900/30 mb-1">
            <span>Escala {i + 1}: Desde {s.startPercentage}% hasta {s.endPercentage}%</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">Factor x{s.payoutFactor}</span>
         </div>
      ));
  };

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-700';
  const tableHeaderClass = isDarkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-200';
  const tableRowHover = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50';
  const tableBodyTextClass = isDarkMode ? 'text-gray-200' : 'text-gray-900';

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
        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 ${portfolioAttainmentPct < 100 ? 'border-red-500' : 'border-green-500'} col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Cobertura Cartera</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-2xl font-bold">{actualCoveragePct.toFixed(1)}%</h3>
            <span className="text-xs mb-1 text-gray-500 font-medium">({portfolioAttainmentPct.toFixed(0)}% cumplim.)</span>
          </div>
          <p className={`text-xs mt-1 ${subTextClass}`}>Meta: {portfolioTargetPct}% de Cartera ({MOCK_TOTAL_PORTFOLIO} Clientes)</p>
        </div>
        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 border-[#FFB800] col-span-1`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>Tasa Cierres</p>
          <h3 className="text-2xl font-bold">{closingRate.toFixed(1)}%</h3>
          <p className={`text-xs mt-1 ${subTextClass}`}>Meta: {config.closingPercentageTarget}%</p>
        </div>
        <div className={`${cardClass} p-5 rounded-lg shadow-sm border-t-4 border-green-600 col-span-1 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800`}>
          <p className={`text-xs uppercase font-bold ${subTextClass}`}>KPI Comisión Estimada</p>
          <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">${grandTotalCommission.toLocaleString()}</h3>
          <p className={`text-xs mt-1 ${subTextClass}`}>Total Neto a Pagar</p>
        </div>
      </div>

      {/* CHART & RULES - Modified Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Pie Chart (Smaller Width: col-span-2) */}
        <div className={`lg:col-span-2 ${cardClass} p-6 rounded-lg shadow-sm flex flex-col items-center justify-center`}>
          <div className="w-full flex justify-between items-center mb-2">
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Distribución por Línea</h3>
          </div>
          <div className="h-[250px] w-full relative"> 
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-2 mt-2">
               {chartData.map(d => (
                 <div key={d.name} className="flex items-center gap-1">
                   <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LINE_COLORS[d.name as keyof typeof LINE_COLORS] }}></span>
                   <span className={`text-[10px] ${subTextClass}`}>{d.name}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Rules Summary (Wider Width: col-span-3) - Expanded detail */}
        <div className={`lg:col-span-3 ${cardClass} p-6 rounded-lg shadow-sm flex flex-col overflow-y-auto max-h-[400px]`}>
          <h3 className="font-bold mb-4 text-[#FFB800] border-b pb-2 border-gray-600">Reglas de Juego (Configuración Actual)</h3>
          
          <div className="space-y-5 text-sm">
             
             {/* Financial Scales */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <span className={`block text-xs uppercase font-bold mb-1 ${subTextClass}`}>Escala Positiva ( &gt; Meta)</span>
                 <div className="space-y-1">
                   {getScaleText(config.positiveScales, true)}
                 </div>
               </div>
               <div>
                 <span className={`block text-xs uppercase font-bold mb-1 ${subTextClass}`}>Escala Negativa ( &lt; Meta)</span>
                 <div className="space-y-1">
                   {getScaleText(config.negativeScales, false)}
                 </div>
               </div>
             </div>

             {/* Coverages */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-3">
                <div>
                   <span className={`block text-xs uppercase font-bold ${subTextClass}`}>Meta Cobertura Cartera</span>
                   <div className="flex items-center gap-2 mb-2">
                      <Shield size={16} className={config.enablePortfolioCoverage ? 'text-green-500' : 'text-gray-400'}/>
                      <span className="font-bold">{config.portfolioActivityTarget}% de Clientes con actividad</span>
                   </div>
                   {getCoverageText(config.portfolioScales)}
                </div>
                <div>
                   <span className={`block text-xs uppercase font-bold ${subTextClass}`}>Meta Cobertura Cierres</span>
                   <div className="flex items-center gap-2 mb-2">
                      <Target size={16} className={config.enableClosingCoverage ? 'text-green-500' : 'text-gray-400'}/>
                      <span className="font-bold">{config.closingPercentageTarget}% de Éxito en Cierres</span>
                   </div>
                   {getCoverageText(config.closingScales)}
                </div>
             </div>
             
             {/* Bonuses */}
             <div className="border-t border-gray-700 pt-3">
                <span className={`block text-xs uppercase font-bold mb-2 ${subTextClass}`}>Bonos Adicionales (Metas)</span>
                <div className="grid grid-cols-3 gap-2">
                   <div className={`p-2 rounded border ${config.enableBonusNewClient ? 'border-blue-800 bg-blue-900/20' : 'border-gray-700 opacity-50'}`}>
                      <span className="block text-xs font-bold text-blue-400">Cliente Nuevo</span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Meta: {config.bonusNewClient.targetQty} Clientes</span>
                   </div>
                   <div className={`p-2 rounded border ${config.enableBonusRecovered ? 'border-indigo-800 bg-indigo-900/20' : 'border-gray-700 opacity-50'}`}>
                      <span className="block text-xs font-bold text-indigo-400">Recuperado</span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Meta: {config.bonusRecoveredClient.targetQty} Clientes</span>
                   </div>
                   <div className={`p-2 rounded border ${config.enableBonusVolume ? 'border-yellow-800 bg-yellow-900/20' : 'border-gray-700 opacity-50'}`}>
                      <span className="block text-xs font-bold text-yellow-400">Volumen</span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Meta: {config.bonusVolumeClients.targetQty} Clientes</span>
                   </div>
                </div>
             </div>

          </div>
        </div>
      </div>

      {/* --- NEW TABLE: COMPOSICIÓN DE COMISIÓN --- */}
      <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden border-2 border-[#003366]`}>
        <div className={`p-4 border-b flex justify-between items-center bg-[#003366] text-white`}>
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-[#FFB800]" />
            <h3 className="font-bold text-lg">Composición de Comisión</h3>
          </div>
          <div className="text-right">
             <span className="text-xl font-bold text-[#FFB800]">{formatCurrency(grandTotalCommission)}</span>
             <span className="text-xs block opacity-80">Total de Comisiones</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
              <tr>
                <th className="px-6 py-3">Concepto</th>
                <th className="px-6 py-3 text-center">Referencia / Factor</th>
                <th className="px-6 py-3 text-right">Monto / Impacto</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'} ${tableBodyTextClass}`}>
              
              {/* 1. Base Commission */}
              <tr className={tableRowHover}>
                <td className="px-6 py-3 font-bold flex items-center gap-2">
                   <TrendingUp size={16} className="text-blue-500" /> Comisión por Venta
                </td>
                <td className="px-6 py-3 text-center text-xs opacity-70">Total de comisión final de líneas de negocio (Base)</td>
                <td className="px-6 py-3 text-right font-bold text-lg">{formatCurrency(totalBaseCommission)}</td>
              </tr>

              {/* 2. Scale Impact */}
              <tr className={tableRowHover}>
                <td className="px-6 py-3 font-medium flex items-center gap-2">
                   {impactFinancialScale >= 0 ? <PlusCircle size={16} className="text-green-500"/> : <AlertTriangle size={16} className="text-red-500"/>}
                   Comisión por Escala
                </td>
                <td className="px-6 py-3 text-center text-xs">
                   Factor Financiero: <span className="font-mono font-bold">{(financialFactor * 100).toFixed(0)}%</span>
                </td>
                <td className={`px-6 py-3 text-right font-bold ${impactFinancialScale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {impactFinancialScale >= 0 ? '+' : ''}{formatCurrency(impactFinancialScale)}
                </td>
              </tr>

              {/* 3. Portfolio Coverage Impact */}
              <tr className={tableRowHover}>
                <td className="px-6 py-3 font-medium flex items-center gap-2">
                   <Shield size={16} className={impactPortfolioCoverage >= 0 ? 'text-green-500' : 'text-red-500'} />
                   Cobertura de Clientes
                </td>
                <td className="px-6 py-3 text-center text-xs">
                   Factor Cartera: <span className="font-mono font-bold">x{portfolioFactor.toFixed(2)}</span> ({actualCoveragePct.toFixed(1)}% Actividad)
                </td>
                <td className={`px-6 py-3 text-right font-bold ${impactPortfolioCoverage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {impactPortfolioCoverage >= 0 ? '+' : ''}{formatCurrency(impactPortfolioCoverage)}
                </td>
              </tr>

              {/* 4. Closing Coverage Impact */}
              <tr className={tableRowHover}>
                <td className="px-6 py-3 font-medium flex items-center gap-2">
                   <Target size={16} className={impactClosingCoverage >= 0 ? 'text-green-500' : 'text-red-500'} />
                   Cobertura de Cierres
                </td>
                <td className="px-6 py-3 text-center text-xs">
                   Factor Cierre: <span className="font-mono font-bold">x{closingFactor.toFixed(2)}</span> ({closingRate.toFixed(1)}% Ganados)
                </td>
                <td className={`px-6 py-3 text-right font-bold ${impactClosingCoverage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {impactClosingCoverage >= 0 ? '+' : ''}{formatCurrency(impactClosingCoverage)}
                </td>
              </tr>

              {/* 5. Bonuses */}
              <tr className={`${tableRowHover} ${bonusNewClientTotal > 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                <td className="px-6 py-3 font-medium flex items-center gap-2 pl-10">
                   <Users size={14} className="opacity-50" /> Comisión bonos: Clientes nuevos
                </td>
                <td className="px-6 py-3 text-center text-xs">Objetivo Cumplido (x Factura)</td>
                <td className="px-6 py-3 text-right font-bold text-blue-600">
                   +{formatCurrency(bonusNewClientTotal)}
                </td>
              </tr>

              <tr className={`${tableRowHover} ${bonusRecoveredTotal > 0 ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                <td className="px-6 py-3 font-medium flex items-center gap-2 pl-10">
                   <Users size={14} className="opacity-50" /> Comisión bonos: Clientes recuperados
                </td>
                <td className="px-6 py-3 text-center text-xs">Objetivo Cumplido (x Factura)</td>
                <td className="px-6 py-3 text-right font-bold text-indigo-600">
                   +{formatCurrency(bonusRecoveredTotal)}
                </td>
              </tr>

              <tr className={`${tableRowHover} ${bonusVolumeTotal > 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
                <td className="px-6 py-3 font-medium flex items-center gap-2 pl-10">
                   <Users size={14} className="opacity-50" /> Comisión bonos: Volumen Clientes nuevos
                </td>
                <td className="px-6 py-3 text-center text-xs">
                  {uniqueNewClientsCount} Nuevos vs Meta {config.bonusVolumeClients.targetQty}
                </td>
                <td className="px-6 py-3 text-right font-bold text-yellow-600">
                   +{formatCurrency(bonusVolumeTotal)}
                </td>
              </tr>

              {/* TOTAL ROW */}
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td className="px-6 py-4 text-lg">TOTAL DE COMISIONES</td>
                <td className="px-6 py-4 text-center text-xs uppercase tracking-wider opacity-60">Sumatoria Final</td>
                <td className="px-6 py-4 text-right text-xl text-[#003366] dark:text-[#FFB800]">{formatCurrency(grandTotalCommission)}</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>


      {/* 1. COMMISSION TABLE (Existing) */}
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
                <th className="px-6 py-3 text-right">Comisión Final (Inc. Factores)</th>
              </tr>
            </thead>
            {/* FORCE TEXT COLOR HERE */}
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'} ${tableBodyTextClass}`}>
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
                           <h4 className="text-xs font-bold uppercase mb-2 text-[#003366]">Detalle de Facturas: {row.line}</h4>
                           <table className={`w-full text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                             <thead>
                               <tr className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                                 <th className="p-2 text-left">Factura</th>
                                 <th className="p-2 text-left">Cliente</th>
                                 <th className="p-2 text-right">Monto Venta</th>
                                 <th className="p-2 text-right">Comisión Base</th>
                               </tr>
                             </thead>
                             <tbody>
                               {row.invoices.map(inv => (
                                 <tr key={inv.docNum} className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                   <td className="p-2 font-mono">#{inv.docNum}</td>
                                   <td className="p-2">{inv.customerName}</td>
                                   <td className="p-2 text-right">${inv.docTotal.toLocaleString()}</td>
                                   <td className="p-2 text-right">${inv.baseCommissionAmount.toLocaleString()}</td>
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
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. CUSTOMER COVERAGE TABLE */}
      <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className="font-bold text-[#FFB800]">Detalle de Cobertura de Clientes (Actividades)</h3>
            <p className={`text-xs ${isDarkMode ? 'opacity-70' : 'text-gray-600'}`}>Actividades registradas en CRM vs Meta de {config.portfolioActivityTarget} Clientes</p>
          </div>
          <div className="text-right">
             <span className="text-2xl font-bold">{portfolioAttainmentPct.toFixed(0)}%</span>
             <span className={`text-xs block ${isDarkMode ? 'opacity-70' : 'text-gray-600'}`}>Logro vs Meta</span>
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
             {/* FORCE TEXT COLOR HERE */}
             <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'} ${tableBodyTextClass}`}>
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

      {/* 3. CLOSING COVERAGE TABLE (Grouped by Client) */}
      <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className="font-bold text-[#FFB800]">Detalle de Cobertura de Cierres (Oportunidades)</h3>
            <p className={`text-xs ${isDarkMode ? 'opacity-70' : 'text-gray-600'}`}>Oportunidades por Cliente: Ganadas vs Totales</p>
          </div>
          <div className="text-right">
             <span className="text-2xl font-bold">{closingRate.toFixed(0)}%</span>
             <span className={`text-xs block ${isDarkMode ? 'opacity-70' : 'text-gray-600'}`}>Tasa Conversión Real</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
           <table className="w-full text-sm text-left">
             <thead className={`text-xs uppercase border-b sticky top-0 ${tableHeaderClass}`}>
               <tr>
                 <th className="px-4 py-3 w-8"></th>
                 <th className="px-6 py-3">Cliente</th>
                 <th className="px-6 py-3 text-center">Oportunidades</th>
                 <th className="px-6 py-3 text-center">Ganadas</th>
                 <th className="px-6 py-3 text-right">Monto Total</th>
                 <th className="px-6 py-3 text-right">Efectividad</th>
               </tr>
             </thead>
             {/* FORCE TEXT COLOR HERE */}
             <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'} ${tableBodyTextClass}`}>
               {opportunitiesByClient.map((group) => {
                 const effectiveness = group.totalCount > 0 ? (group.wonCount / group.totalCount) * 100 : 0;
                 return (
                   <React.Fragment key={group.clientName}>
                     <tr 
                        className={`cursor-pointer transition-colors ${tableRowHover}`}
                        onClick={() => setExpandedClosingClient(expandedClosingClient === group.clientName ? null : group.clientName)}
                     >
                        <td className="px-4 py-4 text-center">
                          {expandedClosingClient === group.clientName ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td className="px-6 py-4 font-bold">{group.clientName}</td>
                        <td className="px-6 py-4 text-center">{group.totalCount}</td>
                        <td className="px-6 py-4 text-center text-green-500 font-bold">{group.wonCount}</td>
                        <td className="px-6 py-4 text-right">${group.totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono">{effectiveness.toFixed(0)}%</td>
                     </tr>
                     
                     {expandedClosingClient === group.clientName && (
                        <tr className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}>
                          <td colSpan={6} className="p-0">
                             <div className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                               <table className="w-full text-xs">
                                 <thead className={`opacity-80 text-left uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                                   <tr>
                                     <th className="p-2">ID</th>
                                     <th className="p-2">Descripción</th>
                                     <th className="p-2 text-center">Estatus</th>
                                     <th className="p-2 text-right">Monto</th>
                                     <th className="p-2 text-right">Factura</th>
                                   </tr>
                                 </thead>
                                 <tbody className={isDarkMode ? 'text-gray-300' : 'text-gray-800'}>
                                   {group.opps.map(opp => (
                                     <tr key={opp.oppId} className="border-t border-gray-700/50">
                                       <td className="p-2 font-mono">{opp.oppId}</td>
                                       <td className="p-2">{opp.description}</td>
                                       <td className="p-2 text-center">
                                         <span className={`px-2 py-0.5 rounded ${
                                           opp.status === 'Won' ? 'bg-green-900 text-green-300' : 
                                           opp.status === 'Lost' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-white'
                                         }`}>
                                           {opp.status}
                                         </span>
                                       </td>
                                       <td className="p-2 text-right">${opp.amount.toLocaleString()}</td>
                                       <td className="p-2 text-right text-[#FFB800]">{opp.invoiceNumber ? `#${opp.invoiceNumber}` : '-'}</td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                          </td>
                        </tr>
                     )}
                   </React.Fragment>
                 );
               })}
             </tbody>
           </table>
        </div>
      </div>

    </div>
  );
};
