const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { aiAnalyze } = require('./ai');
const { aiRateLimiter } = require('./middleware/rateLimiter');
const aiExpandedRoutes = require('./routes/aiExpanded');
const aiNewRoutes = require('./routes/aiNew');
const aiBacklogRoutes = require('./routes/aiBacklog');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security: helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS allowlist from env (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// ─── Helpers: snake_case <-> camelCase ───
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

function rowToCamel(row) {
  if (!row) return row;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

function bodyToSnake(body) {
  if (!body) return body;
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

// JWT middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── Auth Routes ───
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// ─── Feature Configuration ───
// Maps: featureKey -> { table, ai, columns (snake_case DB columns), camelColumns (for frontend mapping) }
const features = [
  { key: 'load_forecasting', table: 'load_forecasts', ai: true, columns: ['region', 'current_load_mw', 'predicted_load_mw', 'forecast_time', 'confidence', 'status'] },
  { key: 'renewable_sources', table: 'renewable_sources', ai: false, columns: ['name', 'type', 'capacity_mw', 'current_output_mw', 'location', 'status', 'efficiency'] },
  { key: 'demand_response', table: 'demand_response', ai: false, columns: ['program_name', 'participant_count', 'reduction_mw', 'status', 'start_time', 'end_time', 'incentive_rate'] },
  { key: 'fault_detection', table: 'fault_detections', ai: true, columns: ['fault_type', 'location', 'severity', 'detected_at', 'status', 'confidence', 'affected_area'] },
  { key: 'energy_storage', table: 'energy_storage', ai: false, columns: ['name', 'type', 'capacity_mwh', 'charge_level', 'location', 'status', 'cycles'] },
  { key: 'power_flow', table: 'power_flows', ai: false, columns: ['line_id', 'from_node', 'to_node', 'power_mw', 'voltage_kv', 'current_a', 'loss_mw', 'status'] },
  { key: 'carbon_emissions', table: 'carbon_emissions', ai: false, columns: ['source', 'emission_type', 'amount_tons', 'recorded_at', 'reduction_target', 'status'] },
  { key: 'smart_meters', table: 'smart_meters', ai: true, columns: ['meter_id', 'location', 'consumption_kwh', 'peak_demand_kw', 'status', 'last_reading', 'anomaly_score'] },
  { key: 'voltage_regulation', table: 'voltage_regulation', ai: false, columns: ['substation', 'nominal_kv', 'actual_kv', 'tap_position', 'regulator_type', 'status', 'deviation'] },
  { key: 'outage_management', table: 'outage_management', ai: false, columns: ['outage_id', 'area', 'affected_customers', 'cause', 'start_time', 'est_restoration', 'status', 'crew_assigned'] },
  { key: 'energy_trading', table: 'energy_trading', ai: true, columns: ['trade_id', 'type', 'energy_mwh', 'price_per_mwh', 'counterparty', 'traded_at', 'status', 'market'] },
  { key: 'weather_impact', table: 'weather_impact', ai: true, columns: ['region', 'weather_type', 'severity', 'impact_on_generation', 'impact_on_demand', 'forecast_date', 'confidence'] },
  { key: 'maintenance_schedule', table: 'maintenance_schedule', ai: true, columns: ['asset_name', 'asset_type', 'last_maintenance', 'next_maintenance', 'priority', 'status', 'predicted_failure_risk'] },
  { key: 'regulatory_compliance', table: 'regulatory_compliance', ai: false, columns: ['regulation_name', 'authority', 'compliance_status', 'deadline', 'penalty_risk', 'last_audit', 'notes'] },
  { key: 'grid_topology', table: 'grid_topology', ai: false, columns: ['node_id', 'node_type', 'capacity_mw', 'connected_nodes', 'location', 'status', 'voltage_level'] }
];

// Build lookup maps
const featureByHyphen = {};  // 'load-forecasting' -> feature
const featureByUnderscore = {}; // 'load_forecasting' -> feature
features.forEach(f => {
  const hyphenKey = f.key.replace(/_/g, '-');
  featureByHyphen[hyphenKey] = f;
  featureByUnderscore[f.key] = f;
});

// Helper to resolve body from camelCase to snake_case column values
function resolveBodyToColumns(body, columns) {
  const snakeBody = bodyToSnake(body);
  return columns.map(col => {
    // Try exact match first, then camelCase version from body
    if (body[col] !== undefined) return body[col];
    if (snakeBody[col] !== undefined) return snakeBody[col];
    const camelKey = snakeToCamel(col);
    if (body[camelKey] !== undefined) return body[camelKey];
    return null;
  });
}

// ─── Generate CRUD routes for all features ───
// Register routes with BOTH underscore and hyphenated paths
features.forEach(feature => {
  const { key, table, ai, columns } = feature;
  const hyphenKey = key.replace(/_/g, '-');
  const paths = [`/api/${key}`, `/api/${hyphenKey}`];

  paths.forEach(basePath => {
    // GET all (with pagination support)
    app.get(basePath, authenticate, async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 0;

        if (page > 0 && limit > 0) {
          const offset = (page - 1) * limit;
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          const total = parseInt(countResult.rows[0].count);
          const result = await pool.query(
            `SELECT * FROM ${table} ORDER BY id DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
          );
          return res.json({
            data: result.rows.map(rowToCamel),
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit)
            }
          });
        }

        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
        res.json(result.rows.map(rowToCamel));
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // GET by id
    app.get(`${basePath}/:id`, authenticate, async (req, res) => {
      try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rowToCamel(result.rows[0]));
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // POST create
    app.post(basePath, authenticate, async (req, res) => {
      try {
        const values = resolveBodyToColumns(req.body, columns);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const result = await pool.query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        res.status(201).json(rowToCamel(result.rows[0]));
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // PUT update
    app.put(`${basePath}/:id`, authenticate, async (req, res) => {
      try {
        const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        const values = resolveBodyToColumns(req.body, columns);
        values.push(req.params.id);
        const result = await pool.query(
          `UPDATE ${table} SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rowToCamel(result.rows[0]));
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // DELETE
    app.delete(`${basePath}/:id`, authenticate, async (req, res) => {
      try {
        const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully', deleted: rowToCamel(result.rows[0]) });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // AI Analysis endpoint (only for AI-enabled features)
    // Support both /ai-analyze and /ai/analyze paths
    if (ai) {
      const aiPaths = [`${basePath}/ai-analyze`, `${basePath}/ai/analyze`];
      aiPaths.forEach(aiPath => {
        app.post(aiPath, authenticate, aiRateLimiter, async (req, res) => {
          try {
            const { data, prompt } = req.body;
            let analysisData = data;
            if (!analysisData) {
              const result = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 20`);
              analysisData = result.rows;
            }
            const analysis = await aiAnalyze(key, analysisData, prompt);

            // Persist AI result (non-blocking fire-and-forget) with ai_results JSONB
            pool.query(
              `INSERT INTO ai_analyses (feature, record_id, prompt_summary, response_text, model_used, user_id, ai_results, tokens_used, duration_ms)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                key,
                null,
                `Bulk analysis for ${key} (${Array.isArray(analysisData) ? analysisData.length : 1} records)`,
                analysis.analysis || '',
                analysis.model || 'anthropic/claude-3-5-sonnet-20241022',
                req.user?.id || null,
                analysis.structured || { analysis: analysis.analysis, model: analysis.model, usage: analysis.usage },
                analysis.usage?.total_tokens || null,
                analysis.durationMs || null
              ]
            ).catch(err => console.error('[ai_analyses persist error]', err.message));

            res.json(analysis);
          } catch (err) {
            res.status(500).json({ error: err.message });
          }
        });
      });
    }
  });
});

// ─── Expanded AI Routes (carbon-emissions, outage-management, renewable-sources, voltage-regulation) ───
app.use('/api', authenticate, aiExpandedRoutes);

// ─── New AI Routes (predictive-maintenance-alert, grid-health-summary, energy-trading-strategy, ai-analyses) ───
app.use('/api', authenticate, aiNewRoutes);

// ─── Mechanical backlog AI Routes (demand-forecast, battery-scheduling) ───
app.use('/api', authenticate, aiBacklogRoutes);
app.use('/api/agentic-grid-operator', authenticate, require('./routes/agenticGridOperator'));
app.use('/api/community-solar', authenticate, require('./routes/communitySolar'));
app.use('/api/ev-smart-charging', authenticate, require('./routes/evSmartCharging'));
app.use('/api/dr-auto-enroll', authenticate, require('./routes/drAutoEnroll'));
app.use('/api/carbon-accounting', authenticate, require('./routes/carbonAccounting'));
app.use('/api/utility-bill-optim', authenticate, require('./routes/utilityBillOptim'));
app.use('/api/microgrid', authenticate, require('./routes/microgridManager'));

// ─── Dashboard Stats ───
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
    const stats = {};
    for (const f of features) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${f.table}`);
      stats[f.key] = parseInt(result.rows[0].count);
    }
    const activeAlerts = await pool.query("SELECT COUNT(*) as count FROM fault_detections WHERE status = 'active'");
    const totalGeneration = await pool.query("SELECT COALESCE(SUM(current_output_mw), 0) as total FROM renewable_sources WHERE status IN ('active', 'online')");
    const totalLoad = await pool.query("SELECT COALESCE(SUM(current_load_mw), 0) as total FROM load_forecasts");
    const activeOutages = await pool.query("SELECT COUNT(*) as count FROM outage_management WHERE status = 'active'");

    res.json({
      featureCounts: stats,
      activeAlerts: parseInt(activeAlerts.rows[0].count),
      totalGeneration: parseFloat(totalGeneration.rows[0].total),
      totalLoad: parseFloat(totalLoad.rows[0].total),
      activeOutages: parseInt(activeOutages.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ensure ai_analyses table exists ───
async function ensureAiAnalysesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_analyses (
        id SERIAL PRIMARY KEY,
        feature VARCHAR(100) NOT NULL,
        record_id VARCHAR(100),
        prompt_summary TEXT,
        response_text TEXT,
        model_used VARCHAR(100),
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add ai_results JSONB column for structured caching
    await pool.query(`ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS ai_results JSONB`);
    await pool.query(`ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS tokens_used INTEGER`);
    await pool.query(`ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS duration_ms INTEGER`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_analyses_feature_record ON ai_analyses(feature, record_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_analyses_results_gin ON ai_analyses USING GIN (ai_results)`);
    console.log('ai_analyses table ready (with ai_results JSONB)');
  } catch (err) {
    console.error('Failed to create ai_analyses table:', err.message);
  }
}


// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('./routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, async () => {
  await ensureAiAnalysesTable();
  console.log(`⚡ Energy Grid Optimizer API running on port ${PORT}`);
});
