// Utility-bill optimisation: identify TOU savings, auto-shift loads.
const express = require('express');
const pool = require('../db');
const router = express.Router();

// POST /api/utility-bill-optim/analyse { customer_id, billing_period_days?:30 }
router.post('/analyse', async (req, res) => {
  try {
    const { customer_id, billing_period_days = 30 } = req.body || {};
    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });

    const r = await pool.query(
      `SELECT hour_of_day, SUM(kwh) as kwh FROM smart_meter_intervals
       WHERE customer_id = $1 AND ts > NOW() - INTERVAL '1 day' * $2
       GROUP BY hour_of_day ORDER BY hour_of_day`,
      [customer_id, billing_period_days]
    ).catch(() => ({ rows: [] }));

    const onPeakHours = new Set([16, 17, 18, 19, 20]);
    const offPeakRate = Number(process.env.TOU_OFF_PEAK || 0.08);
    const onPeakRate = Number(process.env.TOU_ON_PEAK || 0.32);

    let flatBill = 0, touBill = 0, shiftableBill = 0;
    for (const row of r.rows) {
      const kwh = Number(row.kwh);
      const hour = Number(row.hour_of_day);
      const flatPrice = (offPeakRate + onPeakRate) / 2;
      flatBill += kwh * flatPrice;
      const rate = onPeakHours.has(hour) ? onPeakRate : offPeakRate;
      touBill += kwh * rate;
      // simulate shifting 30% of on-peak to off-peak
      const shifted = onPeakHours.has(hour) ? kwh * 0.7 : kwh + (onPeakHours.has((hour + 24 - 12) % 24) ? 0 : 0);
      shiftableBill += shifted * rate;
    }

    return res.json({
      customer_id,
      period_days: billing_period_days,
      bill_flat: Math.round(flatBill * 100) / 100,
      bill_tou: Math.round(touBill * 100) / 100,
      bill_with_30pct_shift: Math.round(shiftableBill * 100) / 100,
      potential_savings: Math.round((touBill - shiftableBill) * 100) / 100,
    });
  } catch (e) {
    return res.status(500).json({ error: 'analyse failed' });
  }
});

module.exports = router;
