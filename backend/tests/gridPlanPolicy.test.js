'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluatePlan, assertTransition } = require('../domain/gridPlanPolicy');

const base = { topologyVersion: 'topo-9', sourceSnapshotId: 'snap-1', observedAt: '2026-01-01T00:00:00Z', staleAfterSeconds: 120, values: { loadingPct: 82, voltagePu: 1.01, frequencyHz: 60, reserveMw: 45 }, limits: { loadingPct: { min: 0, max: 100 }, voltagePu: { min: .95, max: 1.05 }, frequencyHz: { min: 59.9, max: 60.1 }, reserveMw: { min: 20, max: 1000 } } };
test('valid fresh plan remains advisory', () => assert.deepEqual(evaluatePlan(base, Date.parse('2026-01-01T00:01:00Z')), { safe: true, stale: false, ageSeconds: 60, violations: [], advisoryOnly: true }));
test('stale or violated state cannot be safe', () => { const result = evaluatePlan({ ...base, values: { ...base.values, voltagePu: 1.2 } }, Date.parse('2026-01-01T00:03:00Z')); assert.equal(result.safe, false); assert.equal(result.stale, true); assert.equal(result.violations[0].key, 'voltagePu'); });
test('approval requires operator', () => { assert.throws(() => assertTransition('pending_operator', 'approved', 'analyst'), /operator/); assert.equal(assertTransition('pending_operator', 'approved', 'operator'), true); });
