'use strict';
const express = require('express');
const pool = require('../db');
const { evaluatePlan, assertTransition } = require('../domain/gridPlanPolicy');
const router = express.Router();
const tenant = req => `user:${req.user.id}`;

router.post('/snapshots', async (req, res) => {
  const { sourceKind, externalId, checksum, observedAt, payload } = req.body || {};
  if (!sourceKind || !externalId || !checksum || !observedAt || !payload) return res.status(400).json({ error: 'sourceKind, externalId, checksum, observedAt and payload required' });
  try { const r = await pool.query(`INSERT INTO grid_source_snapshots (tenant_id,source_kind,external_id,checksum,observed_at,payload,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id,source_kind,external_id,checksum) DO UPDATE SET observed_at=EXCLUDED.observed_at RETURNING *`, [tenant(req), sourceKind, externalId, checksum, observedAt, payload, req.user.id]); return res.status(201).json(r.rows[0]); }
  catch (error) { return res.status(error.code === '23514' ? 400 : 500).json({ error: error.code === '23514' ? 'unsupported sourceKind' : 'snapshot persistence failed' }); }
});

router.post('/', async (req, res) => {
  try {
    const assessment = evaluatePlan(req.body);
    const { idempotencyKey, topologyVersion, sourceSnapshotId, recommendation = {} } = req.body;
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey required' });
    const snapshot = await pool.query('SELECT id FROM grid_source_snapshots WHERE id=$1 AND tenant_id=$2', [sourceSnapshotId, tenant(req)]);
    if (!snapshot.rowCount) return res.status(400).json({ error: 'source snapshot not found in tenant' });
    const r = await pool.query(`INSERT INTO governed_grid_plans (tenant_id,idempotency_key,topology_version,source_snapshot_id,assessment,recommendation,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`, [tenant(req), idempotencyKey, topologyVersion, sourceSnapshotId, assessment, recommendation, req.user.id]);
    await pool.query(`INSERT INTO grid_plan_audit (tenant_id,plan_id,actor_id,action,details) VALUES ($1,$2,$3,'created',$4)`, [tenant(req), r.rows[0].id, req.user.id, { safe: assessment.safe, advisoryOnly: true }]);
    return res.status(201).json(r.rows[0]);
  } catch (error) { return res.status(400).json({ error: error.message }); }
});

router.patch('/:id/state', async (req, res) => {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const found = await client.query('SELECT * FROM governed_grid_plans WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]); if (!found.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'plan not found' }); } const plan=found.rows[0]; assertTransition(plan.state, req.body.state, req.user.role); if (req.body.state === 'pending_operator' && !plan.assessment.safe) throw new Error('unsafe or stale plan cannot be submitted'); const updated=await client.query(`UPDATE governed_grid_plans SET state=$1,version=version+1,reviewed_by=CASE WHEN $1 IN ('approved','rejected') THEN $2 ELSE reviewed_by END,reviewed_at=CASE WHEN $1 IN ('approved','rejected') THEN NOW() ELSE reviewed_at END,updated_at=NOW() WHERE id=$3 AND tenant_id=$4 AND version=$5 RETURNING *`,[req.body.state,req.user.id,req.params.id,tenant(req),req.body.version]); if(!updated.rowCount) throw new Error('version conflict'); await client.query(`INSERT INTO grid_plan_audit (tenant_id,plan_id,actor_id,action,details) VALUES ($1,$2,$3,'state_changed',$4)`,[tenant(req),req.params.id,req.user.id,{from:plan.state,to:req.body.state,reason:req.body.reason||null}]); await client.query('COMMIT'); return res.json(updated.rows[0]); } catch(error){ await client.query('ROLLBACK'); return res.status(409).json({error:error.message}); } finally { client.release(); }
});
router.get('/:id/audit', async(req,res)=>{ try { const r=await pool.query('SELECT * FROM grid_plan_audit WHERE plan_id=$1 AND tenant_id=$2 ORDER BY created_at,id',[req.params.id,tenant(req)]); res.json(r.rows); } catch { res.status(500).json({error:'audit lookup failed'}); } });
module.exports = router;
