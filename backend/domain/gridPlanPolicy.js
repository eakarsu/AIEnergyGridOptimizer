'use strict';

const PLAN_STATES = Object.freeze({ draft: ['validated'], validated: ['pending_operator'], pending_operator: ['approved', 'rejected'], approved: ['superseded'], rejected: ['draft'], superseded: [] });

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} must be finite`);
  return number;
}

function evaluatePlan(input, now = Date.now()) {
  if (!input || !input.topologyVersion || !input.sourceSnapshotId) throw new Error('topologyVersion and sourceSnapshotId are required');
  const observedAt = Date.parse(input.observedAt);
  if (!Number.isFinite(observedAt)) throw new Error('observedAt must be an ISO timestamp');
  const ageSeconds = Math.max(0, (now - observedAt) / 1000);
  const limits = input.limits || {};
  const values = input.values || {};
  const violations = [];
  for (const key of ['loadingPct', 'voltagePu', 'frequencyHz', 'reserveMw']) {
    const value = finite(values[key], key);
    const rule = limits[key];
    if (!rule || !Number.isFinite(Number(rule.min)) || !Number.isFinite(Number(rule.max))) throw new Error(`limits.${key} min/max required`);
    if (value < Number(rule.min) || value > Number(rule.max)) violations.push({ key, value, min: Number(rule.min), max: Number(rule.max) });
  }
  const staleAfterSeconds = Math.max(1, Number(input.staleAfterSeconds || 300));
  return { safe: violations.length === 0 && ageSeconds <= staleAfterSeconds, stale: ageSeconds > staleAfterSeconds, ageSeconds, violations, advisoryOnly: true };
}

function assertTransition(from, to, role) {
  if (!(PLAN_STATES[from] || []).includes(to)) throw new Error(`invalid transition ${from} -> ${to}`);
  if (['approved', 'rejected'].includes(to) && !['operator', 'admin'].includes(role)) throw new Error('operator authorization required');
  return true;
}

module.exports = { PLAN_STATES, evaluatePlan, assertTransition };
