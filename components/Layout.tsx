import React from 'react';
import { User, UserRole } from '../types';
import { LayoutDashboard, Settings, LogOut, FileText } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentView: 'dashboard' | 'admin' | 'reports';
  onChangeView: (view: 'dashboard' | 'admin' | 'reports') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onChangeView }) => {
  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar - T&T Industrial Style */}
      <aside className="w-64 bg-[#1A1A1A] text-white flex flex-col shadow-2xl z-10 shrink-0 h-screen sticky top-0">
        <div className="h-20 flex items-center justify-center border-b border-gray-800 bg-[#FFB800]">
           <h1 className="text-2xl font-black tracking-tighter text-black">
             T&T <span className="font-light">HUB</span>
           </h1>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img 
              src={user.avatar} 
              alt="User" 
              className="w-10 h-10 rounded-full border-2 border-[#FFB800]"
            />
            <div>
              <p className="text-sm font-bold text-gray-100">{user.name}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => onChangeView('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                currentView === 'dashboard' 
                  ? 'bg-[#003366] text-white border-l-4 border-[#FFB800]' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            
            {user.role === UserRole.DIRECTOR && (
              <button
                onClick={() => onChangeView('admin')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                  currentView === 'admin' 
                    ? 'bg-[#003366] text-white border-l-4 border-[#FFB800]' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Settings size={20} />
                <span className="font-medium">Configuración</span>
              </button>
            )}

            <button 
              onClick={() => onChangeView('reports')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                currentView === 'reports' 
                  ? 'bg-[#003366] text-white border-l-4 border-[#FFB800]' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <FileText size={20} />
              <span className="font-medium">Reportes</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-800">
           <button 
             onClick={onLogout}
             className="flex items-center space-x-2 text-gray-400 hover:text-[#FFB800] transition-colors"
           >
             <LogOut size={18} />
             <span className="text-sm">Cerrar Sesión</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
          <h2 className="text-2xl font-bold text-[#003366]">
            {currentView === 'dashboard' && 'Tablero de Control'}
            {currentView === 'admin' && 'Panel de Administración'}
            {currentView === 'reports' && 'Centro de Reportes'}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold border border-green-200">
              SAP CONNECTED
            </span>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};