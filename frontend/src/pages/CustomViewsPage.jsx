import React from 'react';
import LoadForecast24hChart from '../components/customViews/LoadForecast24hChart';
import SubstationStressHeatmap from '../components/customViews/SubstationStressHeatmap';
import DispatchReportPdf from '../components/customViews/DispatchReportPdf';
import DemandResponseRulesEditor from '../components/customViews/DemandResponseRulesEditor';

export default function CustomViewsPage() {
  return (
    <div style={{ padding: 24, background: '#020617', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#e2e8f0', margin: 0, fontSize: 24 }}>
          <i className="fas fa-th" style={{ marginRight: 10, color: '#60a5fa' }}></i>
          Grid Custom Views
        </h1>
        <p style={{ color: '#94a3b8', margin: '6px 0 0' }}>
          Domain dashboards for load forecasting, substation stress, dispatch reporting and DR pricing rules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <LoadForecast24hChart />
        <SubstationStressHeatmap />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <DispatchReportPdf />
        <DemandResponseRulesEditor />
      </div>
    </div>
  );
}
