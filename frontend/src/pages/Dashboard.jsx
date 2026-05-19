import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const featureCards = [
  { key: 'load_forecasting', label: 'Load Forecasting', icon: 'fa-chart-line', desc: 'AI-powered load prediction and analysis', ai: true, section: 'AI Analytics' },
  { key: 'fault_detection', label: 'Fault Detection', icon: 'fa-exclamation-triangle', desc: 'AI-driven grid fault identification', ai: true, section: 'AI Analytics' },
  { key: 'smart_meters', label: 'Smart Meters', icon: 'fa-tachometer-alt', desc: 'AI-powered consumption analytics', ai: true, section: 'AI Analytics' },
  { key: 'energy_trading', label: 'Energy Trading', icon: 'fa-exchange-alt', desc: 'AI-optimized energy market trading', ai: true, section: 'AI Analytics' },
  { key: 'weather_impact', label: 'Weather Impact', icon: 'fa-cloud-sun', desc: 'Weather-based generation forecasting', ai: true, section: 'AI Analytics' },
  { key: 'maintenance_schedule', label: 'Maintenance Scheduling', icon: 'fa-tools', desc: 'AI predictive maintenance', ai: true, section: 'AI Analytics' },
  { key: 'renewable_sources', label: 'Renewable Sources', icon: 'fa-solar-panel', desc: 'Solar, wind, hydro & geothermal management', ai: false, section: 'Grid Operations' },
  { key: 'demand_response', label: 'Demand Response', icon: 'fa-users', desc: 'Customer participation programs', ai: false, section: 'Grid Operations' },
  { key: 'energy_storage', label: 'Energy Storage', icon: 'fa-battery-full', desc: 'Battery and storage system monitoring', ai: false, section: 'Grid Operations' },
  { key: 'power_flow', label: 'Power Flow', icon: 'fa-project-diagram', desc: 'Transmission line analysis', ai: false, section: 'Grid Operations' },
  { key: 'voltage_regulation', label: 'Voltage Regulation', icon: 'fa-bolt', desc: 'Substation voltage management', ai: false, section: 'Grid Operations' },
  { key: 'outage_management', label: 'Outage Management', icon: 'fa-power-off', desc: 'Outage tracking and restoration', ai: false, section: 'Grid Operations' },
  { key: 'carbon_emissions', label: 'Carbon Emissions', icon: 'fa-leaf', desc: 'Emission tracking and reduction', ai: false, section: 'Management' },
  { key: 'regulatory_compliance', label: 'Regulatory Compliance', icon: 'fa-gavel', desc: 'Compliance monitoring and reporting', ai: false, section: 'Management' },
  { key: 'grid_topology', label: 'Grid Topology', icon: 'fa-network-wired', desc: 'Network infrastructure management', ai: false, section: 'Management' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalGeneration: 0,
    totalLoad: 0,
    activeAlerts: 0,
    activeOutages: 0,
  });
  const [counts, setCounts] = useState({});

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStats();
    fetchCounts();
  }, []);

  const fetchStats = async () => {
    try {
      const [renewRes, loadRes, faultRes, outageRes] = await Promise.allSettled([
        fetch('/api/renewable-sources', { headers }),
        fetch('/api/load-forecasting', { headers }),
        fetch('/api/fault-detection', { headers }),
        fetch('/api/outage-management', { headers }),
      ]);

      let totalGeneration = 0;
      let totalLoad = 0;
      let activeAlerts = 0;
      let activeOutages = 0;

      if (renewRes.status === 'fulfilled' && renewRes.value.ok) {
        const data = await renewRes.value.json();
        const items = Array.isArray(data) ? data : data.data || [];
        totalGeneration = items.reduce((sum, r) => sum + (parseFloat(r.currentOutputMw) || 0), 0);
      }
      if (loadRes.status === 'fulfilled' && loadRes.value.ok) {
        const data = await loadRes.value.json();
        const items = Array.isArray(data) ? data : data.data || [];
        totalLoad = items.reduce((sum, r) => sum + (parseFloat(r.currentLoadMw) || 0), 0);
      }
      if (faultRes.status === 'fulfilled' && faultRes.value.ok) {
        const data = await faultRes.value.json();
        const items = Array.isArray(data) ? data : data.data || [];
        activeAlerts = items.filter((f) => f.status !== 'resolved').length;
      }
      if (outageRes.status === 'fulfilled' && outageRes.value.ok) {
        const data = await outageRes.value.json();
        const items = Array.isArray(data) ? data : data.data || [];
        activeOutages = items.filter((o) => o.status === 'active' || o.status === 'investigating').length;
      }

      setStats({
        totalGeneration: Math.round(totalGeneration),
        totalLoad: Math.round(totalLoad),
        activeAlerts,
        activeOutages,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCounts = async () => {
    const endpoints = {
      load_forecasting: 'load-forecasting',
      renewable_sources: 'renewable-sources',
      demand_response: 'demand-response',
      fault_detection: 'fault-detection',
      energy_storage: 'energy-storage',
      power_flow: 'power-flow',
      carbon_emissions: 'carbon-emissions',
      smart_meters: 'smart-meters',
      voltage_regulation: 'voltage-regulation',
      outage_management: 'outage-management',
      energy_trading: 'energy-trading',
      weather_impact: 'weather-impact',
      maintenance_schedule: 'maintenance-schedule',
      regulatory_compliance: 'regulatory-compliance',
      grid_topology: 'grid-topology',
    };

    const results = {};
    const promises = Object.entries(endpoints).map(async ([key, ep]) => {
      try {
        // Use page=1&limit=1 to fetch only pagination metadata (total count)
        const res = await fetch(`/api/${ep}?page=1&limit=1`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            results[key] = data.length;
          } else {
            results[key] = data.pagination?.total ?? (data.data?.length || 0);
          }
        } else {
          results[key] = 0;
        }
      } catch {
        results[key] = 0;
      }
    });

    await Promise.all(promises);
    setCounts(results);
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>
          <i className="fas fa-th-large"></i> Dashboard
        </h1>
        <p className="page-subtitle">Real-time overview of your energy grid</p>
      </div>

      <div className="stats-bar">
        <div className="stat-card stat-generation">
          <div className="stat-icon">
            <i className="fas fa-solar-panel"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalGeneration.toLocaleString()}</div>
            <div className="stat-label">Total Generation (MW)</div>
          </div>
        </div>
        <div className="stat-card stat-load">
          <div className="stat-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalLoad.toLocaleString()}</div>
            <div className="stat-label">Total Load (MW)</div>
          </div>
        </div>
        <div className="stat-card stat-alerts">
          <div className="stat-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeAlerts}</div>
            <div className="stat-label">Active Alerts</div>
          </div>
        </div>
        <div className="stat-card stat-outages">
          <div className="stat-icon">
            <i className="fas fa-power-off"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeOutages}</div>
            <div className="stat-label">Active Outages</div>
          </div>
        </div>
      </div>

      <div className="feature-grid">
        {featureCards.map((card) => (
          <div
            key={card.key}
            className="feature-card"
            onClick={() => navigate(`/feature/${card.key}`)}
          >
            <div className="feature-card-header">
              <div className="feature-card-icon">
                <i className={`fas ${card.icon}`}></i>
              </div>
              {card.ai && (
                <span className="ai-badge">
                  <i className="fas fa-brain"></i> AI
                </span>
              )}
            </div>
            <h3 className="feature-card-title">{card.label}</h3>
            <p className="feature-card-desc">{card.desc}</p>
            <div className="feature-card-footer">
              <span className="feature-card-count">
                {counts[card.key] !== undefined ? counts[card.key] : '...'} items
              </span>
              <span className="feature-card-section">{card.section}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
