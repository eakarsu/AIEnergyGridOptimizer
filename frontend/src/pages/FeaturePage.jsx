import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

const featureConfig = {
  load_forecasting: {
    label: 'Load Forecasting',
    icon: 'fa-chart-line',
    ai: true,
    endpoint: 'load-forecasting',
    columns: [
      { key: 'region', label: 'Region' },
      { key: 'currentLoadMw', label: 'Current Load (MW)' },
      { key: 'predictedLoadMw', label: 'Predicted Load (MW)' },
      { key: 'forecastTime', label: 'Forecast Time' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'status', label: 'Status' },
    ],
  },
  renewable_sources: {
    label: 'Renewable Sources',
    icon: 'fa-solar-panel',
    ai: false,
    endpoint: 'renewable-sources',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type' },
      { key: 'capacityMw', label: 'Capacity (MW)' },
      { key: 'currentOutputMw', label: 'Output (MW)' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status' },
      { key: 'efficiency', label: 'Efficiency' },
    ],
  },
  demand_response: {
    label: 'Demand Response',
    icon: 'fa-users',
    ai: false,
    endpoint: 'demand-response',
    columns: [
      { key: 'programName', label: 'Program' },
      { key: 'participantCount', label: 'Participants' },
      { key: 'reductionMw', label: 'Reduction (MW)' },
      { key: 'status', label: 'Status' },
      { key: 'startTime', label: 'Start' },
      { key: 'endTime', label: 'End' },
      { key: 'incentiveRate', label: 'Incentive Rate' },
    ],
  },
  fault_detection: {
    label: 'Fault Detection',
    icon: 'fa-exclamation-triangle',
    ai: true,
    endpoint: 'fault-detection',
    columns: [
      { key: 'faultType', label: 'Fault Type' },
      { key: 'location', label: 'Location' },
      { key: 'severity', label: 'Severity' },
      { key: 'detectedAt', label: 'Detected At' },
      { key: 'status', label: 'Status' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'affectedArea', label: 'Affected Area' },
    ],
  },
  energy_storage: {
    label: 'Energy Storage',
    icon: 'fa-battery-full',
    ai: false,
    endpoint: 'energy-storage',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type' },
      { key: 'capacityMwh', label: 'Capacity (MWh)' },
      { key: 'chargeLevel', label: 'Charge Level' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status' },
      { key: 'cycles', label: 'Cycles' },
    ],
  },
  power_flow: {
    label: 'Power Flow',
    icon: 'fa-project-diagram',
    ai: false,
    endpoint: 'power-flow',
    columns: [
      { key: 'lineId', label: 'Line ID' },
      { key: 'fromNode', label: 'From' },
      { key: 'toNode', label: 'To' },
      { key: 'powerMw', label: 'Power (MW)' },
      { key: 'voltageKv', label: 'Voltage (kV)' },
      { key: 'currentA', label: 'Current (A)' },
      { key: 'lossMw', label: 'Loss (MW)' },
      { key: 'status', label: 'Status' },
    ],
  },
  carbon_emissions: {
    label: 'Carbon Emissions',
    icon: 'fa-leaf',
    ai: false,
    endpoint: 'carbon-emissions',
    columns: [
      { key: 'source', label: 'Source' },
      { key: 'emissionType', label: 'Type' },
      { key: 'amountTons', label: 'Amount (tons)' },
      { key: 'recordedAt', label: 'Recorded At' },
      { key: 'reductionTarget', label: 'Target' },
      { key: 'status', label: 'Status' },
    ],
  },
  smart_meters: {
    label: 'Smart Meters',
    icon: 'fa-tachometer-alt',
    ai: true,
    endpoint: 'smart-meters',
    columns: [
      { key: 'meterId', label: 'Meter ID' },
      { key: 'location', label: 'Location' },
      { key: 'consumptionKwh', label: 'Consumption (kWh)' },
      { key: 'peakDemandKw', label: 'Peak Demand (kW)' },
      { key: 'status', label: 'Status' },
      { key: 'lastReading', label: 'Last Reading' },
      { key: 'anomalyScore', label: 'Anomaly Score' },
    ],
  },
  voltage_regulation: {
    label: 'Voltage Regulation',
    icon: 'fa-bolt',
    ai: false,
    endpoint: 'voltage-regulation',
    columns: [
      { key: 'substation', label: 'Substation' },
      { key: 'nominalKv', label: 'Nominal (kV)' },
      { key: 'actualKv', label: 'Actual (kV)' },
      { key: 'tapPosition', label: 'Tap Position' },
      { key: 'regulatorType', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'deviation', label: 'Deviation' },
    ],
  },
  outage_management: {
    label: 'Outage Management',
    icon: 'fa-power-off',
    ai: false,
    endpoint: 'outage-management',
    columns: [
      { key: 'outageId', label: 'Outage ID' },
      { key: 'area', label: 'Area' },
      { key: 'affectedCustomers', label: 'Customers Affected' },
      { key: 'cause', label: 'Cause' },
      { key: 'startTime', label: 'Start' },
      { key: 'estRestoration', label: 'Est. Restoration' },
      { key: 'status', label: 'Status' },
      { key: 'crewAssigned', label: 'Crew' },
    ],
  },
  energy_trading: {
    label: 'Energy Trading',
    icon: 'fa-exchange-alt',
    ai: true,
    endpoint: 'energy-trading',
    columns: [
      { key: 'tradeId', label: 'Trade ID' },
      { key: 'type', label: 'Type' },
      { key: 'energyMwh', label: 'Energy (MWh)' },
      { key: 'pricePerMwh', label: 'Price ($/MWh)' },
      { key: 'counterparty', label: 'Counterparty' },
      { key: 'tradedAt', label: 'Time' },
      { key: 'status', label: 'Status' },
      { key: 'market', label: 'Market' },
    ],
  },
  weather_impact: {
    label: 'Weather Impact',
    icon: 'fa-cloud-sun',
    ai: true,
    endpoint: 'weather-impact',
    columns: [
      { key: 'region', label: 'Region' },
      { key: 'weatherType', label: 'Weather' },
      { key: 'severity', label: 'Severity' },
      { key: 'impactOnGeneration', label: 'Gen. Impact' },
      { key: 'impactOnDemand', label: 'Demand Impact' },
      { key: 'forecastDate', label: 'Forecast Date' },
      { key: 'confidence', label: 'Confidence' },
    ],
  },
  maintenance_schedule: {
    label: 'Maintenance Scheduling',
    icon: 'fa-tools',
    ai: true,
    endpoint: 'maintenance-schedule',
    columns: [
      { key: 'assetName', label: 'Asset' },
      { key: 'assetType', label: 'Type' },
      { key: 'lastMaintenance', label: 'Last Maintenance' },
      { key: 'nextMaintenance', label: 'Next Maintenance' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'predictedFailureRisk', label: 'Failure Risk' },
    ],
  },
  feeder_capacity_queue: {
    label: 'Feeder Capacity Queue',
    icon: 'fa-stream',
    ai: false,
    endpoint: 'feeder-capacity-queue',
    columns: [
      { key: 'feederName', label: 'Feeder' },
      { key: 'substation', label: 'Substation' },
      { key: 'queuedMw', label: 'Queued MW' },
      { key: 'availableMw', label: 'Available MW' },
      { key: 'interconnectRequests', label: 'Requests' },
      { key: 'constraint', label: 'Constraint' },
      { key: 'status', label: 'Status' },
    ],
  },
  regulatory_compliance: {
    label: 'Regulatory Compliance',
    icon: 'fa-gavel',
    ai: false,
    endpoint: 'regulatory-compliance',
    columns: [
      { key: 'regulationName', label: 'Regulation' },
      { key: 'authority', label: 'Authority' },
      { key: 'complianceStatus', label: 'Status' },
      { key: 'deadline', label: 'Deadline' },
      { key: 'penaltyRisk', label: 'Penalty Risk' },
      { key: 'lastAudit', label: 'Last Audit' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  grid_topology: {
    label: 'Grid Topology',
    icon: 'fa-network-wired',
    ai: false,
    endpoint: 'grid-topology',
    columns: [
      { key: 'nodeId', label: 'Node ID' },
      { key: 'nodeType', label: 'Type' },
      { key: 'capacityMw', label: 'Capacity (MW)' },
      { key: 'connectedNodes', label: 'Connected Nodes' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status' },
      { key: 'voltageLevel', label: 'Voltage (kV)' },
    ],
  },
};

const statusColors = {
  active: 'status-green',
  online: 'status-green',
  resolved: 'status-blue',
  completed: 'status-blue',
  critical: 'status-red',
  high: 'status-orange',
  medium: 'status-yellow',
  low: 'status-green',
  investigating: 'status-purple',
  pending: 'status-purple',
  scheduled: 'status-cyan',
  maintenance: 'status-cyan',
  buy: 'status-green',
  sell: 'status-red',
  compliant: 'status-green',
  'non-compliant': 'status-red',
  partial: 'status-yellow',
  inactive: 'status-gray',
  offline: 'status-gray',
};

function getStatusClass(value) {
  if (!value) return '';
  const key = String(value).toLowerCase().trim();
  return statusColors[key] || '';
}

function formatValue(value, colKey) {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'object' && Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const str = String(value);

  // Date fields
  const lowerKey = colKey ? colKey.toLowerCase() : '';
  if (
    colKey &&
    (lowerKey.includes('time') ||
      lowerKey.includes('date') ||
      lowerKey === 'detectedat' ||
      lowerKey === 'recordedat' ||
      lowerKey === 'tradedat' ||
      lowerKey === 'estrestoration' ||
      lowerKey.includes('maintenance') ||
      lowerKey.includes('deadline') ||
      lowerKey.includes('audit') ||
      lowerKey.includes('reading'))
  ) {
    const d = new Date(str);
    if (!isNaN(d.getTime()) && str.length > 8) {
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  // Percentage / confidence
  if (
    colKey &&
    (lowerKey.includes('confidence') ||
      lowerKey.includes('efficiency') ||
      lowerKey.includes('charge') ||
      lowerKey.includes('risk') ||
      lowerKey.includes('deviation') ||
      lowerKey.includes('anomaly'))
  ) {
    const num = parseFloat(str);
    if (!isNaN(num)) {
      if (num <= 1 && num >= 0) return `${(num * 100).toFixed(1)}%`;
      return `${num.toFixed(1)}%`;
    }
  }

  // Numbers
  const num = parseFloat(str);
  if (!isNaN(num) && str.match(/^\d+(\.\d+)?$/)) {
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return str;
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
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

  const parseBold = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={idx} className="ai-h3">
          {parseBold(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={idx} className="ai-h2">
          {parseBold(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={idx} className="ai-h1">
          {parseBold(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
    } else {
      flushList();
      elements.push(
        <p key={idx} className="ai-paragraph">
          {parseBold(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

function FeaturePage() {
  const { featureKey } = useParams();
  const config = featureConfig[featureKey];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({});
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const token = localStorage.getItem('token');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    if (config) {
      setPage(1);
      fetchItems(1);
    }
    // Reset state on feature change
    setSelectedItem(null);
    setEditMode(false);
    setShowCreate(false);
    setShowAI(false);
    setAiResult(null);
    setAiError('');
  }, [featureKey]);

  useEffect(() => {
    if (config) fetchItems(page);
  }, [page]);

  const fetchItems = async (p = page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${config.endpoint}?page=${p}&limit=${limit}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
          setTotal(data.length);
          setTotalPages(1);
        } else {
          setItems(data.data || []);
          setTotal(data.pagination?.total || 0);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`/api/${config.endpoint}/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setItems(items.filter((item) => (item._id || item.id) !== id));
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUpdate = async () => {
    const id = selectedItem._id || selectedItem.id;
    try {
      const res = await fetch(`/api/${config.endpoint}/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        const updatedItem = updated.data || updated;
        setItems(items.map((item) => ((item._id || item.id) === id ? updatedItem : item)));
        setSelectedItem(updatedItem);
        setEditMode(false);
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/${config.endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createData),
      });
      if (res.ok) {
        const created = await res.json();
        const newItem = created.data || created;
        setItems([...items, newItem]);
        setShowCreate(false);
        setCreateData({});
      }
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const body = {};
      if (aiPrompt.trim()) body.prompt = aiPrompt.trim();
      const res = await fetch(`/api/${config.endpoint}/ai/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      } else {
        const err = await res.json();
        setAiError(err.message || 'AI analysis failed');
      }
    } catch (err) {
      setAiError('Failed to connect to AI service');
    } finally {
      setAiLoading(false);
    }
  };

  const getInputType = (colKey) => {
    const key = colKey.toLowerCase();
    if (
      key.includes('time') ||
      key.includes('date') ||
      key === 'detectedat' ||
      key === 'recordedat' ||
      key === 'tradedat' ||
      key.includes('maintenance') ||
      key.includes('deadline') ||
      key.includes('audit') ||
      key.includes('reading') ||
      key === 'estrestoration'
    )
      return 'datetime-local';
    if (
      key.includes('mw') ||
      key.includes('kv') ||
      key.includes('kw') ||
      key.includes('kwh') ||
      key.includes('capacity') ||
      key.includes('load') ||
      key.includes('output') ||
      key.includes('power') ||
      key.includes('voltage') ||
      key.includes('current') ||
      key.includes('loss') ||
      key.includes('amount') ||
      key.includes('participant') ||
      key.includes('customer') ||
      key.includes('cycles') ||
      key.includes('consumption') ||
      key.includes('demand') ||
      key.includes('tap') ||
      key.includes('price') ||
      key.includes('energy') ||
      key.includes('confidence') ||
      key.includes('efficiency') ||
      key.includes('charge') ||
      key.includes('risk') ||
      key.includes('deviation') ||
      key.includes('anomaly') ||
      key.includes('impact') ||
      key.includes('incentive') ||
      key.includes('reduction') ||
      key.includes('target')
    )
      return 'number';
    return 'text';
  };

  const isSelectField = (colKey) => {
    const key = colKey.toLowerCase();
    return key === 'status' || key === 'compliancestatus' || key === 'type' || key === 'emissiontype' || key === 'regulatortype' || key === 'nodetype' || key === 'assettype' || key === 'severity' || key === 'priority';
  };

  const getSelectOptions = (colKey) => {
    const key = colKey.toLowerCase();
    if (key === 'status' || key === 'compliancestatus')
      return ['active', 'inactive', 'online', 'offline', 'resolved', 'completed', 'critical', 'investigating', 'pending', 'scheduled', 'maintenance', 'compliant', 'non-compliant', 'partial'];
    if (key === 'severity') return ['low', 'medium', 'high', 'critical'];
    if (key === 'priority') return ['low', 'medium', 'high', 'critical'];
    if (key === 'type' || key === 'emissiontype' || key === 'regulatortype' || key === 'nodetype' || key === 'assettype') {
      if (featureKey === 'renewable_sources') return ['solar', 'wind', 'hydro', 'geothermal'];
      if (featureKey === 'energy_storage') return ['lithium-ion', 'flow', 'pumped-hydro', 'compressed-air', 'flywheel'];
      if (featureKey === 'energy_trading') return ['buy', 'sell'];
      if (featureKey === 'maintenance_schedule') return ['transformer', 'circuit-breaker', 'transmission-line', 'generator', 'substation'];
      if (featureKey === 'carbon_emissions') return ['CO2', 'methane', 'NOx', 'SO2'];
      if (featureKey === 'voltage_regulation') return ['step', 'induction', 'electronic', 'autotransformer'];
      if (featureKey === 'grid_topology') return ['substation', 'transformer', 'junction', 'generator'];
      return ['type-a', 'type-b'];
    }
    return [];
  };

  if (!config) {
    return (
      <div className="feature-page">
        <div className="empty-state">
          <i className="fas fa-exclamation-circle"></i>
          <h2>Feature not found</h2>
          <p>The requested feature does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            <i className={`fas ${config.icon}`}></i> {config.label}
          </h1>
          <span className="item-count">{total > 0 ? `${total} items` : `${items.length} items`}</span>
        </div>
        <div className="page-header-actions">
          {config.ai && (
            <button
              className="btn btn-ai"
              onClick={() => setShowAI(true)}
            >
              <i className="fas fa-brain"></i> AI Analysis
            </button>
          )}
          <button className="btn btn-success" onClick={() => {
            setCreateData({});
            setShowCreate(true);
          }}>
            <i className="fas fa-plus"></i> Add New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading data...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <i className={`fas ${config.icon}`}></i>
          <h2>No data yet</h2>
          <p>Click "Add New" to create your first entry.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item._id || item.id || idx}
                  onClick={() => {
                    setSelectedItem(item);
                    setEditMode(false);
                  }}
                  className="clickable-row"
                >
                  {config.columns.map((col) => {
                    const val = item[col.key];
                    const statusClass = col.key === 'status' || col.key === 'complianceStatus' || col.key === 'severity' || col.key === 'priority'
                      ? getStatusClass(val) : '';
                    return (
                      <td key={col.key}>
                        {statusClass ? (
                          <span className={`status-badge ${statusClass}`}>
                            {formatValue(val, col.key)}
                          </span>
                        ) : (
                          formatValue(val, col.key)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <i className="fas fa-chevron-left"></i> Prev
              </button>
              <span style={{ padding: '0 12px' }}>
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className={`fas ${config.icon}`}></i>{' '}
                {editMode ? 'Edit Item' : 'Item Details'}
              </h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {editMode ? (
                <div className="form-grid">
                  {config.columns.map((col) => (
                    <div key={col.key} className="form-group">
                      <label>{col.label}</label>
                      {isSelectField(col.key) ? (
                        <select
                          value={editData[col.key] || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, [col.key]: e.target.value })
                          }
                        >
                          <option value="">Select...</option>
                          {getSelectOptions(col.key).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={getInputType(col.key)}
                          value={editData[col.key] || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, [col.key]: e.target.value })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="detail-grid">
                  {config.columns.map((col) => {
                    const val = selectedItem[col.key];
                    const statusClass = col.key === 'status' || col.key === 'complianceStatus' || col.key === 'severity' || col.key === 'priority'
                      ? getStatusClass(val) : '';
                    return (
                      <div key={col.key} className="detail-item">
                        <div className="detail-label">{col.label}</div>
                        <div className="detail-value">
                          {statusClass ? (
                            <span className={`status-badge ${statusClass}`}>
                              {formatValue(val, col.key)}
                            </span>
                          ) : (
                            formatValue(val, col.key)
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Show extra fields not in columns */}
                  {Object.keys(selectedItem)
                    .filter(
                      (k) =>
                        k !== '_id' &&
                        k !== 'id' &&
                        k !== '__v' &&
                        k !== 'createdAt' &&
                        k !== 'updatedAt' &&
                        !config.columns.find((c) => c.key === k)
                    )
                    .map((k) => (
                      <div key={k} className="detail-item">
                        <div className="detail-label">{k}</div>
                        <div className="detail-value">
                          {formatValue(selectedItem[k], k)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {editMode ? (
                <>
                  <button className="btn btn-primary" onClick={handleUpdate}>
                    <i className="fas fa-save"></i> Save
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditData({ ...selectedItem });
                      setEditMode(true);
                    }}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() =>
                      handleDelete(selectedItem._id || selectedItem.id)
                    }
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-plus"></i> Add New {config.label}
              </h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid">
                  {config.columns.map((col) => (
                    <div key={col.key} className="form-group">
                      <label>{col.label}</label>
                      {isSelectField(col.key) ? (
                        <select
                          value={createData[col.key] || ''}
                          onChange={(e) =>
                            setCreateData({ ...createData, [col.key]: e.target.value })
                          }
                        >
                          <option value="">Select...</option>
                          {getSelectOptions(col.key).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={getInputType(col.key)}
                          value={createData[col.key] || ''}
                          onChange={(e) =>
                            setCreateData({ ...createData, [col.key]: e.target.value })
                          }
                          placeholder={col.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-success">
                  <i className="fas fa-check"></i> Create
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Analysis Panel */}
      {showAI && (
        <div className="modal-overlay" onClick={() => setShowAI(false)}>
          <div className="modal modal-ai" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header-ai">
              <h2>
                <i className="fas fa-brain"></i> AI Analysis - {config.label}
              </h2>
              <button className="modal-close" onClick={() => setShowAI(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="ai-prompt-section">
                <label>Custom Prompt (optional)</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`Ask AI anything about your ${config.label.toLowerCase()} data...`}
                  rows={3}
                />
                <button
                  className="btn btn-ai"
                  onClick={handleAIAnalysis}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-rocket"></i> Run Analysis
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="ai-error">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>{aiError}</span>
                </div>
              )}

              {aiResult && (
                <div className="ai-results">
                  <div className="ai-results-header">
                    <div className="ai-results-title">
                      <i className="fas fa-sparkles"></i> Analysis Results
                    </div>
                    {aiResult.model && (
                      <div className="ai-meta">
                        <span className="ai-model">
                          <i className="fas fa-microchip"></i> {aiResult.model}
                        </span>
                        <span className="ai-timestamp">
                          <i className="fas fa-clock"></i>{' '}
                          {new Date(aiResult.timestamp || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ai-results-body">
                    {renderMarkdown(aiResult.analysis || aiResult.result || aiResult.message || JSON.stringify(aiResult, null, 2))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeaturePage;
