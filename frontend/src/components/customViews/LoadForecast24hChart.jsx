import React, { useEffect, useState } from 'react';

export default function LoadForecast24hChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/load-forecast-24h', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#f87171', padding: 16 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading 24h forecast…</div>;

  const series = data.series || [];
  const maxVal = Math.max(...series.flatMap(s => [s.predictedMw, s.actualMw]), 1);
  const w = 720, h = 220, pad = 30;
  const xStep = (w - pad * 2) / Math.max(series.length - 1, 1);
  const yScale = (v) => h - pad - ((v / maxVal) * (h - pad * 2));

  const pathFor = (key) =>
    series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * xStep} ${yScale(d[key])}`).join(' ');

  return (
    <div data-testid="load-forecast-24h" style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, color: '#e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>24-Hour Load Forecast vs Actual</h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Accuracy: <strong style={{ color: '#34d399' }}>{data.summary.forecastAccuracyPct}%</strong> &middot;
          Peak: <strong>{data.summary.peakHour}</strong> @ {data.summary.peakActualMw} MW
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ background: '#020617', borderRadius: 8 }}>
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={pad} x2={w - pad} y1={yScale(maxVal * t)} y2={yScale(maxVal * t)}
                stroke="#1e293b" strokeDasharray="2,3" />
        ))}
        <path d={pathFor('predictedMw')} fill="none" stroke="#60a5fa" strokeWidth="2" />
        <path d={pathFor('actualMw')} fill="none" stroke="#fbbf24" strokeWidth="2" />
        {series.map((d, i) => (
          <g key={i}>
            <circle cx={pad + i * xStep} cy={yScale(d.predictedMw)} r="2.5" fill="#60a5fa" />
            <circle cx={pad + i * xStep} cy={yScale(d.actualMw)} r="2.5" fill="#fbbf24" />
          </g>
        ))}
        {series.filter((_, i) => i % 4 === 0).map((d, i) => (
          <text key={i} x={pad + series.indexOf(d) * xStep} y={h - 8}
                fill="#64748b" fontSize="10" textAnchor="middle">{d.hour}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
        <span><span style={{ color: '#60a5fa' }}>●</span> Predicted MW</span>
        <span><span style={{ color: '#fbbf24' }}>●</span> Actual MW</span>
        <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
          Total: {data.summary.totalActualMwh} / {data.summary.totalPredictedMwh} MWh
        </span>
      </div>
    </div>
  );
}
