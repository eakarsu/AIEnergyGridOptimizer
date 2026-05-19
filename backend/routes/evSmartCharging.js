// EV fleet smart charging: schedule to absorb solar / cheap hours.
const express = require('express');
const pool = require('../db');
const router = express.Router();

// POST /api/ev-smart-charging/plan { fleet:[{vehicle_id, soc_pct, target_pct, ready_by}], available_hours_kw:{hour:kw}, prices:{hour:cent_per_kwh} }
router.post('/plan', async (req, res) => {
  try {
    const { fleet = [], available_hours_kw = {}, prices = {} } = req.body || {};
    if (!Array.isArray(fleet) || !fleet.length) return res.status(400).json({ error: 'fleet[] required' });
    const plan = [];
    for (const v of fleet) {
      const needKwh = Math.max(0, (Number(v.target_pct) - Number(v.soc_pct)) / 100 * (Number(v.capacity_kwh) || 60));
      const readyHour = v.ready_by ? new Date(v.ready_by).getHours() : 8;
      const slots = Object.entries(prices)
        .map(([h, p]) => ({ hour: Number(h), price: Number(p), kw: Number(available_hours_kw[h] || 7) }))
        .filter(s => s.hour < readyHour)
        .sort((a, b) => a.price - b.price);
      let remaining = needKwh;
      const schedule = [];
      for (const s of slots) {
        if (remaining <= 0) break;
        const charge = Math.min(s.kw, remaining);
        schedule.push({ hour: s.hour, kw: charge, price_cents_per_kwh: s.price });
        remaining -= charge;
      }
      plan.push({ vehicle_id: v.vehicle_id, kwh_needed: needKwh, scheduled_kwh: needKwh - remaining, schedule });
    }
    return res.json({ vehicles: plan.length, plan });
  } catch (e) {
    return res.status(500).json({ error: 'plan failed' });
  }
});

module.exports = router;
