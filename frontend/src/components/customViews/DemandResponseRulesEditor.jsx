import React, { useEffect, useState } from 'react';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function DemandResponseRulesEditor() {
  const [rules, setRules] = useState([]);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({
    tierName: '', pricePerKwh: '', peakWindowStart: '00:00', peakWindowEnd: '06:00', priority: 'medium', active: true,
  });

  const token = () => localStorage.getItem('token');
  const auth = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  const load = async () => {
    try {
      const r = await fetch('/api/custom-views/demand-response-rules', { headers: auth() });
      const d = await r.json();
      setRules(d.rules || []);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/custom-views/demand-response-rules', {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ ...form, pricePerKwh: parseFloat(form.pricePerKwh) }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setForm({ tierName: '', pricePerKwh: '', peakWindowStart: '00:00', peakWindowEnd: '06:00', priority: 'medium', active: true });
      load();
    } catch (e) { setErr(e.message); }
  };

  const toggle = async (rule) => {
    await fetch(`/api/custom-views/demand-response-rules/${rule.id}`, {
      method: 'PUT', headers: auth(), body: JSON.stringify({ active: !rule.active }),
    });
    load();
  };

  const remove = async (id) => {
    await fetch(`/api/custom-views/demand-response-rules/${id}`, { method: 'DELETE', headers: auth() });
    load();
  };

  return (
    <div data-testid="dr-rules-editor" style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, color: '#e2e8f0',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Demand-Response Rules Editor</h3>

      <form onSubmit={create} style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto', gap: 8, marginBottom: 14,
      }}>
        <input required placeholder="Tier name" value={form.tierName}
               onChange={e => setForm({ ...form, tierName: e.target.value })}
               style={inputStyle} />
        <input required type="number" step="0.01" placeholder="$/kWh" value={form.pricePerKwh}
               onChange={e => setForm({ ...form, pricePerKwh: e.target.value })}
               style={inputStyle} />
        <input type="time" value={form.peakWindowStart}
               onChange={e => setForm({ ...form, peakWindowStart: e.target.value })}
               style={inputStyle} />
        <input type="time" value={form.peakWindowEnd}
               onChange={e => setForm({ ...form, peakWindowEnd: e.target.value })}
               style={inputStyle} />
        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.active}
                 onChange={e => setForm({ ...form, active: e.target.checked })} />
          Active
        </label>
        <button type="submit" style={btnStyle}>Add Rule</button>
      </form>

      {err && <div style={{ color: '#f87171', marginBottom: 10 }}>Error: {err}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
            <th style={th}>Tier</th>
            <th style={th}>$/kWh</th>
            <th style={th}>Peak Window</th>
            <th style={th}>Priority</th>
            <th style={th}>Active</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={td}>{r.tierName}</td>
              <td style={td}>${Number(r.pricePerKwh).toFixed(3)}</td>
              <td style={td}>{r.peakWindowStart} – {r.peakWindowEnd}</td>
              <td style={td}><span style={priorityPill(r.priority)}>{r.priority}</span></td>
              <td style={td}>
                <button onClick={() => toggle(r)} style={{
                  ...btnSmall, background: r.active ? '#10b981' : '#475569',
                }}>{r.active ? 'On' : 'Off'}</button>
              </td>
              <td style={td}>
                <button onClick={() => remove(r.id)} style={{ ...btnSmall, background: '#dc2626' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle = {
  background: '#020617', border: '1px solid #1e293b', color: '#e2e8f0',
  padding: '8px 10px', borderRadius: 6, fontSize: 13,
};
const btnStyle = {
  background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px',
  borderRadius: 6, cursor: 'pointer', fontWeight: 600,
};
const btnSmall = {
  color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4,
  cursor: 'pointer', fontSize: 12, marginRight: 6,
};
const th = { padding: '8px 6px' };
const td = { padding: '8px 6px' };
const priorityPill = (p) => ({
  background: { low: '#10b981', medium: '#facc15', high: '#f97316', critical: '#ef4444' }[p] || '#64748b',
  color: p === 'medium' ? '#1f2937' : '#fff',
  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
});
