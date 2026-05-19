// DR auto-enroll: auto-enroll & dispatch during peak pricing.
const express = require('express');
const pool = require('../db');
const router = express.Router();

const PEAK_THRESHOLD_CPK = Number(process.env.DR_PEAK_THRESHOLD_CENTS || 18);

// POST /api/dr-auto-enroll/scan — check current prices, enroll eligible meters
router.post('/scan', async (req, res) => {
  try {
    const { current_price_cpk } = req.body || {};
    const price = Number(current_price_cpk);
    if (!Number.isFinite(price)) return res.status(400).json({ error: 'current_price_cpk required' });

    const meters = await pool.query(`SELECT id, customer_id FROM smart_meters WHERE dr_eligible = true LIMIT 1000`).catch(() => ({ rows: [] }));
    const enrolled = [];
    if (price >= PEAK_THRESHOLD_CPK) {
      for (const m of meters.rows.slice(0, 200)) {
        try {
          await pool.query(`INSERT INTO demand_response (meter_id, customer_id, event_at, signal, status) VALUES ($1,$2,NOW(),$3,'pending')`, [m.id, m.customer_id, `peak_${price}`]);
          enrolled.push({ meter_id: m.id, customer_id: m.customer_id });
        } catch {}
      }
    }
    return res.json({ price_cents: price, threshold: PEAK_THRESHOLD_CPK, enrolled_count: enrolled.length, sample: enrolled.slice(0, 10) });
  } catch (e) {
    return res.status(500).json({ error: 'scan failed' });
  }
});

module.exports = router;
