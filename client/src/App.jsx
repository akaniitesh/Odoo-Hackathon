import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Compass, 
  Wrench, 
  Coins, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  Search,
  Bell
} from 'lucide-react';

// Pages imports (we will write these next)
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/Settings';
import { requestJson } from './services/api';

// Authentication Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on load
  useEffect(() => {
    fetchMe();
  }, []);

  const fetchMe = async () => {
    try {
      const data = await requestJson('/api/auth/me');
      setUser(data.user);
    } catch (err) {
      console.error('Auth verification failed:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe) => {
    const data = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await requestJson('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route Wrapper with RBAC check
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#080c14' }}>
        <div className="pulse-dot" style={{ width: '16px', height: '16px' }}></div>
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading TransitOps Console...</span>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// App Shell Layout
function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'] },
    { name: 'Vehicle Registry', path: '/vehicles', icon: Truck, roles: ['FleetManager', 'Dispatcher', 'FinancialAnalyst'] },
    { name: 'Drivers & Safety', path: '/drivers', icon: Users, roles: ['FleetManager', 'Dispatcher', 'SafetyOfficer'] },
    { name: 'Trip Dispatcher', path: '/trips', icon: Compass, roles: ['FleetManager', 'Dispatcher', 'SafetyOfficer'] },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['FleetManager', 'FinancialAnalyst'] },
    { name: 'Fuel & Expenses', path: '/expenses', icon: Coins, roles: ['FleetManager', 'Dispatcher', 'FinancialAnalyst'] },
    { name: 'Reports & Analytics', path: '/analytics', icon: BarChart3, roles: ['FleetManager', 'SafetyOfficer', 'FinancialAnalyst'] },
    { name: 'Settings & APIs', path: '/settings', icon: Settings, roles: ['FleetManager'] }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

  const getInitials = (name) => {
    if (!name) return 'TO';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'FleetManager': return 'Fleet Manager';
      case 'Dispatcher': return 'Dispatcher';
      case 'SafetyOfficer': return 'Safety Officer';
      case 'FinancialAnalyst': return 'Financial Analyst';
      default: return role;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand-icon-wrapper" style={{ padding: '6px', borderRadius: '8px' }}>
            <Compass style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
          </div>
          <h2>TransitOps</h2>
        </div>
        <ul className="sidebar-menu">
          {filteredMenu.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
            return (
              <li key={item.path} className="sidebar-item">
                <Link to={item.path} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                  <Icon />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="sidebar-footer">
          &copy; 2026 TransitOps LLC
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-layout">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-search">
            <Search />
            <input type="text" placeholder="Search fleet registry, drivers, active trips..." />
          </div>
          <div className="topbar-user">
            <span className="user-badge">{getRoleBadge(user?.role)}</span>
            <div className="user-info">
              <div className="user-avatar">{getInitials(user?.name)}</div>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{user?.name}</span>
            </div>
            <button className="user-logout" title="Sign Out" onClick={logout}>
              <LogOut style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/vehicles" element={
              <ProtectedRoute allowedRoles={['FleetManager', 'Dispatcher', 'FinancialAnalyst']}>
                <Vehicles />
              </ProtectedRoute>
            } />
            
            <Route path="/drivers" element={
              <ProtectedRoute allowedRoles={['FleetManager', 'Dispatcher', 'SafetyOfficer']}>
                <Drivers />
              </ProtectedRoute>
            } />
            
            <Route path="/trips" element={
              <ProtectedRoute allowedRoles={['FleetManager', 'Dispatcher', 'SafetyOfficer']}>
                <Trips />
              </ProtectedRoute>
            } />
            
            <Route path="/maintenance" element={
              <ProtectedRoute allowedRoles={['FleetManager', 'FinancialAnalyst']}>
                <Maintenance />
              </ProtectedRoute>
            } />
            
            <Route path="/expenses" element={
              <ProtectedRoute allowedRoles={['FleetManager', 'Dispatcher', 'FinancialAnalyst']}>
                <Expenses />
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={['FleetManager', 'SafetyOfficer', 'FinancialAnalyst']}>
                <Analytics />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['FleetManager']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// App Entry Point
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
