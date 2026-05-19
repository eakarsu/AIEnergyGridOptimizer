import React, { useState } from 'react';

// Tabs surface mechanical backlog AI endpoints (demand-forecast,
// battery-scheduling) plus the existing aiNew endpoints
// (predictive-maintenance-alert, grid-health-summary,
// energy-trading-strategy) which previously had no dedicated UI.
const tabs = [
  {
    key: 'demand-forecast',
    label: 'Demand Forecast',
    icon: 'fa-chart-area',
    endpoint: '/api/ai/demand-forecast',
    description: 'Short-horizon load forecast using historical load + weather data.',
    fields: [
      { key: 'region', label: 'Region (optional)', type: 'text', placeholder: 'e.g. North-East' },
      { key: 'horizon_hours', label: 'Horizon (hours, 1-72)', type: 'number', min: 1, max: 72, defaultValue: 24 },
    ],
  },
  {
    key: 'battery-scheduling',
    label: 'Battery Scheduling',
    icon: 'fa-battery-half',
    endpoint: '/api/ai/battery-scheduling',
    description: 'Charge/discharge dispatch schedule given battery state, forecasts, and prices.',
    fields: [
      { key: 'storage_id', label: 'Storage ID (optional)', type: 'number', placeholder: 'leave blank for all' },
      { key: 'horizon_hours', label: 'Horizon (hours, 1-48)', type: 'number', min: 1, max: 48, defaultValue: 24 },
    ],
  },
  {
    key: 'predictive-maintenance-alert',
    label: 'Predictive Maintenance',
    icon: 'fa-tools',
    endpoint: '/api/ai/predictive-maintenance-alert',
    description: 'Prioritized alerts for assets with predicted_failure_risk > 0.5.',
    fields: [],
  },
  {
    key: 'grid-health-summary',
    label: 'Grid Health Summary',
    icon: 'fa-heart-pulse',
    endpoint: '/api/ai/grid-health-summary',
    description: 'Executive briefing aggregated from all 15 operational domains.',
    fields: [],
  },
  {
    key: 'energy-trading-strategy',
    label: 'Trading Strategy',
    icon: 'fa-coins',
    endpoint: '/api/ai/energy-trading-strategy',
    description: 'Multi-hour buy/sell strategy for a given location.',
    fields: [
      { key: 'location_id', label: 'Location ID (required)', type: 'text', required: true },
      { key: 'time_horizon_hours', label: 'Horizon (hours, 1-168)', type: 'number', min: 1, max: 168, defaultValue: 24 },
    ],
  },
  // Apply pass 5 backlog
  {
    key: 'microgrid-optimization',
    label: 'Microgrid Optimization',
    icon: 'fa-solar-panel',
    endpoint: '/api/ai/microgrid-optimization',
    description: 'Self-sufficiency dispatch plan balancing renewables, storage, and load.',
    fields: [
      { key: 'region', label: 'Region (optional)', type: 'text', placeholder: 'e.g. North-East' },
      { key: 'horizon_hours', label: 'Horizon (hours, 1-48)', type: 'number', min: 1, max: 48, defaultValue: 12 },
    ],
  },
  {
    key: 'outage-prediction',
    label: 'Outage Prediction',
    icon: 'fa-triangle-exclamation',
    endpoint: '/api/ai/outage-prediction',
    description: 'Per-zone outage probabilities using outages, weather, faults, and maintenance.',
    fields: [
      { key: 'region', label: 'Region (optional)', type: 'text', placeholder: 'e.g. South' },
      { key: 'horizon_hours', label: 'Horizon (hours, 1-72)', type: 'number', min: 1, max: 72, defaultValue: 24 },
    ],
  },
  {
    key: 'price-optimization',
    label: 'Price Optimization',
    icon: 'fa-dollar-sign',
    endpoint: '/api/ai/price-optimization',
    description: 'Hourly buy/sell/hold schedule constrained by carbon intensity.',
    fields: [
      { key: 'region', label: 'Region (optional)', type: 'text' },
      { key: 'horizon_hours', label: 'Horizon (hours, 1-48)', type: 'number', min: 1, max: 48, defaultValue: 24 },
    ],
  },
];

