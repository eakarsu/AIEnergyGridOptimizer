BEGIN;
CREATE TABLE IF NOT EXISTS ai_analyses (id SERIAL PRIMARY KEY, feature VARCHAR(100) NOT NULL, record_id VARCHAR(100), prompt_summary TEXT, response_text TEXT, model_used VARCHAR(100), user_id INTEGER, ai_results JSONB, tokens_used INTEGER, duration_ms INTEGER, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS grid_source_snapshots (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, source_kind TEXT NOT NULL CHECK (source_kind IN ('scada','ems','der','outage','gis','weather','market','maintenance','manual')),
  external_id TEXT NOT NULL, checksum TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'received', payload JSONB NOT NULL,
  created_by BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (tenant_id, source_kind, external_id, checksum)
);
CREATE TABLE IF NOT EXISTS governed_grid_plans (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, topology_version TEXT NOT NULL,
  source_snapshot_id BIGINT NOT NULL REFERENCES grid_source_snapshots(id), state TEXT NOT NULL DEFAULT 'draft', assessment JSONB NOT NULL,
  recommendation JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_by BIGINT, reviewed_by BIGINT, reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (tenant_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS grid_plan_audit (id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, plan_id BIGINT REFERENCES governed_grid_plans(id), actor_id BIGINT, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS grid_plan_tenant_state_idx ON governed_grid_plans(tenant_id, state, updated_at DESC);
COMMIT;
