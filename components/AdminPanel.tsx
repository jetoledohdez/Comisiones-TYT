import React, { useState, useEffect } from 'react';
import { CommissionConfig, BusinessLine, FinancialScaleRow, CoverageScaleRow } from '../types';
import { MOCK_HIERARCHY } from '../services/mockSapService';
import { Save, ToggleLeft, ToggleRight, User, Target, TrendingUp, TrendingDown, Shield, Award } from 'lucide-react';

interface AdminPanelProps {
  config: CommissionConfig;
  onUpdateConfig: (newConfig: CommissionConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ config, onUpdateConfig }) => {
  const [localConfig, setLocalConfig] = useState<CommissionConfig>(config);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedContext, setSelectedContext] = useState<string>('GLOBAL');

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (field: keyof CommissionConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleDeepChange = (parent: string, key: string, value: any) => {
      setLocalConfig(prev => ({
          ...prev,
          [parent]: {
              ...prev[parent as keyof CommissionConfig] as any,
              [key]: value
          }
      }));
      setIsDirty(true);
  };

  const handleScaleChange = (
    type: 'positive' | 'negative', 
    index: number, 
    field: 'endAmount' | 'commissionPercentage', 
    value: number
  ) => {
    const key = type === 'positive' ? 'positiveScales' : 'negativeScales';
    const newScales = [...localConfig[key]];
    
    if (field === 'commissionPercentage') {
       newScales[index] = { ...newScales[index], commissionPercentage: value };
    } else {
       newScales[index] = { ...newScales[index], endAmount: value };
    }

    setLocalConfig(prev => ({ ...prev, [key]: newScales }));
    setIsDirty(true);
  };

  const getPosStart = (index: number) => {
    if (index === 0) return localConfig.globalTarget + 1;
    return (localConfig.positiveScales[index - 1].endAmount || 0) + 1;
  };

  const getNegStart = (index: number) => {
    if (index === 0) return localConfig.globalTarget;
    return (localConfig.negativeScales[index - 1].endAmount || 0) - 1;
  };

  const handleCoverageChange = (
    type: 'portfolio' | 'closing',
    index: number,
    field: keyof CoverageScaleRow,
    value: number
  ) => {
      const key = type === 'portfolio' ? 'portfolioScales' : 'closingScales';
      const newScales = [...localConfig[key]] as [CoverageScaleRow, CoverageScaleRow, CoverageScaleRow];
      
      newScales[index] = { ...newScales[index], [field]: value };
      setLocalConfig(prev => ({ ...prev, [key]: newScales }));
      setIsDirty(true);
  };

  const getCoverageStart = (type: 'portfolio' | 'closing', index: number) => {
     const scales = type === 'portfolio' ? localConfig.portfolioScales : localConfig.closingScales;
     if (index === 0) return scales[index].startPercentage; 
     return scales[index-1].endPercentage - 1;
  };

  const handleSave = () => {
    if (window.confirm("¿Confirmar cambios en las reglas de comisión?")) {
      onUpdateConfig(localConfig);
      setIsDirty(false);
    }
  };

  // UI Components
  const InputCurrency = ({ value, onChange, readOnly = false }: any) => (
    <div className="relative">
      <span className="absolute left-2 top-2 text-gray-500 font-bold text-xs">$</span>
      <input 
        type="number" 
        readOnly={readOnly}
        className={`w-full border rounded pl-6 pr-2 py-1 text-sm font-mono ${readOnly ? 'bg-gray-100 text-gray-500' : 'bg-white text-black border-gray-300 focus:ring-2 focus:ring-[#FFB800]'}`}
        value={value}
        onChange={e => onChange && onChange(parseFloat(e.target.value))}
      />
    </div>
  );

  const InputPercent = ({ value, onChange, readOnly = false }: any) => (
    <div className="relative">
      <input 
        type="number" 
        readOnly={readOnly}
        className={`w-full border rounded pl-2 pr-6 py-1 text-sm text-center font-bold ${readOnly ? 'bg-gray-100 text-gray-500' : 'bg-white text-black border-gray-300 focus:ring-2 focus:ring-[#FFB800]'}`}
        value={value}
        onChange={e => onChange && onChange(parseFloat(e.target.value))}
      />
      <span className="absolute right-2 top-2 text-gray-500 font-bold text-xs">%</span>
    </div>
  );

  const Toggle = ({ label, checked, onChange }: any) => (
    <button 
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${checked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-75'}`}
    >
      <span className={`font-bold text-sm ${checked ? 'text-green-800' : 'text-gray-500'}`}>{label}</span>
      {checked ? <ToggleRight className="text-green-600" size={28} /> : <ToggleLeft className="text-gray-400" size={28} />}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="max-w-7xl mx-auto space-y-10 w-full">

        {/* Header Context */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-[#003366] flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <User className="text-[#003366] dark:text-[#FFB800]" />
             <div>
               <h2 className="font-bold text-lg dark:text-white">Configuración de Reglas de Negocio</h2>
               <p className="text-xs text-gray-500 dark:text-gray-400">Contexto: {selectedContext}</p>
             </div>
          </div>
          <select 
            className="border p-2 rounded text-sm font-bold bg-white text-black"
            value={selectedContext} 
            onChange={e => setSelectedContext(e.target.value)}
          >
            <option value="GLOBAL">Regla Global</option>
            {MOCK_HIERARCHY.reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* 1. OBJETIVOS FINANCIEROS */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6 border-b pb-2 dark:border-gray-600">
            <Target className="text-[#003366] dark:text-[#FFB800]" />
            <h3 className="font-bold text-xl text-[#003366] dark:text-white">Objetivos Financieros</h3>
          </div>

          <div className="mb-8 max-w-sm">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Meta Mensual de Ventas (Base)</label>
            <InputCurrency 
              value={localConfig.globalTarget} 
              onChange={(v: number) => handleChange('globalTarget', v)} 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Positive Scale */}
            <div className="border rounded-lg overflow-hidden dark:border-gray-600">
               <div className="bg-green-50 dark:bg-green-900 p-3 border-b border-green-100 dark:border-green-800">
                 <h4 className="font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
                   <TrendingUp size={16}/> Comisión por Escala <span className="text-green-600 dark:text-green-400 font-black">POSITIVA</span>
                 </h4>
               </div>
               <table className="w-full text-sm">
                 <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
                   <tr>
                     <th className="p-2 text-left">Escala</th>
                     <th className="p-2">Desde ($)</th>
                     <th className="p-2">Hasta ($)</th>
                     <th className="p-2">% Pago</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:bg-gray-800">
                   {localConfig.positiveScales.map((row, idx) => (
                     <tr key={idx}>
                       <td className="p-2 font-bold text-xs text-gray-400 text-center">{idx + 1}</td>
                       <td className="p-2"><InputCurrency value={getPosStart(idx)} readOnly /></td>
                       <td className="p-2">
                         {idx < 3 ? (
                           <InputCurrency value={row.endAmount} onChange={(v:number) => handleScaleChange('positive', idx, 'endAmount', v)} />
                         ) : (
                           <span className="text-xs text-gray-400 italic block text-center">Sin Límite</span>
                         )}
                       </td>
                       <td className="p-2 w-24"><InputPercent value={row.commissionPercentage} onChange={(v:number) => handleScaleChange('positive', idx, 'commissionPercentage', v)} /></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>

            {/* Negative Scale */}
            <div className="border rounded-lg overflow-hidden dark:border-gray-600">
               <div className="bg-red-50 dark:bg-red-900 p-3 border-b border-red-100 dark:border-red-800">
                 <h4 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                   <TrendingDown size={16}/> Comisión por Escala <span className="text-red-600 dark:text-red-400 font-black">NEGATIVA</span>
                 </h4>
               </div>
               <table className="w-full text-sm">
                 <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
                   <tr>
                     <th className="p-2 text-left">Escala</th>
                     <th className="p-2">Desde ($)</th>
                     <th className="p-2">Hasta ($)</th>
                     <th className="p-2">% Pago</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:bg-gray-800">
                   {localConfig.negativeScales.map((row, idx) => (
                     <tr key={idx}>
                       <td className="p-2 font-bold text-xs text-gray-400 text-center">{idx + 1}</td>
                       <td className="p-2"><InputCurrency value={getNegStart(idx)} readOnly /></td>
                       <td className="p-2">
                         {idx < 3 ? (
                           <InputCurrency value={row.endAmount} onChange={(v:number) => handleScaleChange('negative', idx, 'endAmount', v)} />
                         ) : (
                           <span className="text-xs text-gray-400 italic block text-center">Sin Límite Inf.</span>
                         )}
                       </td>
                       <td className="p-2 w-24"><InputPercent value={row.commissionPercentage} onChange={(v:number) => handleScaleChange('negative', idx, 'commissionPercentage', v)} /></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        </section>

        {/* 2. COBERTURAS */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6 border-b pb-2 dark:border-gray-600">
            <Shield className="text-[#003366] dark:text-[#FFB800]" />
            <h3 className="font-bold text-xl text-[#003366] dark:text-white">Tablas de Cobertura</h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Portfolio Coverage */}
            <div className={`border rounded-lg p-4 transition-all dark:border-gray-600 ${localConfig.enablePortfolioCoverage ? 'opacity-100' : 'opacity-50 grayscale'}`}>
              <div className="mb-4">
                 <Toggle label="Cobertura de Cartera de Clientes" checked={localConfig.enablePortfolioCoverage} onChange={(v:boolean) => handleChange('enablePortfolioCoverage', v)} />
              </div>
              
              <div className="mb-4">
                <label className="text-xs font-bold uppercase text-gray-500">Meta Mensual (Cant. Clientes)</label>
                <input type="number" className="border rounded w-full p-2 mt-1 dark:bg-gray-700 dark:text-white" value={localConfig.portfolioActivityTarget} onChange={e => handleChange('portfolioActivityTarget', parseFloat(e.target.value))} />
              </div>

              <table className="w-full text-sm">
                 <thead className="bg-gray-100 dark:bg-gray-900 text-xs font-bold text-gray-500 dark:text-gray-300">
                   <tr>
                     <th className="p-2 text-left">Nivel</th>
                     <th className="p-2">Desde (%)</th>
                     <th className="p-2">Hasta (%)</th>
                     <th className="p-2">Factor (x)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y dark:divide-gray-700 dark:text-gray-200">
                   {localConfig.portfolioScales.map((row, idx) => (
                     <tr key={idx}>
                       <td className="p-2 text-xs font-bold">Escala {idx + 1}</td>
                       <td className="p-2 text-center text-gray-500">{idx === 0 ? row.startPercentage : getCoverageStart('portfolio', idx)}%</td>
                       <td className="p-2"><InputPercent value={row.endPercentage} onChange={(v:number) => handleCoverageChange('portfolio', idx, 'endPercentage', v)} /></td>
                       <td className="p-2"><input type="number" step="0.1" className="w-full border rounded text-center dark:bg-gray-700" value={row.payoutFactor} onChange={e => handleCoverageChange('portfolio', idx, 'payoutFactor', parseFloat(e.target.value))} /></td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            </div>

            {/* Closing Coverage */}
            <div className={`border rounded-lg p-4 transition-all dark:border-gray-600 ${localConfig.enableClosingCoverage ? 'opacity-100' : 'opacity-50 grayscale'}`}>
              <div className="mb-4">
                 <Toggle label="Cobertura de Cierres" checked={localConfig.enableClosingCoverage} onChange={(v:boolean) => handleChange('enableClosingCoverage', v)} />
              </div>
              
              <div className="mb-4">
                <label className="text-xs font-bold uppercase text-gray-500">Meta Cierres / Oportunidades (%)</label>
                <InputPercent value={localConfig.closingPercentageTarget} onChange={(v:number) => handleChange('closingPercentageTarget', v)} />
              </div>

              <table className="w-full text-sm">
                 <thead className="bg-gray-100 dark:bg-gray-900 text-xs font-bold text-gray-500 dark:text-gray-300">
                   <tr>
                     <th className="p-2 text-left">Nivel</th>
                     <th className="p-2">Desde (%)</th>
                     <th className="p-2">Hasta (%)</th>
                     <th className="p-2">Factor (x)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y dark:divide-gray-700 dark:text-gray-200">
                   {localConfig.closingScales.map((row, idx) => (
                     <tr key={idx}>
                       <td className="p-2 text-xs font-bold">Escala {idx + 1}</td>
                       <td className="p-2 text-center text-gray-500">{idx === 0 ? row.startPercentage : getCoverageStart('closing', idx)}%</td>
                       <td className="p-2"><InputPercent value={row.endPercentage} onChange={(v:number) => handleCoverageChange('closing', idx, 'endPercentage', v)} /></td>
                       <td className="p-2"><input type="number" step="0.1" className="w-full border rounded text-center dark:bg-gray-700" value={row.payoutFactor} onChange={e => handleCoverageChange('closing', idx, 'payoutFactor', parseFloat(e.target.value))} /></td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            </div>

          </div>
        </section>

        {/* 3. BONOS ADICIONALES */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
           <div className="flex items-center gap-2 mb-6 border-b pb-2 dark:border-gray-600">
            <Award className="text-[#003366] dark:text-[#FFB800]" />
            <h3 className="font-bold text-xl text-[#003366] dark:text-white">Bonos Adicionales</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Cliente Nuevo */}
            <div className={`p-4 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700 transition-all ${localConfig.enableBonusNewClient ? '' : 'opacity-50'}`}>
              <div className="mb-3">
                 <Toggle label="Activar Cliente Nuevo" checked={localConfig.enableBonusNewClient} onChange={(v:boolean) => handleChange('enableBonusNewClient', v)} />
              </div>
              <div className="space-y-2">
                <div><label className="text-[10px] uppercase text-gray-500">Meta (Cant)</label><input type="number" className="w-full border rounded px-2 py-1 dark:bg-gray-700 dark:text-white" value={localConfig.bonusNewClient.targetQty} onChange={e => handleDeepChange('bonusNewClient', 'targetQty', parseFloat(e.target.value))} /></div>
                <div><label className="text-[10px] uppercase text-gray-500">Bono ($)</label><InputCurrency value={localConfig.bonusNewClient.rewardAmount} onChange={(v:number) => handleDeepChange('bonusNewClient', 'rewardAmount', v)} /></div>
                <div><label className="text-[10px] uppercase text-gray-500">Compra Mín ($)</label><InputCurrency value={localConfig.bonusNewClient.minPurchaseAmount} onChange={(v:number) => handleDeepChange('bonusNewClient', 'minPurchaseAmount', v)} /></div>
              </div>
            </div>

            {/* Cliente Recuperado */}
             <div className={`p-4 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700 transition-all ${localConfig.enableBonusRecovered ? '' : 'opacity-50'}`}>
              <div className="mb-3">
                 <Toggle label="Activar Cliente Recuperado" checked={localConfig.enableBonusRecovered} onChange={(v:boolean) => handleChange('enableBonusRecovered', v)} />
              </div>
              <div className="space-y-2">
                <div><label className="text-[10px] uppercase text-gray-500">Meta (Cant)</label><input type="number" className="w-full border rounded px-2 py-1 dark:bg-gray-700 dark:text-white" value={localConfig.bonusRecoveredClient.targetQty} onChange={e => handleDeepChange('bonusRecoveredClient', 'targetQty', parseFloat(e.target.value))} /></div>
                <div><label className="text-[10px] uppercase text-gray-500">Bono ($)</label><InputCurrency value={localConfig.bonusRecoveredClient.rewardAmount} onChange={(v:number) => handleDeepChange('bonusRecoveredClient', 'rewardAmount', v)} /></div>
                <div><label className="text-[10px] uppercase text-gray-500">Compra Mín ($)</label><InputCurrency value={localConfig.bonusRecoveredClient.minPurchaseAmount} onChange={(v:number) => handleDeepChange('bonusRecoveredClient', 'minPurchaseAmount', v)} /></div>
              </div>
            </div>

            {/* Volumen Clientes Nuevos */}
             <div className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-100 dark:border-yellow-900 transition-all ${localConfig.enableBonusVolume ? '' : 'opacity-50'}`}>
              <div className="mb-3">
                 <Toggle label="Activar Volumen Clientes Nuevos" checked={localConfig.enableBonusVolume} onChange={(v:boolean) => handleChange('enableBonusVolume', v)} />
              </div>
              <div className="space-y-2">
                <div><label className="text-[10px] uppercase text-gray-500">Meta (Cant)</label><input type="number" className="w-full border rounded px-2 py-1 dark:bg-gray-700 dark:text-white" value={localConfig.bonusVolumeClients.targetQty} onChange={e => handleDeepChange('bonusVolumeClients', 'targetQty', parseFloat(e.target.value))} /></div>
                <div><label className="text-[10px] uppercase text-gray-500">Bono ($)</label><InputCurrency value={localConfig.bonusVolumeClients.rewardAmount} onChange={(v:number) => handleDeepChange('bonusVolumeClients', 'rewardAmount', v)} /></div>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* STATIC SAVE BAR (Not Floating/Animated to prevent focus loss) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-4 shadow-xl z-50 flex justify-end items-center">
        <div className="max-w-7xl mx-auto w-full flex justify-end">
          <button 
            onClick={handleSave}
            disabled={!isDirty}
            className={`px-8 py-3 rounded-full font-bold flex items-center space-x-2 border-2 transition-all ${isDirty 
              ? 'bg-[#FFB800] text-black border-black hover:bg-yellow-400 cursor-pointer opacity-100' 
              : 'bg-gray-200 text-gray-400 border-gray-300 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700 cursor-not-allowed'}`}
          >
            <Save size={20} />
            <span>{isDirty ? 'GUARDAR CAMBIOS' : 'Sin Cambios Pendientes'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};