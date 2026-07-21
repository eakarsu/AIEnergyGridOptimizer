# Governed grid-planning workflow

`/api/governed-grid-plans` implements an advisory-only path: ingest a provenance-bearing, idempotent source snapshot; deterministically assess topology/version, staleness, loading, voltage, frequency, and reserves; submit only safe/fresh plans; and require an `operator` or `admin` JWT role to approve. Every transition is optimistic-locked and audited. Approval never dispatches a SCADA/EMS command.

SCADA, EMS, DER, outage, GIS/weather, market, and maintenance connectors remain isolated read-only adapter responsibilities. They must supply external IDs, checksums, observed times, and explicit failures. Production use still requires utility-specific power-flow validation, network isolation, operator procedures, credentials, and safety certification.

Run `scripts/bootstrap.sh` once, `scripts/migrate.sh` explicitly, and `start.sh` for a non-mutating start. Demo data requires `CONFIRM_DEMO_SEED=yes scripts/seed-demo.sh`.
