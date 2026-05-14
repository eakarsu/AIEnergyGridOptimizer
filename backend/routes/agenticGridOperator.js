// Agentic grid operator: real-time monitoring, auto-dispatch renewables /
// batteries / DR.
const express = require('express');
const pool = require('../db');
const { aiAnalyze } = require('../ai');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// POST /api/agentic-grid-operator/dispatch { region_id? }
router.post('/dispatch', aiRateLimiter, async (req, res) => {
  try {
    const { region_id } = req.body || {};
    const where = region_id ? 'WHERE region_id = $1' : '';
    const params = region_id ? [region_id] : [];

    const renewables = await pool.query(`SELECT id, type, capacity_mw, current_output_mw FROM renewable_sources ${where} LIMIT 200`, params).catch(() => ({ rows: [] }));
    const batteries = await pool.query(`SELECT id, capacity_mwh, soc_pct, max_discharge_mw FROM energy_storage ${where} LIMIT 100`, params).catch(() => ({ rows: [] }));
    const demand = await pool.query(`SELECT * FROM load_forecasting ${where} ORDER BY forecast_time DESC LIMIT 24`, params).catch(() => ({ rows: [] }));

    const system = 'You are a grid operator agent. Recommend dispatch actions for the next 1h. Output JSON {"renewables_set_mw":{id:mw},"battery_actions":{id:"charge|discharge|hold"},"dr_signals":[{program:"...",mw:num}],"notes":"..."}.';
    let plan;
    try {
      const raw = await aiAnalyze(system, JSON.stringify({ renewables: renewables.rows, batteries: batteries.rows, demand: demand.rows.slice(0, 6) }).slice(0, 6000));
      try { plan = JSON.parse((raw || '').match(/\{[\s\S]*\}/)?.[0] || raw); } catch { plan = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }
    try {
      await pool.query(`INSERT INTO ai_analyses (feature, record_id, response_text, ai_results) VALUES ('grid_operator_dispatch', $1, $2, $3)`, [region_id || null, JSON.stringify(plan).slice(0, 4000), plan]);
    } catch {}
    return res.json({ region_id: region_id || null, plan });
  } catch (e) {
    return res.status(500).json({ error: 'dispatch failed' });
  }
});

module.exports = router;
