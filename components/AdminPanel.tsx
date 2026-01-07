import React, { useState, useEffect } from 'react';
import { CommissionConfig, BusinessLine } from '../types';
import { MOCK_HIERARCHY } from '../services/mockSapService';
import { Save, ToggleLeft, ToggleRight, User, DollarSign, Target, Briefcase, Award } from 'lucide-react';

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

  const handleDeepChange = (parent: 'rates' | 'lineTargets', key: BusinessLine, value: number) => {
    setLocalConfig(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value }
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dateStr = nextMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

    if (window.confirm(`ATENCIÓN:\n\nEstá a punto de modificar las reglas de negocio.\nEstos cambios entrarán en vigor a partir del 1 de ${dateStr}.\n\n¿Desea continuar y notificar a la fuerza de ventas?`)) {
      onUpdateConfig(localConfig);
      setIsDirty(false);
      
      // Simulation of email sending
      setTimeout(() => {
        alert(`✅ SISTEMA AUTOMATIZADO:\n\nCorreos enviados exitosamente a:\n- Vendedores (Contexto: ${selectedContext})\n- Gerentes Regionales\n- Dirección Comercial\n\nAsunto: Actualización de Política de Comisiones - Inicio ${dateStr}`);
      }, 500);
    }
  };

  // Helper component for currency/percentage display
  const InputGroup = ({ label, value, type = "number", onChange, suffix, prefix, step = "any" }: any) => {
    // Labels need to adapt to theme (parent handles theme, but we ensure text-gray-500 is readable or override)
    // Note: The parent container in App.tsx handles bg-white vs bg-gray-900.
    // We need to use classes that work on both or context classes.
    // For AdminPanel, we'll assume the container is white/dark based on the card.
    
    return (
      <div className="flex flex-col">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-1">{label}</label>
        <div className="relative group">
          {prefix && <span className="absolute left-3 top-2 text-gray-500 font-bold text-sm">{prefix}</span>}
          <input 
            type={type}
            step={step}
            className={`w-full border border-gray-300 rounded px-3 py-2 text-sm font-bold bg-white text-black shadow-sm focus:ring-2 focus:ring-[#FFB800] outline-none ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
          />
          {suffix && <span className="absolute right-3 top-2 text-gray-500 font-bold text-sm">{suffix}</span>}
        </div>
      </div>
    );
  };

  const Toggle = ({ label, checked, onChange, description }: any) => (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div>
        <span className="text-sm font-bold text-gray-900 dark:text-white block">{label}</span>
        {description && <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>}
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`flex items-center transition-colors ${checked ? 'text-green-600' : 'text-gray-400'}`}
      >
        {checked ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      
      {/* 1. Context Selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-[#003366] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 dark:bg-gray-700 p-2 rounded-full"><User className="text-[#003366] dark:text-[#FFB800]" /></div>
          <div>
            <h3 className="font-bold text-black dark:text-white text-lg">Contexto de Configuración</h3>
            <p className="text-xs text-gray-500 dark:text-gray-300">Defina si los cambios aplican Globalmente o son Excepciones.</p>
          </div>
        </div>
        <select 
          className="border-2 border-gray-200 dark:border-gray-600 rounded px-4 py-2 bg-white text-black font-bold outline-none focus:border-[#FFB800]"
          value={selectedContext}
          onChange={(e) => setSelectedContext(e.target.value)}
        >
          <option value="GLOBAL">Regla Maestra (Global)</option>
          <optgroup label="Excepciones por Vendedor">
            {MOCK_HIERARCHY.reps.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* 2. Activación de Parámetros */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-[#003366] dark:text-[#FFB800] text-lg mb-4 border-b dark:border-gray-600 pb-2 flex items-center gap-2">
              <ToggleRight size={20}/> Activación de Motores
            </h3>
            <div className="space-y-4">
              <Toggle 
                label="Cobertura de Cartera" 
                description="Habilita la penalización por objetivos de venta."
                checked={localConfig.enablePortfolioCoverage} 
                onChange={(v: boolean) => handleChange('enablePortfolioCoverage', v)} 
              />
              <Toggle 
                label="Cobertura de Cierres (Conversión)" 
                description="Habilita métricas de tasa de cierre."
                checked={localConfig.enableConversionRate} 
                onChange={(v: boolean) => handleChange('enableConversionRate', v)} 
              />
              <Toggle 
                label="Bonos y Compensaciones Extras" 
                description="Habilita recompensas por clientes nuevos/recuperados."
                checked={localConfig.enableBonuses} 
                onChange={(v: boolean) => handleChange('enableBonuses', v)} 
              />
            </div>
          </div>

          {/* 3. Objetivos Globales (Calculated Table) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-[#003366] dark:text-[#FFB800] text-lg mb-4 border-b dark:border-gray-600 pb-2 flex items-center gap-2">
              <Target size={20} /> Objetivos Financieros Globales
            </h3>
            
            {/* Main Target Input */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
              <InputGroup 
                label="Meta Mensual Global (Base 100%)"
                value={localConfig.globalTarget}
                prefix="$"
                onChange={(v: number) => handleChange('globalTarget', v)}
              />
            </div>

            {/* Threshold Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Nivel</th>
                    <th className="px-4 py-3 text-center w-24">Porcentaje</th>
                    <th className="px-4 py-3 text-right">Equivalencia (MXN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  <tr>
                    <td className="px-4 py-3 font-bold text-red-600">Piso de Venta (Mínimo)</td>
                    <td className="px-4 py-3">
                       <input 
                         type="number"
                         className="w-full text-center border rounded py-1 font-bold text-gray-700 focus:ring-1 focus:ring-blue-500"
                         value={localConfig.floorPercentage}
                         onChange={(e) => handleChange('floorPercentage', parseFloat(e.target.value))}
                       />
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-500 dark:text-gray-400">
                      ${(localConfig.globalTarget * (localConfig.floorPercentage / 100)).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-[#003366] dark:text-blue-300">Meta (Target)</td>
                    <td className="px-4 py-3 text-center text-gray-400">100%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003366] dark:text-blue-300">
                      ${localConfig.globalTarget.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-green-600">Sobre Piso (Excelencia)</td>
                    <td className="px-4 py-3">
                       <input 
                         type="number"
                         className="w-full text-center border rounded py-1 font-bold text-gray-700 focus:ring-1 focus:ring-blue-500"
                         value={localConfig.overFloorPercentage}
                         onChange={(e) => handleChange('overFloorPercentage', parseFloat(e.target.value))}
                       />
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-green-600">
                      ${(localConfig.globalTarget * (localConfig.overFloorPercentage / 100)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Tabla de Bonos */}
           {localConfig.enableBonuses && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-[#003366] dark:text-[#FFB800] text-lg mb-4 border-b dark:border-gray-600 pb-2 flex items-center gap-2">
                <Award size={20} /> Configuración de Bonos
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-12 gap-2 items-end">
                   <div className="col-span-6"><span className="text-sm font-bold dark:text-gray-300">Cliente Nuevo</span></div>
                   <div className="col-span-3"><InputGroup label="Obj (Cant)" value={localConfig.bonusNewClientTarget} onChange={(v:number)=>handleChange('bonusNewClientTarget', v)} /></div>
                   <div className="col-span-3"><InputGroup label="Pago ($)" prefix="$" value={localConfig.bonusNewClientReward} onChange={(v:number)=>handleChange('bonusNewClientReward', v)} /></div>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                   <div className="col-span-6"><span className="text-sm font-bold dark:text-gray-300">Cliente Recuperado</span></div>
                   <div className="col-span-3"><InputGroup label="Obj (Cant)" value={localConfig.bonusRecoveredTarget} onChange={(v:number)=>handleChange('bonusRecoveredTarget', v)} /></div>
                   <div className="col-span-3"><InputGroup label="Pago ($)" prefix="$" value={localConfig.bonusRecoveredReward} onChange={(v:number)=>handleChange('bonusRecoveredReward', v)} /></div>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end border-t dark:border-gray-600 pt-2">
                   <div className="col-span-6"><span className="text-sm font-bold text-[#FFB800]">Bono Meta Clientes</span></div>
                   <div className="col-span-3"><InputGroup label="Obj (Cant)" value={localConfig.bonusGoalNewClientsTarget} onChange={(v:number)=>handleChange('bonusGoalNewClientsTarget', v)} /></div>
                   <div className="col-span-3"><InputGroup label="Pago ($)" prefix="$" value={localConfig.bonusGoalNewClientsReward} onChange={(v:number)=>handleChange('bonusGoalNewClientsReward', v)} /></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* 5. Tabla de Castigo (KPIs) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
             <h3 className="font-bold text-[#003366] dark:text-[#FFB800] text-lg mb-4 border-b dark:border-gray-600 pb-2">Tabla de Penalización (Factores)</h3>
             <div className="space-y-4 mb-6">
                <div className="flex gap-4">
                   <div className="flex-1">
                      <InputGroup label="Min. Cobertura Cartera (%)" value={localConfig.minPortfolioCoverage} suffix="%" onChange={(v:number)=>handleChange('minPortfolioCoverage', v)} />
                   </div>
                   <div className="flex-1">
                      <InputGroup label="Min. Tasa Cierre (%)" value={localConfig.minConversionRate} suffix="%" onChange={(v:number)=>handleChange('minConversionRate', v)} />
                   </div>
                </div>
             </div>
             
             <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900 font-bold text-xs uppercase text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="p-2 text-left">Rango Cumplimiento</th>
                      <th className="p-2 text-right">Factor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    <tr>
                      <td className="p-2 font-medium dark:text-gray-300">90% - 100%+</td>
                      <td className="p-2"><input type="number" step="0.05" className="w-full text-right font-bold border rounded px-1" value={localConfig.scale90to100} onChange={(e)=>handleChange('scale90to100', parseFloat(e.target.value))}/></td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium dark:text-gray-300">80% - 89%</td>
                      <td className="p-2"><input type="number" step="0.05" className="w-full text-right font-bold border rounded px-1" value={localConfig.scale80to89} onChange={(e)=>handleChange('scale80to89', parseFloat(e.target.value))}/></td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium text-orange-600">70% - 79% (Piso)</td>
                      <td className="p-2"><input type="number" step="0.05" className="w-full text-right font-bold border rounded px-1" value={localConfig.scale70to79} onChange={(e)=>handleChange('scale70to79', parseFloat(e.target.value))}/></td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-red-600">Menos de 70%</td>
                      <td className="p-2"><input type="number" step="0.05" className="w-full text-right font-bold border rounded px-1 text-red-600" value={localConfig.scaleBelow70} onChange={(e)=>handleChange('scaleBelow70', parseFloat(e.target.value))}/></td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>

          {/* 6. Metas por Línea de Negocio */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-[#003366] dark:text-[#FFB800] text-lg mb-4 border-b dark:border-gray-600 pb-2 flex items-center gap-2">
              <Briefcase size={20} /> Metas y Tasas por Línea
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Línea</th>
                    <th className="px-3 py-2 text-right w-24">Tasa (%)</th>
                    <th className="px-3 py-2 text-right w-32">Meta ($MXN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {Object.entries(localConfig.rates).map(([line, rate]) => (
                    <tr key={line}>
                      <td className="px-3 py-2 font-medium dark:text-gray-300">{line}</td>
                      <td className="px-3 py-2">
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full text-right border rounded px-1 font-mono focus:ring-1 focus:ring-blue-500"
                          value={((rate as number) * 100).toFixed(2)} // Display as percentage
                          onChange={(e) => handleDeepChange('rates', line as BusinessLine, parseFloat(e.target.value)/100)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="number"
                          className="w-full text-right border rounded px-1 font-mono focus:ring-1 focus:ring-blue-500"
                          value={localConfig.lineTargets[line as BusinessLine] || 0}
                          onChange={(e) => handleDeepChange('lineTargets', line as BusinessLine, parseFloat(e.target.value))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Save Button */}
      <div className={`fixed bottom-6 right-6 transition-all duration-500 transform ${isDirty ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
        <button 
          onClick={handleSave}
          className="bg-[#FFB800] text-black px-8 py-4 rounded-full shadow-2xl font-bold flex items-center space-x-3 border-2 border-black hover:bg-yellow-400 hover:scale-105 transition-transform"
        >
          <Save size={24} />
          <div className="text-left leading-tight">
            <span className="block text-sm">GUARDAR CAMBIOS</span>
            <span className="block text-[10px] opacity-75 font-normal">Aplica: Próximo Mes</span>
          </div>
        </button>
      </div>

    </div>
  );
};