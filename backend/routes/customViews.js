// Custom Views API: domain-specific endpoints for grid optimization
// 1) GET /load-forecast-24h            - VIZ 1: 24h load forecast vs actual
// 2) GET /substation-stress-heatmap    - VIZ 2: substation/region stress heatmap
// 3) GET /dispatch-report-pdf          - NON-VIZ 1: dispatch report PDF
// 4) GET /demand-response-rules        - NON-VIZ 2: list price tiers & peak windows
//    POST /demand-response-rules
//    PUT  /demand-response-rules/:id
//    DELETE /demand-response-rules/:id

const express = require('express');
const router = express.Router();
const pool = require('../db');

// In-memory store for DR rules (price tiers + peak windows)
let drRulesIdCounter = 6;
let demandResponseRules = [
  { id: 1, tierName: 'Off-Peak',  pricePerKwh: 0.08, peakWindowStart: '00:00', peakWindowEnd: '06:00', priority: 'low',      active: true },
  { id: 2, tierName: 'Mid-Peak',  pricePerKwh: 0.14, peakWindowStart: '06:00', peakWindowEnd: '12:00', priority: 'medium',   active: true },
  { id: 3, tierName: 'On-Peak',   pricePerKwh: 0.28, peakWindowStart: '12:00', peakWindowEnd: '18:00', priority: 'high',     active: true },
  { id: 4, tierName: 'Critical',  pricePerKwh: 0.45, peakWindowStart: '18:00', peakWindowEnd: '21:00', priority: 'critical', active: true },
  { id: 5, tierName: 'Shoulder',  pricePerKwh: 0.11, peakWindowStart: '21:00', peakWindowEnd: '24:00', priority: 'low',      active: true },
];

