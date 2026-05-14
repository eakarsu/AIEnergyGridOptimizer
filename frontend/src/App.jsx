import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import Login from './pages/Login';
import AICenter from './pages/AICenter';

import Batch03Features from './pages/Batch03Features';

const sidebarSections = [
  {
    title: 'AI Analytics',
    items: [
      { key: 'load_forecasting', label: 'Load Forecasting', icon: 'fa-chart-line' },
      { key: 'fault_detection', label: 'Fault Detection', icon: 'fa-exclamation-triangle' },
      { key: 'smart_meters', label: 'Smart Meters', icon: 'fa-tachometer-alt' },
      { key: 'energy_trading', label: 'Energy Trading', icon: 'fa-exchange-alt' },
      { key: 'weather_impact', label: 'Weather Impact', icon: 'fa-cloud-sun' },
      { key: 'maintenance_schedule', label: 'Maintenance Scheduling', icon: 'fa-tools' },
    ],
  },
  {
    title: 'Grid Operations',
    items: [
      { key: 'renewable_sources', label: 'Renewable Sources', icon: 'fa-solar-panel' },
      { key: 'demand_response', label: 'Demand Response', icon: 'fa-users' },
      { key: 'energy_storage', label: 'Energy Storage', icon: 'fa-battery-full' },
      { key: 'power_flow', label: 'Power Flow', icon: 'fa-project-diagram' },
      { key: 'voltage_regulation', label: 'Voltage Regulation', icon: 'fa-bolt' },
      { key: 'outage_management', label: 'Outage Management', icon: 'fa-power-off' },
    ],
  },
  {
    title: 'Management',
    items: [
      { key: 'carbon_emissions', label: 'Carbon Emissions', icon: 'fa-leaf' },
      { key: 'regulatory_compliance', label: 'Regulatory Compliance', icon: 'fa-gavel' },
      { key: 'grid_topology', label: 'Grid Topology', icon: 'fa-network-wired' },
    ],
  },
];

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (tkn, usr) => {
    localStorage.setItem('token', tkn);
    localStorage.setItem('user', JSON.stringify(usr));
    setToken(tkn);
    setUser(usr);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="fas fa-bolt logo-icon"></i>
            {!sidebarCollapsed && <span className="logo-text">Energy Grid AI</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <i className={`fas fa-${sidebarCollapsed ? 'chevron-right' : 'chevron-left'}`}></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/"
            className={`sidebar-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            <i className="fas fa-th-large"></i>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </Link>

          <Link
            to="/ai-center"
            className={`sidebar-item ${location.pathname === '/ai-center' ? 'active' : ''}`}
          >
            <i className="fas fa-brain"></i>
            {!sidebarCollapsed && <span>AI Center</span>}
          </Link>

          {sidebarSections.map((section) => (
            <div key={section.title} className="sidebar-section">
              {!sidebarCollapsed && (
                <div className="sidebar-section-title">{section.title}</div>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.key}
                  to={`/feature/${item.key}`}
                  className={`sidebar-item ${
                    location.pathname === `/feature/${item.key}` ? 'active' : ''
                  }`}
                >
                  <i className={`fas ${item.icon}`}></i>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              <i className="fas fa-user"></i>
            </div>
            {!sidebarCollapsed && (
              <div className="user-info">
                <div className="user-name">{user?.name || 'Admin'}</div>
                <div className="user-role">{user?.role || 'Administrator'}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/batch03" element={<Batch03Features />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/ai-center" element={<AICenter />} />
          <Route path="/feature/:featureKey" element={<FeaturePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
