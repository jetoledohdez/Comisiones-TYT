import React from 'react';
import { CommissionConfig, BusinessLine } from '../types';
import { Info, Save, RotateCcw } from 'lucide-react';

interface AdminPanelProps {
  config: CommissionConfig;
  onUpdateConfig: (newConfig: CommissionConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ config, onUpdateConfig }) => {
  
  const handleRateChange = (line: BusinessLine, val: string) => {
    const num = parseFloat(val) / 100; // Convert 1.5 to 0.015
    if (!isNaN(num)) {
      onUpdateConfig({
        ...config,
        rates: { ...config.rates, [line]: num }
      });
    }
  };

  const handleGlobalChange = (field: keyof CommissionConfig, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onUpdateConfig({ ...config, [field]: num });
    }
  };

  const InputGroup = ({ label, value, suffix, onChange, type = "number" }: any) => (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
      <div className="relative">
        <input 
          type={type} 
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[#003366] outline-none bg-white text-black shadow-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="absolute right-3 top-2 text-gray-400 text-xs">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* Header Info */}
      <div className="bg-[#FFF4E5] border border-[#FFB800] p-4 rounded-md flex items-start space-x-3">
        <Info className="text-[#FFB800] mt-1 shrink-0" />
        <div>
          <h4 className="font-bold text-[#1A1A1A]">Motor de Compensación</h4>
          <p className="text-sm text-gray-700">
            Ajuste las variables globales y específicas. Los cambios impactan inmediatamente en el cálculo del dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Rates by Business Line */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold text-[#003366] text-lg mb-6 border-b pb-2">Tasas por Línea de Negocio</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(config.rates).map(([line, rate]) => (
              <InputGroup 
                key={line}
                label={line}
                value={(rate * 100).toFixed(2)}
                suffix="%"
                onChange={(v: string) => handleRateChange(line as BusinessLine, v)}
              />
            ))}
          </div>
        </div>

        {/* Right Col: Penalties & Targets */}
        <div className="space-y-6">
          
          {/* Targets */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold text-[#003366] text-lg mb-6 border-b pb-2">Metas y Bonos</h3>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup 
                label="Meta Global Mensual"
                value={config.globalTarget}
                suffix="MXN"
                onChange={(v: string) => handleGlobalChange('globalTarget', v)}
              />
              <InputGroup 
                label="Piso de Venta (Mínimo)"
                value={config.floorPercentage}
                suffix="%"
                onChange={(v: string) => handleGlobalChange('floorPercentage', v)}
              />
              <InputGroup 
                label="Bono Cliente Nuevo"
                value={config.bonusNewClient}
                suffix="MXN"
                onChange={(v: string) => handleGlobalChange('bonusNewClient', v)}
              />
              <InputGroup 
                label="Bono Cliente Recuperado"
                value={config.bonusRecoveredClient}
                suffix="MXN"
                onChange={(v: string) => handleGlobalChange('bonusRecoveredClient', v)}
              />
            </div>
          </div>

          {/* Penalty Scale Table */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold text-[#003366] text-lg mb-4 border-b pb-2 flex items-center justify-between">
              <span>Tabla de Castigo (Escalas)</span>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">FACTOR</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4">Porcentaje de la comisión que se paga según el cumplimiento de la meta.</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">90% en adelante</span>
                <div className="w-24"><InputGroup value={config.scale90to100} onChange={(v: string) => handleGlobalChange('scale90to100', v)} /></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">80% al 89%</span>
                <div className="w-24"><InputGroup value={config.scale80to89} onChange={(v: string) => handleGlobalChange('scale80to89', v)} /></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">70% al 79% (Piso)</span>
                <div className="w-24"><InputGroup value={config.scale70to79} onChange={(v: string) => handleGlobalChange('scale70to79', v)} /></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-500">Menos de 70%</span>
                <div className="w-24"><InputGroup value={config.scaleBelow70} onChange={(v: string) => handleGlobalChange('scaleBelow70', v)} /></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};