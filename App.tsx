import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { User, UserRole, CommissionConfig } from './types';
import { MOCK_HIERARCHY } from './services/mockSapService';

// Default Mock User
const INITIAL_USER: User = {
  id: 'd1',
  name: 'Carlos Director',
  role: UserRole.DIRECTOR, 
  email: 'carlos.director@torqueytension.com',
  avatar: 'https://picsum.photos/200',
  territory: 'Global'
};

// Initial Config based on NEW SPEC
const INITIAL_CONFIG: CommissionConfig = {
  globalTarget: 700000,

  // 1. Scales
  positiveScales: [
    { endAmount: 750000, commissionPercentage: 105 },
    { endAmount: 850000, commissionPercentage: 110 },
    { endAmount: 1000000, commissionPercentage: 115 },
    { endAmount: undefined, commissionPercentage: 120 }
  ],
  negativeScales: [
    { endAmount: 600000, commissionPercentage: 90 },
    { endAmount: 500000, commissionPercentage: 80 },
    { endAmount: 400000, commissionPercentage: 70 },
    { endAmount: undefined, commissionPercentage: 50 }
  ],

  // 2. Coverages (DESCENDING LOGIC: Start -> End)
  enablePortfolioCoverage: true,
  portfolioActivityTarget: 50, // 50% of Portfolio
  portfolioScales: [
    { startPercentage: 100, endPercentage: 90, payoutFactor: 1.0 },
    { startPercentage: 89, endPercentage: 80, payoutFactor: 0.9 },
    { startPercentage: 79, endPercentage: 0, payoutFactor: 0.8 }
  ],

  enableClosingCoverage: true,
  closingPercentageTarget: 30, // 30% closing rate
  closingScales: [
    { startPercentage: 100, endPercentage: 90, payoutFactor: 1.0 },
    { startPercentage: 89, endPercentage: 80, payoutFactor: 0.9 },
    { startPercentage: 79, endPercentage: 0, payoutFactor: 0.8 }
  ],

  // 3. Bonuses (Granular)
  enableBonusNewClient: true,
  enableBonusRecovered: true,
  enableBonusVolume: true,

  bonusNewClient: { targetQty: 2, rewardAmount: 500, minPurchaseAmount: 5000 },
  bonusRecoveredClient: { targetQty: 2, rewardAmount: 500, minPurchaseAmount: 5000 },
  bonusVolumeClients: { targetQty: 5, rewardAmount: 1500 }, // Renamed & removed multiplier
  
  // 4. Base Rates
  rates: {
    'Ventas': 0.015,         
    'Renta': 0.02,           
    'Mantenimiento': 0.015,  
    'Calibración': 0.015,    
    'Capacitación': 0.10,    
    'Supervisión': 0.03,     
    'Proyectos': 0.03,       
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
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [config, setConfig] = useState<CommissionConfig>(INITIAL_CONFIG);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const toggleRole = () => {
    let nextUser = { ...user };
    if (user.role === UserRole.DIRECTOR) {
      const rep = MOCK_HIERARCHY.reps[0];
      nextUser = { ...rep, role: UserRole.SALES_REP, email: 'juan@t-t.com', avatar: 'https://picsum.photos/201' };
    } else if (user.role === UserRole.SALES_REP) {
      const mgr = MOCK_HIERARCHY.managers[0];
      nextUser = { ...mgr, role: UserRole.MANAGER, email: 'laura@t-t.com', avatar: 'https://picsum.photos/202' };
    } else {
      nextUser = INITIAL_USER;
    }
    setUser(nextUser);
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
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      >
        {currentView === 'dashboard' && (
          <Dashboard user={user} config={config} isDarkMode={isDarkMode} />
        )}
        {currentView === 'admin' && (
          <AdminPanel config={config} onUpdateConfig={handleUpdateConfig} />
        )}
        {currentView === 'reports' && (
          <ReportsPanel user={user} />
        )}
      </Layout>
      
      {/* Demo Controller */}
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