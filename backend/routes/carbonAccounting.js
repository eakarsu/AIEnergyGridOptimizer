// Carbon accounting: grid carbon intensity by region/time.
const express = require('express');
const pool = require('../db');
const router = express.Router();

// MTCO2e per MWh by source type (rough industry averages)
const EF = { coal: 0.95, gas: 0.45, oil: 0.7, nuclear: 0.012, solar: 0.05, wind: 0.011, hydro: 0.024 };

// GET /api/carbon-accounting/intensity?region_id=&hour=
router.get('/intensity', async (req, res) => {
  try {
    const { region_id, hour } = req.query;
    const mix = await pool.query(
      `SELECT type, SUM(current_output_mw) AS mw
       FROM renewable_sources
       ${region_id ? 'WHERE region_id = $1' : ''}
       GROUP BY type`,
      region_id ? [region_id] : []
    ).catch(() => ({ rows: [] }));

    const totals = {};
    let totalMw = 0;
    let weightedCo2 = 0;
    for (const row of mix.rows) {
      const t = (row.type || '').toLowerCase();
      const mw = Number(row.mw || 0);
      totals[t] = mw;
      totalMw += mw;
      weightedCo2 += mw * (EF[t] || 0.5);
    }
    const intensity = totalMw ? weightedCo2 / totalMw : null;
    return res.json({
      region_id: region_id || null,
      hour: hour ? Number(hour) : new Date().getUTCHours(),
      mix_mw: totals,
      total_mw: Math.round(totalMw),
      co2_intensity_mt_per_mwh: intensity != null ? Math.round(intensity * 1000) / 1000 : null,
    });
  } catch (e) {
    return res.status(500).json({ error: 'intensity failed' });
  }
});

module.exports = router;