function parseBold(str) {
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = String(text).split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="ai-list">
          {listItems.map((item, i) => (
            <li key={i}>{parseBold(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={idx} className="ai-h3">{parseBold(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={idx} className="ai-h2">{parseBold(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={idx} className="ai-h1">{parseBold(trimmed.slice(2))}</h2>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
    } else {
      flushList();
      elements.push(<p key={idx} className="ai-paragraph">{parseBold(trimmed)}</p>);
    }
  });

  flushList();
  return elements;
}

function AICenter() {
  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const [formState, setFormState] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const tab = tabs.find(t => t.key === activeTab);
  const formValues = formState[activeTab] || {};

  const setField = (key, value) => {
    setFormState({
      ...formState,
      [activeTab]: { ...(formState[activeTab] || {}), [key]: value },
    });
  };

  const switchTab = (key) => {
    setActiveTab(key);
    setResult(null);
    setError('');
  };

  const buildBody = () => {
    const body = {};
    for (const f of tab.fields) {
      const raw = formValues[f.key];
      if (raw === undefined || raw === '') continue;
      if (f.type === 'number') {
        const n = Number(raw);
        if (!Number.isNaN(n)) body[f.key] = n;
      } else {
        body[f.key] = raw;
      }
    }
    return body;
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const res = await fetch(tab.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildBody()),
      });

      if (res.status === 503) {
        let detail = 'AI service is not configured (missing API key).';
        try {
          const data = await res.json();
          if (data?.detail) detail = data.detail;
          else if (data?.error) detail = data.error;
        } catch (_) {}
        setError(detail);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || `Request failed (${res.status})`);
        return;
      }
      setResult(data);
    } catch (err) {
      setError('Failed to reach AI service. ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis || result;
  const analysisText =
    analysis?.analysis ||
    analysis?.result ||
    analysis?.message ||
    (result ? JSON.stringify(result, null, 2) : '');
  const modelName = analysis?.model || result?.analysis?.model;
  const timestamp =
    analysis?.timestamp ||
    result?.generatedAt ||
    null;

  // Validation: trading-strategy needs location_id
  const submitDisabled = (() => {
    if (loading) return true;
    for (const f of tab.fields) {
      if (f.required) {
        const v = formValues[f.key];
        if (v === undefined || v === '') return true;
      }
    }
    return false;
  })();

  return (
    <div className="feature-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            <i className="fas fa-brain"></i> AI Center
          </h1>
          <span className="item-count">{tabs.length} analyses</span>
        </div>
      </div>

      <div className="ai-center-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`btn ${t.key === activeTab ? 'btn-ai' : 'btn-secondary'}`}
            onClick={() => switchTab(t.key)}
          >
            <i className={`fas ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      <div className="ai-center-panel" style={{ background: 'var(--card-bg, #1a1f2e)', padding: 20, borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>
          <i className={`fas ${tab.icon}`}></i> {tab.label}
        </h2>
        <p style={{ opacity: 0.8 }}>{tab.description}</p>

        {tab.fields.length > 0 && (
          <div className="form-grid" style={{ marginTop: 12 }}>
            {tab.fields.map(f => (
              <div key={f.key} className="form-group">
                <label>{f.label}</label>
                <input
                  type={f.type || 'text'}
                  min={f.min}
                  max={f.max}
                  placeholder={f.placeholder || ''}
                  value={formValues[f.key] !== undefined ? formValues[f.key] : (f.defaultValue !== undefined ? f.defaultValue : '')}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-ai"
            disabled={submitDisabled}
            onClick={runAnalysis}
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Running...</>
            ) : (
              <><i className="fas fa-rocket"></i> Run Analysis</>
            )}
          </button>
        </div>

        {error && (
          <div className="ai-error" style={{ marginTop: 16 }}>
            <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="ai-results" style={{ marginTop: 16 }}>
            <div className="ai-results-header">
              <div className="ai-results-title">
                <i className="fas fa-sparkles"></i> Result
              </div>
              <div className="ai-meta">
                {modelName && (
                  <span className="ai-model">
                    <i className="fas fa-microchip"></i> {modelName}
                  </span>
                )}
                {timestamp && (
                  <span className="ai-timestamp">
                    <i className="fas fa-clock"></i>{' '}
                    {new Date(timestamp).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="ai-results-body">
              {renderMarkdown(analysisText)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AICenter;
