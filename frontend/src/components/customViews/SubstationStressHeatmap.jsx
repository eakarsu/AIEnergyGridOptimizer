import React, { useEffect, useState } from 'react';

const STRESS_COLORS = {
  low:      '#10b981',
  moderate: '#facc15',
  high:     '#f97316',
  critical: '#ef4444',
};

export default function SubstationStressHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/substation-stress-heatmap', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#f87171', padding: 16 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading heatmap…</div>;

  return (
    <div data-testid="substation-stress-heatmap" style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, color: '#e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Substation Stress Heatmap</h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Avg util: <strong>{data.summary.avgUtilizationPct}%</strong> &middot;
          Critical: <strong style={{ color: '#ef4444' }}>{data.summary.criticalCells}</strong> &middot;
          High: <strong style={{ color: '#f97316' }}>{data.summary.highStressCells}</strong>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 6, color: '#94a3b8' }}>Substation</th>
              {data.buckets.map(b => (
                <th key={b} style={{ padding: 6, color: '#94a3b8', textAlign: 'center' }}>{b}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.nodes.map(node => (
              <tr key={node.nodeId}>
                <td style={{ padding: 6, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                  <strong>{node.nodeId}</strong>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{node.location}</div>
                </td>
                {data.buckets.map(b => {
                  const cell = data.cells.find(c => c.nodeId === node.nodeId && c.timeBucket === b);
                  if (!cell) return <td key={b} />;
                  return (
                    <td key={b} style={{
                      background: STRESS_COLORS[cell.stress],
                      color: cell.stress === 'moderate' ? '#1f2937' : '#fff',
                      padding: '10px 6px', textAlign: 'center', borderRadius: 6,
                      fontWeight: 600, minWidth: 60,
                    }} title={`${cell.utilizationPct}% — ${cell.stress}`}>
                      {cell.utilizationPct}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12 }}>
        {Object.entries(STRESS_COLORS).map(([k, v]) => (
          <span key={k}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: v, borderRadius: 3, marginRight: 4, verticalAlign: 'middle' }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
