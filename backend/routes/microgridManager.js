// Microgrid manager: islanding mode during outages.
const express = require('express');
const pool = require('../db');
const router = express.Router();

// POST /api/microgrid/island { microgrid_id }
router.post('/island', async (req, res) => {
  try {
    const { microgrid_id } = req.body || {};
    if (!microgrid_id) return res.status(400).json({ error: 'microgrid_id required' });

    const renewables = await pool.query(`SELECT SUM(current_output_mw) as mw FROM renewable_sources WHERE microgrid_id = $1`, [microgrid_id]).catch(() => ({ rows: [{ mw: 0 }] }));
    const batteries = await pool.query(`SELECT SUM(capacity_mwh) as mwh, SUM(soc_pct * capacity_mwh) / 100 as available_mwh FROM energy_storage WHERE microgrid_id = $1`, [microgrid_id]).catch(() => ({ rows: [{ mwh: 0, available_mwh: 0 }] }));
    const load = await pool.query(`SELECT AVG(load_mw) as mw FROM load_forecasting WHERE microgrid_id = $1 ORDER BY forecast_time DESC LIMIT 24`, [microgrid_id]).catch(() => ({ rows: [{ mw: 0 }] }));

    const genMw = Number(renewables.rows[0].mw || 0);
    const storageAvailMwh = Number(batteries.rows[0].available_mwh || 0);
    const avgLoadMw = Number(load.rows[0].mw || 0);
    const reserveHours = avgLoadMw > 0 ? storageAvailMwh / Math.max(avgLoadMw - genMw, 0.001) : null;

    const plan = {
      microgrid_id,
      generation_mw: genMw,
      storage_available_mwh: storageAvailMwh,
      avg_load_mw: avgLoadMw,
      net_deficit_mw: Math.max(0, avgLoadMw - genMw),
      hours_of_reserve: reserveHours != null ? Math.round(reserveHours * 100) / 100 : null,
      shed_priority: avgLoadMw > genMw + storageAvailMwh / 4 ? ['EV charging', 'HVAC pre-cool', 'non-essential lighting'] : [],
    };
    try {
      await pool.query(`INSERT INTO outage_management (microgrid_id, status, plan, created_at) VALUES ($1,'islanded',$2,NOW())`, [microgrid_id, JSON.stringify(plan)]);
    } catch {}
    return res.json({ status: 'islanded', plan });
  } catch (e) {
    return res.status(500).json({ error: 'island failed' });
  }
});

module.exports = router;
