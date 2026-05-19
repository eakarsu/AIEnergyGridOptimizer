import React, { useState } from 'react';

export default function DispatchReportPdf() {
  const [status, setStatus] = useState('idle');
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState(null);

  const download = async () => {
    setStatus('loading'); setErr(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/custom-views/dispatch-report-pdf', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reportId = res.headers.get('X-Report-Id');
      const totalGen = res.headers.get('X-Total-Generation-Mw');
      const totalDr  = res.headers.get('X-Total-Dr-Mw');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `dispatch-report-${reportId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setMeta({ reportId, totalGen, totalDr, size: blob.size });
      setStatus('done');
    } catch (e) {
      setErr(e.message); setStatus('error');
    }
  };

  return (
    <div data-testid="dispatch-report-pdf" style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, color: '#e2e8f0',
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Dispatch Report (PDF)</h3>
      <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>
        Generates a printable grid dispatch report including top generating assets, active DR programs, and outages.
      </p>
      <button onClick={download} disabled={status === 'loading'} style={{
        background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px',
        borderRadius: 8, cursor: 'pointer', fontWeight: 600,
      }}>
        {status === 'loading' ? 'Generating…' : 'Download Dispatch PDF'}
      </button>
      {err && <div style={{ color: '#f87171', marginTop: 10 }}>Error: {err}</div>}
      {meta && (
        <div style={{ marginTop: 12, fontSize: 13, background: '#020617', padding: 10, borderRadius: 6 }}>
          <div><strong>Report ID:</strong> {meta.reportId}</div>
          <div><strong>Total Generation:</strong> {meta.totalGen} MW</div>
          <div><strong>Total DR:</strong> {meta.totalDr} MW</div>
          <div><strong>File size:</strong> {meta.size} bytes</div>
        </div>
      )}
    </div>
  );
}
