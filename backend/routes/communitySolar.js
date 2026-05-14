// Community solar coordination: aggregated household solar + battery
// dispatch. v0 sums available capacity and recommends a dispatch schedule.
const express = require('express');
const pool = require('../db');
const router = express.Router();

// POST /api/community-solar/coordinate { community_id }
router.post('/coordinate', async (req, res) => {
  try {
    const { community_id } = req.body || {};
    if (!community_id) return res.status(400).json({ error: 'community_id required' });
    const houses = await pool.query(`SELECT * FROM renewable_sources WHERE community_id = $1`, [community_id]).catch(() => ({ rows: [] }));
    const batteries = await pool.query(`SELECT * FROM energy_storage WHERE community_id = $1`, [community_id]).catch(() => ({ rows: [] }));
    const totalSolarKw = houses.rows.reduce((a, b) => a + Number(b.capacity_mw || 0) * 1000, 0);
    const totalBatKwh = batteries.rows.reduce((a, b) => a + Number(b.capacity_mwh || 0) * 1000, 0);

    // Simple dispatch: midday charge batteries, evening discharge.
    const schedule = [];
    for (let h = 0; h < 24; h++) {
      if (h >= 10 && h <= 14) schedule.push({ hour: h, action: 'charge', mw: Math.round(totalSolarKw * 0.6 / 1000 * 100) / 100 });
      else if (h >= 18 && h <= 21) schedule.push({ hour: h, action: 'discharge', mw: Math.round(totalBatKwh * 0.4 / 1000 * 100) / 100 });
      else schedule.push({ hour: h, action: 'hold', mw: 0 });
    }
    return res.json({ community_id, household_count: houses.rows.length, battery_count: batteries.rows.length, total_solar_kw: totalSolarKw, total_battery_kwh: totalBatKwh, schedule });
  } catch (e) {
    return res.status(500).json({ error: 'coordinate failed' });
  }
});

module.exports = router;
