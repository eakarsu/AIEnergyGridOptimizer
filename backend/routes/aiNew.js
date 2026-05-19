/**
 * New AI endpoints:
 * - POST /api/ai/predictive-maintenance-alert
 * - POST /api/ai/grid-health-summary
 * - POST /api/ai/energy-trading-strategy
 * - GET  /api/ai-analyses/:feature/:record_id
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

// POST /api/ai/predictive-maintenance-alert
// Fetches all maintenance_schedule records with predicted_failure_risk > 0.5
// Returns a prioritized list with urgency and recommended actions
router.post('/ai/predictive-maintenance-alert', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM maintenance_schedule WHERE predicted_failure_risk > 0.5 ORDER BY predicted_failure_risk DESC`
    );

    if (result.rows.length === 0) {
      return res.json({
        message: 'No high-risk assets found (predicted_failure_risk <= 0.5)',
        alerts: [],
        totalHighRiskAssets: 0
      });
    }

    const prompt = `You are an AI predictive maintenance specialist for energy grid infrastructure.
Analyze ALL ${result.rows.length} high-risk assets (predicted_failure_risk > 0.5) and provide:
1. Priority-ranked list of assets requiring immediate action (ranked by combined risk + impact)
2. Urgency level for each: CRITICAL (>0.85), HIGH (0.7-0.85), MEDIUM (0.5-0.7)
3. Specific recommended actions for each asset (inspection, repair, replacement, monitoring)
4. Estimated time windows before failure for top 5 critical assets
5. Resource allocation recommendation: which assets to address first given limited crew availability
6. Total risk exposure summary and overall grid maintenance health score

Assets Data: ${JSON.stringify(result.rows)}

Format response with clear sections per asset, prioritized from most to least urgent.`;

    const analysis = await aiAnalyze('maintenance_schedule', result.rows, prompt);

    persistAnalysis(
      pool, 'predictive_maintenance_alert', null,
      `Predictive maintenance alert for ${result.rows.length} high-risk assets`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, assets: result.rows.length },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      totalHighRiskAssets: result.rows.length,
      assets: result.rows,
      analysis
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/grid-health-summary
// Fetches aggregate stats from all 15 domains and generates executive grid health briefing
router.post('/ai/grid-health-summary', aiRateLimiter, async (req, res) => {
  try {
    const [
      loadForecasts, renewableSources, demandResponse, faultDetections,
      energyStorage, powerFlows, carbonEmissions, smartMeters,
      voltageRegulation, outageManagement, energyTrading, weatherImpact,
      maintenanceSchedule, regulatoryCompliance, gridTopology
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count, AVG(current_load_mw) as avg_load, AVG(predicted_load_mw) as avg_predicted FROM load_forecasts'),
      pool.query("SELECT COUNT(*) as count, SUM(current_output_mw) as total_output, SUM(capacity_mw) as total_capacity FROM renewable_sources WHERE status IN ('active', 'online')"),
      pool.query("SELECT COUNT(*) as count, SUM(reduction_mw) as total_reduction FROM demand_response WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE status = 'active') as active_faults, COUNT(*) FILTER (WHERE severity = 'critical') as critical_faults FROM fault_detections"),
      pool.query('SELECT COUNT(*) as count, AVG(charge_level) as avg_charge FROM energy_storage'),
      pool.query('SELECT COUNT(*) as count, SUM(power_mw) as total_power, SUM(loss_mw) as total_loss FROM power_flows'),
      pool.query('SELECT COUNT(*) as count, SUM(amount_tons) as total_emissions FROM carbon_emissions'),
      pool.query('SELECT COUNT(*) as count, AVG(anomaly_score) as avg_anomaly FROM smart_meters'),
      pool.query('SELECT COUNT(*) as count, AVG(deviation) as avg_deviation FROM voltage_regulation'),
      pool.query("SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE status = 'active') as active_outages, SUM(affected_customers) FILTER (WHERE status = 'active') as affected_customers FROM outage_management"),
      pool.query("SELECT COUNT(*) as count, SUM(energy_mwh * price_per_mwh) as total_value FROM energy_trading WHERE status = 'completed'"),
      pool.query("SELECT COUNT(*) as count, AVG(confidence) as avg_confidence FROM weather_impact"),
      pool.query("SELECT COUNT(*) as count, AVG(predicted_failure_risk) as avg_risk, COUNT(*) FILTER (WHERE predicted_failure_risk > 0.7) as high_risk_count FROM maintenance_schedule"),
      pool.query("SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE compliance_status = 'compliant') as compliant_count FROM regulatory_compliance"),
      pool.query("SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE status = 'active') as active_nodes FROM grid_topology")
    ]);

    const aggregateStats = {
      load_forecasting: loadForecasts.rows[0],
      renewable_sources: renewableSources.rows[0],
      demand_response: demandResponse.rows[0],
      fault_detection: faultDetections.rows[0],
      energy_storage: energyStorage.rows[0],
      power_flows: powerFlows.rows[0],
      carbon_emissions: carbonEmissions.rows[0],
      smart_meters: smartMeters.rows[0],
      voltage_regulation: voltageRegulation.rows[0],
      outage_management: outageManagement.rows[0],
      energy_trading: energyTrading.rows[0],
      weather_impact: weatherImpact.rows[0],
      maintenance_schedule: maintenanceSchedule.rows[0],
      regulatory_compliance: regulatoryCompliance.rows[0],
      grid_topology: gridTopology.rows[0]
    };

    const prompt = `You are an AI chief grid analyst. Generate a comprehensive executive briefing on the overall health of this energy grid based on aggregate statistics from all 15 operational domains.

Provide:
1. EXECUTIVE SUMMARY: Overall grid health score (0-100) and status (Excellent/Good/Fair/Poor/Critical)
2. KEY METRICS DASHBOARD: Top 5 most important metrics across all domains
3. CRITICAL ALERTS: Any metrics indicating immediate concern (active faults, active outages, high failure risk assets, compliance gaps)
4. OPERATIONAL HIGHLIGHTS: What the grid is doing well
5. AREAS OF CONCERN: Top 3 areas needing attention with specific action items
6. EFFICIENCY ANALYSIS: Renewable utilization rate, power loss percentage, load-to-generation balance
7. RISK ASSESSMENT: Overall grid risk profile with probability and impact matrix
8. EXECUTIVE RECOMMENDATIONS: 5 prioritized strategic actions for grid operators

Aggregate Data from all 15 domains: ${JSON.stringify(aggregateStats)}

Format as a professional executive briefing suitable for senior management.`;

    const analysis = await aiAnalyze('grid_health', aggregateStats, prompt);

    persistAnalysis(
      pool, 'grid_health_summary', null,
      'Executive grid health summary across all 15 domains',
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, aggregateStats },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      aggregateStats,
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/energy-trading-strategy
// Accepts {location_id, time_horizon_hours}, fetches recent trading + weather data
router.post('/ai/energy-trading-strategy', aiRateLimiter, async (req, res) => {
  try {
    const { location_id, time_horizon_hours = 24 } = req.body;

    if (!location_id) {
      return res.status(400).json({ error: 'location_id is required' });
    }
    if (typeof time_horizon_hours !== 'number' || time_horizon_hours < 1 || time_horizon_hours > 168) {
      return res.status(400).json({ error: 'time_horizon_hours must be a number between 1 and 168' });
    }

    // Fetch recent trading data (last 50 trades)
    const tradingResult = await pool.query(
      `SELECT * FROM energy_trading ORDER BY traded_at DESC LIMIT 50`
    );

    // Fetch recent weather impact data
    const weatherResult = await pool.query(
      `SELECT * FROM weather_impact ORDER BY forecast_date DESC LIMIT 20`
    );

    // Fetch recent load forecasts
    const loadResult = await pool.query(
      `SELECT * FROM load_forecasts ORDER BY forecast_time DESC LIMIT 20`
    );

    const contextData = {
      location_id,
      time_horizon_hours,
      recent_trades: tradingResult.rows,
      weather_impacts: weatherResult.rows,
      load_forecasts: loadResult.rows
    };

    const prompt = `You are an AI energy trading strategy expert. Develop a ${time_horizon_hours}-hour buy/sell strategy for location ${location_id} based on recent trading patterns, weather impacts, and load forecasts.

Provide:
1. MARKET OUTLOOK: Price trend forecast for the next ${time_horizon_hours} hours (hourly price estimates)
2. BUY RECOMMENDATIONS: Specific time windows to purchase energy (buy low), with expected price and volume in MWh
3. SELL RECOMMENDATIONS: Specific time windows to sell energy (sell high), with target price and volume in MWh
4. ARBITRAGE OPPORTUNITIES: Any price differential opportunities across markets
5. RISK FACTORS: Weather risks, demand spikes, or market conditions that could impact strategy
6. POSITION SIZING: Recommended trade sizes based on recent market liquidity
7. STOP-LOSS LEVELS: Price thresholds to exit positions and limit losses
8. EXPECTED ROI: Projected return on the strategy over the ${time_horizon_hours}-hour horizon

Context Data: ${JSON.stringify(contextData)}

Provide specific prices in $/MWh, volumes in MWh, and time windows in local time.`;

    const analysis = await aiAnalyze('energy_trading', contextData, prompt);

    persistAnalysis(
      pool, 'energy_trading_strategy', location_id,
      `Trading strategy for location ${location_id}, horizon ${time_horizon_hours}h`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, location_id, time_horizon_hours },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({
      location_id,
      time_horizon_hours,
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-analyses/:feature/:record_id
// Get AI analysis history for a specific record
router.get('/ai-analyses/:feature/:record_id', async (req, res) => {
  try {
    const { feature, record_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM ai_analyses WHERE feature = $1 AND record_id = $2',
      [feature, record_id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM ai_analyses WHERE feature = $1 AND record_id = $2
       ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [feature, record_id, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-analyses (list all, paginated)
router.get('/ai-analyses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const feature = req.query.feature;

    let whereClause = '';
    const params = [];
    if (feature) {
      whereClause = 'WHERE feature = $1';
      params.push(feature);
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM ai_analyses ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;

    const result = await pool.query(
      `SELECT id, feature, record_id, prompt_summary, model_used, user_id, created_at
       FROM ai_analyses ${whereClause}
       ORDER BY created_at DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
