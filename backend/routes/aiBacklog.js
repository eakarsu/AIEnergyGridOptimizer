/**
 * Mechanical backlog AI endpoints (apply pass 4):
 * - POST /api/ai/demand-forecast       (short-horizon load forecast)
 * - POST /api/ai/battery-scheduling    (battery dispatch schedule)
 *
 * Each endpoint returns 503 when OPENROUTER_API_KEY is missing so FE
 * can surface a clean "AI service not configured" message.
 */
const express = require('express');
const pool = require('../db');
const { aiAnalyze } = require('../ai');
const { aiRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Helper: persist AI analysis result (non-blocking) with ai_results JSONB cache
function persistAnalysis(pool, feature, recordId, promptSummary, responseText, model, userId, structured, tokensUsed, durationMs) {
  pool.query(
    `INSERT INTO ai_analyses (feature, record_id, prompt_summary, response_text, model_used, user_id, ai_results, tokens_used, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [feature, recordId, promptSummary, responseText, model, userId || null, structured || null, tokensUsed || null, durationMs || null]
  ).catch(err => console.error('[ai_analyses persist error]', err.message));
}

// Guard: 503 if no key configured
function requireApiKey(req, res, next) {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({
      error: 'AI service not configured',
      detail: 'OPENROUTER_API_KEY environment variable is not set. Configure it to enable AI analysis.'
    });
  }
  next();
}

// POST /api/ai/demand-forecast
// Body: { region?: string, horizon_hours?: number (1-72, default 24) }
// Reads recent load_forecasts + weather_impact rows, asks the model for a
// short-horizon JSON forecast.
router.post('/ai/demand-forecast', aiRateLimiter, requireApiKey, async (req, res) => {
  try {
    const { region, horizon_hours } = req.body || {};
    const horizon = Number.isFinite(Number(horizon_hours)) ? Math.min(72, Math.max(1, Number(horizon_hours))) : 24;

    const params = [];
    let where = '';
    if (region && typeof region === 'string') {
      params.push(region);
      where = 'WHERE region = $1';
    }

    const loadResult = await pool.query(
      `SELECT * FROM load_forecasts ${where} ORDER BY forecast_time DESC LIMIT 50`,
      params
    );

    const weatherParams = [];
    let weatherWhere = '';
    if (region && typeof region === 'string') {
      weatherParams.push(region);
      weatherWhere = 'WHERE region = $1';
    }
    const weatherResult = await pool.query(
      `SELECT * FROM weather_impact ${weatherWhere} ORDER BY forecast_date DESC LIMIT 20`,
      weatherParams
    );

    const contextData = {
      region: region || 'ALL',
      horizon_hours: horizon,
      historical_load: loadResult.rows,
      weather_impacts: weatherResult.rows
    };

    const prompt = `You are an AI energy demand forecaster. Using the historical load
and weather impact data below, produce a ${horizon}-hour load forecast for
${region ? `region "${region}"` : 'the available regions'}.

Return your response as a JSON object with this exact shape (and prose
discussion below it is fine):
{
  "region": "<region>",
  "horizon_hours": ${horizon},
  "hourly_forecast": [
    { "hour_offset": 1, "predicted_load_mw": <number>, "confidence": <0-1> }
  ],
  "peak_hour_offset": <number>,
  "peak_load_mw": <number>,
  "risk_factors": ["..."],
  "recommended_actions": ["..."]
}

Historical and weather context: ${JSON.stringify(contextData)}`;

    const analysis = await aiAnalyze('load_forecasting', contextData, prompt);

    persistAnalysis(
      pool,
      'demand_forecast',
      region || null,
      `Demand forecast: region=${region || 'ALL'}, horizon=${horizon}h`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, region, horizon_hours: horizon },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      region: region || 'ALL',
      horizon_hours: horizon,
      records_used: { load: loadResult.rows.length, weather: weatherResult.rows.length },
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/battery-scheduling
// Body: { storage_id?: number|string, horizon_hours?: number (1-48, default 24) }
// Reads battery state(s) + recent load forecasts and trading prices to
// produce a dispatch schedule.
router.post('/ai/battery-scheduling', aiRateLimiter, requireApiKey, async (req, res) => {
  try {
    const { storage_id, horizon_hours } = req.body || {};
    const horizon = Number.isFinite(Number(horizon_hours)) ? Math.min(48, Math.max(1, Number(horizon_hours))) : 24;

    let batteryRows;
    if (storage_id !== undefined && storage_id !== null && storage_id !== '') {
      const r = await pool.query('SELECT * FROM energy_storage WHERE id = $1', [storage_id]);
      if (r.rows.length === 0) {
        return res.status(404).json({ error: `energy_storage record ${storage_id} not found` });
      }
      batteryRows = r.rows;
    } else {
      const r = await pool.query('SELECT * FROM energy_storage ORDER BY id DESC LIMIT 10');
      batteryRows = r.rows;
    }

    const [loadResult, tradingResult] = await Promise.all([
      pool.query('SELECT * FROM load_forecasts ORDER BY forecast_time DESC LIMIT 24'),
      pool.query('SELECT * FROM energy_trading ORDER BY traded_at DESC LIMIT 24')
    ]);

    const contextData = {
      horizon_hours: horizon,
      batteries: batteryRows,
      load_forecasts: loadResult.rows,
      recent_trades: tradingResult.rows
    };

    const prompt = `You are an AI battery dispatch optimizer. Build a ${horizon}-hour
charge/discharge schedule for the battery asset(s) below, using the load
forecasts and recent market prices for context. Optimize for: (a) avoiding
state-of-charge limits, (b) discharging into peak demand or high price
windows, (c) charging during low-price/off-peak windows.

Return JSON of this shape (followed by any free-form notes):
{
  "horizon_hours": ${horizon},
  "schedule": [
    {
      "battery_id": <number>,
      "hour_offset": <number 0-${horizon - 1}>,
      "action": "charge" | "discharge" | "idle",
      "power_mw": <number>,
      "expected_soc_pct": <0-100>,
      "rationale": "..."
    }
  ],
  "summary": {
    "total_charge_mwh": <number>,
    "total_discharge_mwh": <number>,
    "expected_revenue_usd": <number|null>,
    "risks": ["..."]
  }
}

Context: ${JSON.stringify(contextData)}`;

    const analysis = await aiAnalyze('energy_storage', contextData, prompt);

    persistAnalysis(
      pool,
      'battery_scheduling',
      storage_id ? String(storage_id) : null,
      `Battery dispatch schedule: storage_id=${storage_id || 'ALL'}, horizon=${horizon}h`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, storage_id, horizon_hours: horizon },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      storage_id: storage_id || 'ALL',
      horizon_hours: horizon,
      batteries_evaluated: batteryRows.length,
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// Apply pass 5 backlog endpoints (additive, MECHANICAL):
//   POST /api/ai/microgrid-optimization
//   POST /api/ai/outage-prediction
//   POST /api/ai/price-optimization
// All three: 503 + missing OPENROUTER_API_KEY when key absent.
// =====================================================================

// POST /api/ai/microgrid-optimization
// Body: { region?: string, horizon_hours?: number (1-48, default 12) }
// Reads renewable_sources + energy_storage + load_forecasts; produces an
// islanding/microgrid dispatch plan that prioritises self-sufficiency and
// reduces grid imports.
router.post('/ai/microgrid-optimization', aiRateLimiter, requireApiKey, async (req, res) => {
  try {
    const { region, horizon_hours } = req.body || {};
    const horizon = Number.isFinite(Number(horizon_hours)) ? Math.min(48, Math.max(1, Number(horizon_hours))) : 12;

    const params = [];
    let where = '';
    if (region && typeof region === 'string') {
      params.push(region);
      where = 'WHERE region = $1';
    }

    const [renewables, storage, loads] = await Promise.all([
      pool.query(`SELECT * FROM renewable_sources ${where} ORDER BY id DESC LIMIT 30`, params),
      pool.query('SELECT * FROM energy_storage ORDER BY id DESC LIMIT 20'),
      pool.query(`SELECT * FROM load_forecasts ${where} ORDER BY forecast_time DESC LIMIT 24`, params),
    ]);

    const contextData = {
      region: region || 'ALL',
      horizon_hours: horizon,
      renewable_sources: renewables.rows,
      energy_storage: storage.rows,
      load_forecasts: loads.rows,
    };

    const prompt = `You are an AI microgrid optimizer. Build a ${horizon}-hour
self-sufficiency plan for the microgrid below, balancing renewable supply,
storage state-of-charge and load forecasts. Prefer islanding (no grid import)
when feasible. Return JSON:
{
  "horizon_hours": ${horizon},
  "dispatch_plan": [
    { "hour_offset": 0-${horizon - 1}, "renewable_mw": <number>, "battery_action": "charge|discharge|idle", "battery_mw": <number>, "grid_import_mw": <number>, "rationale": "..." }
  ],
  "self_sufficiency_pct": <0-100>,
  "islanding_windows": [{ "from_hour": <int>, "to_hour": <int>, "reason": "..." }],
  "risks": ["..."]
}

Context: ${JSON.stringify(contextData)}`;

    const analysis = await aiAnalyze('microgrid_optimization', contextData, prompt);

    persistAnalysis(
      pool,
      'microgrid_optimization',
      null,
      `Microgrid optimization: region=${region || 'ALL'}, horizon=${horizon}h`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, region, horizon_hours: horizon },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      region: region || 'ALL',
      horizon_hours: horizon,
      records_used: { renewables: renewables.rows.length, storage: storage.rows.length, loads: loads.rows.length },
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/outage-prediction
// Body: { region?: string, horizon_hours?: number (1-72, default 24) }
// Reads recent outage_management, weather_impact, fault_detections, and
// maintenance_schedule rows; asks the model to project outage probabilities
// per asset/zone with mitigations.
router.post('/ai/outage-prediction', aiRateLimiter, requireApiKey, async (req, res) => {
  try {
    const { region, horizon_hours } = req.body || {};
    const horizon = Number.isFinite(Number(horizon_hours)) ? Math.min(72, Math.max(1, Number(horizon_hours))) : 24;

    const [outages, weather, faults, maint] = await Promise.all([
      pool.query('SELECT * FROM outage_management ORDER BY id DESC LIMIT 30'),
      pool.query('SELECT * FROM weather_impact ORDER BY id DESC LIMIT 30'),
      pool.query('SELECT * FROM fault_detections ORDER BY id DESC LIMIT 30'),
      pool.query('SELECT * FROM maintenance_schedule ORDER BY id DESC LIMIT 30'),
    ]);

    const contextData = {
      region: region || 'ALL',
      horizon_hours: horizon,
      recent_outages: outages.rows,
      weather_impact: weather.rows,
      fault_detections: faults.rows,
      maintenance_schedule: maint.rows,
    };

    const prompt = `You are an AI grid outage forecaster. Project outage
probabilities over the next ${horizon} hours using the recent operational
data below. Return JSON:
{
  "horizon_hours": ${horizon},
  "predictions": [
    { "asset_or_zone": "...", "probability": 0-1, "expected_window_iso": "...", "primary_drivers": ["..."], "mitigations": ["..."] }
  ],
  "overall_risk_level": "low|medium|high",
  "summary": "..."
}

Context: ${JSON.stringify(contextData)}`;

    const analysis = await aiAnalyze('outage_prediction', contextData, prompt);

    persistAnalysis(
      pool,
      'outage_prediction',
      null,
      `Outage prediction: region=${region || 'ALL'}, horizon=${horizon}h`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, region, horizon_hours: horizon },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      region: region || 'ALL',
      horizon_hours: horizon,
      records_used: { outages: outages.rows.length, weather: weather.rows.length, faults: faults.rows.length, maintenance: maint.rows.length },
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/price-optimization
// Body: { region?: string, horizon_hours?: number (1-48, default 24) }
// Reads recent energy_trading + load_forecasts + carbon_emissions; returns
// an hourly buy/sell/hold schedule with target price points.
router.post('/ai/price-optimization', aiRateLimiter, requireApiKey, async (req, res) => {
  try {
    const { region, horizon_hours } = req.body || {};
    const horizon = Number.isFinite(Number(horizon_hours)) ? Math.min(48, Math.max(1, Number(horizon_hours))) : 24;

    const [trades, loads, emissions] = await Promise.all([
      pool.query('SELECT * FROM energy_trading ORDER BY traded_at DESC LIMIT 48'),
      pool.query('SELECT * FROM load_forecasts ORDER BY forecast_time DESC LIMIT 48'),
      pool.query('SELECT * FROM carbon_emissions ORDER BY id DESC LIMIT 30'),
    ]);

    const contextData = {
      region: region || 'ALL',
      horizon_hours: horizon,
      recent_trades: trades.rows,
      load_forecasts: loads.rows,
      carbon_emissions: emissions.rows,
    };

    const prompt = `You are an AI energy price optimiser. Produce a ${horizon}-hour
buy/sell/hold schedule that maximises expected revenue while keeping
emissions exposure bounded. Return JSON:
{
  "horizon_hours": ${horizon},
  "schedule": [
    { "hour_offset": 0-${horizon - 1}, "action": "buy|sell|hold", "target_price_usd_per_mwh": <number>, "volume_mwh": <number>, "rationale": "..." }
  ],
  "expected_revenue_usd": <number>,
  "carbon_intensity_warning": "...",
  "summary": "..."
}

Context: ${JSON.stringify(contextData)}`;

    const analysis = await aiAnalyze('price_optimization', contextData, prompt);

    persistAnalysis(
      pool,
      'price_optimization',
      null,
      `Price optimization: region=${region || 'ALL'}, horizon=${horizon}h`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, region, horizon_hours: horizon },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      region: region || 'ALL',
      horizon_hours: horizon,
      records_used: { trades: trades.rows.length, loads: loads.rows.length, emissions: emissions.rows.length },
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
