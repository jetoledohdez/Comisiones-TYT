import React from 'react';
import { User, UserRole, FilterState } from '../types';
import { MOCK_HIERARCHY } from '../services/mockSapService';
import { Filter, Calendar } from 'lucide-react';

interface FilterBarProps {
  user: User;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ user, filters, onFilterChange }) => {
  
  const handleChange = (field: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Derive dropdown options based on hierarchy
  const territories = Array.from(new Set(MOCK_HIERARCHY.managers.map(m => m.territory)));
  
  const managers = MOCK_HIERARCHY.managers.filter(m => 
    filters.selectedTerritory === 'ALL' || m.territory === filters.selectedTerritory
  );

  const reps = MOCK_HIERARCHY.reps.filter(r => 
    (filters.selectedTerritory === 'ALL' || r.territory === filters.selectedTerritory) &&
    (filters.selectedManager === 'ALL' || r.managerId === filters.selectedManager)
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
      
      {/* Time Filters - Available to everyone */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
          <Calendar size={12} /> Año
        </label>
        <select 
          className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-[#FFB800] outline-none bg-white text-black shadow-sm"
          value={filters.year}
          onChange={(e) => handleChange('year', Number(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase">Mes</label>
        <select 
          className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-[#FFB800] outline-none bg-white text-black shadow-sm"
          value={filters.month}
          onChange={(e) => handleChange('month', Number(e.target.value))}
        >
          {months.map(m => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString('es-MX', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      <div className="w-px bg-gray-300 h-10 mx-2 self-center hidden md:block"></div>

      {/* Hierarchy Filters - Conditional Rendering */}
      
      {/* Territory: Only for Director */}
      {user.role === UserRole.DIRECTOR && (
        <div className="flex flex-col space-y-1 min-w-[150px]">
          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
            <Filter size={12} /> Territorio
          </label>
          <select 
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#FFB800] outline-none bg-white text-black shadow-sm"
            value={filters.selectedTerritory}
            onChange={(e) => handleChange('selectedTerritory', e.target.value)}
          >
            <option value="ALL">Todos los Territorios</option>
            {territories.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {/* Manager: For Director */}
      {(user.role === UserRole.DIRECTOR) && (
        <div className="flex flex-col space-y-1 min-w-[150px]">
          <label className="text-xs font-bold text-gray-500 uppercase">Gerente</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#FFB800] outline-none bg-white text-black shadow-sm"
            value={filters.selectedManager}
            onChange={(e) => handleChange('selectedManager', e.target.value)}
          >
            <option value="ALL">Todos los Gerentes</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      {/* Reps: For Director and Manager */}
      {(user.role === UserRole.DIRECTOR || user.role === UserRole.MANAGER) && (
        <div className="flex flex-col space-y-1 min-w-[150px]">
          <label className="text-xs font-bold text-gray-500 uppercase">Vendedor</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#FFB800] outline-none bg-white text-black shadow-sm"
            value={filters.selectedRep}
            onChange={(e) => handleChange('selectedRep', e.target.value)}
          >
            <option value="ALL">Todos los Vendedores</option>
            {reps
              // If Manager, only show their reps
              .filter(r => user.role === UserRole.MANAGER ? r.managerId === user.id : true)
              .map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

    </div>
  );
};