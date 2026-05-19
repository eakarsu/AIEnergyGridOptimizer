/**
 * Expanded AI routes for domains previously lacking AI analysis.
 * carbon-emissions, outage-management, renewable-sources, voltage-regulation
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

// POST /api/carbon-emissions/:id/analyze
router.post('/carbon-emissions/:id/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM carbon_emissions WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Carbon emission record not found' });

    const record = result.rows[0];
    const prompt = `You are an AI carbon emissions specialist. Analyze this carbon emission record and provide:
1. Emission reduction potential (%) and specific actions to achieve it
2. Carbon offset recommendations (reforestation, renewable energy credits, etc.)
3. Benchmarking against industry averages
4. Cost-benefit analysis of reduction strategies
5. Short-term and long-term roadmap to net-zero

Data: ${JSON.stringify(record)}

Provide specific, quantified recommendations with expected outcomes.`;

    const analysis = await aiAnalyze('carbon_emissions', [record], prompt);

    persistAnalysis(
      pool, 'carbon_emissions', id,
      `Carbon emission analysis for record ${id} (source: ${record.source}, amount: ${record.amount_tons} tons)`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, record_id: id },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({ record, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outage-management/:id/analyze
router.post('/outage-management/:id/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM outage_management WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Outage record not found' });

    const record = result.rows[0];
    const prompt = `You are an AI grid outage management specialist. Analyze this outage and provide:
1. Estimated Time to Restoration (ETR) based on cause and historical patterns
2. Crew optimization: how many crews, skill sets required, deployment sequence
3. Customer communication plan: what to notify, timing, channels
4. Cascading risk assessment for neighboring grid sections
5. Post-restoration checklist and preventive recommendations

Data: ${JSON.stringify(record)}

Provide specific timelines, crew numbers, and communication templates.`;

    const analysis = await aiAnalyze('outage_management', [record], prompt);

    persistAnalysis(
      pool, 'outage_management', id,
      `Outage analysis for ${record.area} (cause: ${record.cause}, affected: ${record.affected_customers} customers)`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, record_id: id },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({ record, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/renewable-sources/:id/analyze
router.post('/renewable-sources/:id/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM renewable_sources WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Renewable source not found' });

    const record = result.rows[0];
    const prompt = `You are an AI renewable energy optimization specialist. Analyze this renewable source and provide:
1. Output optimization strategies to maximize current_output_mw relative to capacity_mw
2. Efficiency improvement opportunities and efficiency gap analysis
3. Seasonal production pattern predictions (monthly output estimates)
4. Maintenance recommendations to improve uptime
5. Integration recommendations for grid load balancing

Data: ${JSON.stringify(record)}

Provide specific technical recommendations with expected output improvements in MW and percentage.`;

    const analysis = await aiAnalyze('renewable_sources', [record], prompt);

    persistAnalysis(
      pool, 'renewable_sources', id,
      `Renewable source analysis for ${record.name} (type: ${record.type}, capacity: ${record.capacity_mw} MW)`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, record_id: id },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({ record, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voltage-regulation/:id/analyze
router.post('/voltage-regulation/:id/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM voltage_regulation WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Voltage regulation record not found' });

    const record = result.rows[0];
    const prompt = `You are an AI power systems voltage regulation specialist. Analyze this voltage regulator data and provide:
1. Corrective actions needed for the current deviation (${record.deviation} kV from nominal ${record.nominal_kv} kV)
2. Equipment health assessment based on tap position and deviation patterns
3. Risk of voltage instability and cascading impact on connected loads
4. Recommended tap position adjustments with expected voltage outcomes
5. Long-term equipment lifecycle and replacement planning

Data: ${JSON.stringify(record)}

Provide specific tap adjustments, equipment health scores, and risk timelines.`;

    const analysis = await aiAnalyze('voltage_regulation', [record], prompt);

    persistAnalysis(
      pool, 'voltage_regulation', id,
      `Voltage regulation analysis for substation ${record.substation} (deviation: ${record.deviation} kV)`,
      analysis.analysis || '',
      analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
      req.user?.id,
      analysis.structured || { analysis: analysis.analysis, record_id: id },
      analysis.usage?.total_tokens,
      analysis.durationMs
    );

    res.json({ record, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
