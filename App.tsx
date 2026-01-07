import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { User, UserRole, CommissionConfig } from './types';
import { MOCK_HIERARCHY } from './services/mockSapService';

// Default Mock User - Aligned with Mock Service Data (d1)
const INITIAL_USER: User = {
  id: 'd1',
  name: 'Carlos Director',
  role: UserRole.DIRECTOR, 
  email: 'carlos.director@torqueytension.com',
  avatar: 'https://picsum.photos/200',
  territory: 'Global'
};

// Initial Config based on PDF
const INITIAL_CONFIG: CommissionConfig = {
  globalTarget: 700000,
  floorPercentage: 70,
  scale90to100: 1.0, // 100%
  scale80to89: 0.80, // 80%
  scale70to79: 0.70, // 70%
  scaleBelow70: 0.0, // 0%
  
  rates: {
    'Ventas': 0.015,         // 1.50%
    'Renta': 0.02,           // 2.00%
    'Mantenimiento': 0.015,  // 1.50%
    'Calibración': 0.015,    // 1.50%
    'Capacitación': 0.10,    // 10.00%
    'Supervisión': 0.03,     // 3.00%
    'Proyectos': 0.03,       // 3.00%
    'Otros': 0.00
  },
  
  lineTargets: {
    'Ventas': 300000,
    'Renta': 250000,
    'Mantenimiento': 30000,
    'Calibración': 30000,
    'Capacitación': 20000,
    'Supervisión': 40000,
    'Proyectos': 30000,
    'Otros': 0
  },

  bonusNewClient: 500,
  bonusRecoveredClient: 500,
  bonusGoalNewClients: 1500
};

const App: React.FC = () => {
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [config, setConfig] = useState<CommissionConfig>(INITIAL_CONFIG);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    alert("Simulación de cierre de sesión. Reiniciando...");
    window.location.reload();
  };

  const handleUpdateConfig = (newConfig: CommissionConfig) => {
    setConfig(newConfig);
  };

  // Logic to simulate role switching with valid hierarchy IDs
  const toggleRole = () => {
    let nextUser = { ...user };

    if (user.role === UserRole.DIRECTOR) {
      // Switch to Rep (Juan)
      const rep = MOCK_HIERARCHY.reps[0];
      nextUser = { ...rep, role: UserRole.SALES_REP, email: 'juan@t-t.com', avatar: 'https://picsum.photos/201' };
    } else if (user.role === UserRole.SALES_REP) {
      // Switch to Manager (Laura)
      const mgr = MOCK_HIERARCHY.managers[0];
      nextUser = { ...mgr, role: UserRole.MANAGER, email: 'laura@t-t.com', avatar: 'https://picsum.photos/202' };
    } else {
      // Switch back to Director
      nextUser = INITIAL_USER;
    }

    setUser(nextUser);
    
    // Safety check for view access
    if (nextUser.role !== UserRole.DIRECTOR && currentView === 'admin') {
      setCurrentView('dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-[#FFB800] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h1 className="text-2xl font-bold tracking-widest">T&T SYSTEMS</h1>
        <p className="text-xs text-gray-500 mt-2">Connecting to SAP Service Layer...</p>
      </div>
    );
  }

  return (
    <>
      <Layout 
        user={user} 
        onLogout={handleLogout}
        currentView={currentView}
        onChangeView={setCurrentView}
      >
        {currentView === 'dashboard' && (
          <Dashboard user={user} config={config} />
        )}
        {currentView === 'admin' && (
          <AdminPanel config={config} onUpdateConfig={handleUpdateConfig} />
        )}
        {currentView === 'reports' && (
          <ReportsPanel user={user} />
        )}
      </Layout>
      
      {/* Demo Controller Floating Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          onClick={toggleRole}
          className="bg-black text-[#FFB800] px-4 py-2 rounded-full shadow-lg text-xs font-bold border border-[#FFB800] hover:bg-gray-900 transition-transform hover:scale-105"
        >
          Demo Role: {user.role} ({user.name})
        </button>
      </div>
    </>
  );
};

export default App;