// ─── VIZ 1: 24h load forecast vs actual ───
router.get('/load-forecast-24h', async (req, res) => {
  try {
    let regions = [];
    try {
      const r = await pool.query(
        `SELECT region, current_load_mw, predicted_load_mw, confidence
         FROM load_forecasts ORDER BY current_load_mw DESC LIMIT 6`
      );
      regions = r.rows;
    } catch (_e) { regions = []; }
    if (regions.length === 0) {
      regions = [
        { region: 'New York City, NY', current_load_mw: 11200, predicted_load_mw: 11850, confidence: 0.94 },
        { region: 'Houston, TX',        current_load_mw: 9500,  predicted_load_mw: 10200, confidence: 0.93 },
        { region: 'Los Angeles, CA',    current_load_mw: 8900,  predicted_load_mw: 9300,  confidence: 0.91 },
      ];
    }

    // 24 hourly buckets, shape demand: low overnight, peak 17-20
    const hours = [];
    for (let h = 0; h < 24; h++) {
      let factor;
      if (h < 6) factor = 0.55 + (h * 0.02);
      else if (h < 12) factor = 0.70 + ((h - 6) * 0.035);
      else if (h < 17) factor = 0.85 + ((h - 12) * 0.025);
      else if (h < 21) factor = 1.00 - ((h - 17) * 0.04);
      else factor = 0.80 - ((h - 21) * 0.06);

      const base = regions.reduce((s, r) => s + Number(r.current_load_mw || 0), 0) / regions.length || 7000;
      const predicted = +(base * factor * 1.04).toFixed(1);
      const actual = +(base * factor * (0.96 + ((h * 7) % 9) / 100)).toFixed(1);

      hours.push({
        hour: `${String(h).padStart(2, '0')}:00`,
        predictedMw: predicted,
        actualMw: actual,
        deviationMw: +(actual - predicted).toFixed(1),
        deviationPct: +(((actual - predicted) / predicted) * 100).toFixed(2),
      });
    }

    const totalPred = hours.reduce((s, h) => s + h.predictedMw, 0);
    const totalAct  = hours.reduce((s, h) => s + h.actualMw, 0);
    const peakHour  = hours.reduce((a, b) => (b.actualMw > a.actualMw ? b : a));

    res.json({
      window: '24h',
      regionsSampled: regions.map(r => r.region),
      summary: {
        totalPredictedMwh: +totalPred.toFixed(1),
        totalActualMwh: +totalAct.toFixed(1),
        forecastAccuracyPct: +((1 - Math.abs(totalAct - totalPred) / totalPred) * 100).toFixed(2),
        peakHour: peakHour.hour,
        peakActualMw: peakHour.actualMw,
      },
      series: hours,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── VIZ 2: substation/region stress heatmap ───
router.get('/substation-stress-heatmap', async (req, res) => {
  try {
    let nodes = [];
    try {
      const r = await pool.query(
        `SELECT node_id, location, capacity_mw, voltage_level, status
         FROM grid_topology WHERE node_type = 'substation' OR node_type ILIKE '%sub%'
         ORDER BY capacity_mw DESC LIMIT 12`
      );
      nodes = r.rows;
    } catch (_e) { nodes = []; }
    if (nodes.length === 0) {
      nodes = [
        { node_id: 'SUB-001', location: 'Houston, TX',     capacity_mw: 2500, voltage_level: 345, status: 'online' },
        { node_id: 'SUB-002', location: 'Dallas, TX',      capacity_mw: 1800, voltage_level: 345, status: 'online' },
        { node_id: 'SUB-003', location: 'Phoenix, AZ',     capacity_mw: 2200, voltage_level: 500, status: 'online' },
        { node_id: 'SUB-004', location: 'Chicago, IL',     capacity_mw: 3000, voltage_level: 345, status: 'online' },
        { node_id: 'SUB-005', location: 'New York, NY',    capacity_mw: 2800, voltage_level: 345, status: 'online' },
        { node_id: 'SUB-006', location: 'Los Angeles, CA', capacity_mw: 2600, voltage_level: 500, status: 'online' },
      ];
    }

    // Heatmap grid: substations x 6 time-of-day buckets
    const buckets = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
    const cells = [];
    nodes.forEach((n, i) => {
      buckets.forEach((b, j) => {
        const baseLoad = Number(n.capacity_mw) * (0.45 + ((i + j * 2) % 5) * 0.10);
        const utilization = +((baseLoad / Number(n.capacity_mw)) * 100).toFixed(1);
        let stress;
        if (utilization < 60) stress = 'low';
        else if (utilization < 78) stress = 'moderate';
        else if (utilization < 90) stress = 'high';
        else stress = 'critical';
        cells.push({
          nodeId: n.node_id,
          location: n.location,
          timeBucket: b,
          loadMw: +baseLoad.toFixed(1),
          capacityMw: Number(n.capacity_mw),
          utilizationPct: utilization,
          stress,
        });
      });
    });

    const criticalCount = cells.filter(c => c.stress === 'critical').length;
    const highCount = cells.filter(c => c.stress === 'high').length;

    res.json({
      buckets,
      nodes: nodes.map(n => ({ nodeId: n.node_id, location: n.location, capacityMw: Number(n.capacity_mw) })),
      cells,
      summary: {
        totalCells: cells.length,
        criticalCells: criticalCount,
        highStressCells: highCount,
        avgUtilizationPct: +((cells.reduce((s, c) => s + c.utilizationPct, 0) / cells.length)).toFixed(1),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NON-VIZ 1: dispatch report PDF ───
router.get('/dispatch-report-pdf', async (req, res) => {
  try {
    let renewables = [];
    let dr = [];
    let outages = [];
    try {
      const r1 = await pool.query(
        `SELECT name, type, capacity_mw, current_output_mw, status
         FROM renewable_sources WHERE status IN ('online','active') ORDER BY current_output_mw DESC LIMIT 8`
      );
      renewables = r1.rows;
      const r2 = await pool.query(
        `SELECT program_name, reduction_mw, status FROM demand_response WHERE status = 'active' LIMIT 5`
      );
      dr = r2.rows;
      const r3 = await pool.query(
        `SELECT area, affected_customers, cause, status FROM outage_management WHERE status = 'active' LIMIT 5`
      );
      outages = r3.rows;
    } catch (_e) { /* fallback empty */ }

    const totalGen = renewables.reduce((s, r) => s + Number(r.current_output_mw || 0), 0);
    const totalDr  = dr.reduce((s, r) => s + Number(r.reduction_mw || 0), 0);
    const reportId = `DSP-${Date.now().toString().slice(-8)}`;
    const generatedAt = new Date().toISOString();

    // Minimal valid PDF (single-page text) — no extra dependency
    const escape = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const lines = [
      'AI Energy Grid Optimizer - Dispatch Report',
      `Report ID: ${reportId}`,
      `Generated: ${generatedAt}`,
      '',
      `Total Renewable Generation: ${totalGen.toFixed(1)} MW`,
      `Total DR Reduction:         ${totalDr.toFixed(1)} MW`,
      `Active Outages:             ${outages.length}`,
      '',
      'Top Generating Assets:',
      ...renewables.slice(0, 5).map((r, i) =>
        `  ${i + 1}. ${r.name} (${r.type}) - ${Number(r.current_output_mw).toFixed(0)} / ${Number(r.capacity_mw).toFixed(0)} MW`
      ),
      '',
      'Active DR Programs:',
      ...dr.slice(0, 5).map((p, i) => `  ${i + 1}. ${p.program_name} - ${Number(p.reduction_mw).toFixed(0)} MW`),
    ];

    let textStream = 'BT /F1 11 Tf 50 760 Td 14 TL\n';
    lines.forEach((ln, i) => {
      if (i === 0) textStream += `(${escape(ln)}) Tj\n`;
      else textStream += `T* (${escape(ln)}) Tj\n`;
    });
    textStream += 'ET';

    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
    objects.push(`<< /Length ${textStream.length} >>\nstream\n${textStream}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => {
      pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const buffer = Buffer.from(pdf, 'binary');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="dispatch-report-${reportId}.pdf"`);
    res.setHeader('X-Report-Id', reportId);
    res.setHeader('X-Total-Generation-Mw', totalGen.toFixed(1));
    res.setHeader('X-Total-Dr-Mw', totalDr.toFixed(1));
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NON-VIZ 2: demand-response rules CRUD ───
router.get('/demand-response-rules', (req, res) => {
  res.json({
    rules: demandResponseRules,
    count: demandResponseRules.length,
    activeCount: demandResponseRules.filter(r => r.active).length,
  });
});

router.post('/demand-response-rules', (req, res) => {
  const b = req.body || {};
  if (!b.tierName || b.pricePerKwh == null) {
    return res.status(400).json({ error: 'tierName and pricePerKwh required' });
  }
  const rule = {
    id: drRulesIdCounter++,
    tierName: String(b.tierName),
    pricePerKwh: Number(b.pricePerKwh),
    peakWindowStart: b.peakWindowStart || '00:00',
    peakWindowEnd: b.peakWindowEnd || '00:00',
    priority: b.priority || 'medium',
    active: b.active !== undefined ? !!b.active : true,
  };
  demandResponseRules.push(rule);
  res.status(201).json(rule);
});

router.put('/demand-response-rules/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = demandResponseRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  demandResponseRules[idx] = { ...demandResponseRules[idx], ...req.body, id };
  res.json(demandResponseRules[idx]);
});

router.delete('/demand-response-rules/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = demandResponseRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const [removed] = demandResponseRules.splice(idx, 1);
  res.json({ message: 'Deleted', deleted: removed });
});

module.exports = router;
