# Local business operations sprint

Owner scope confirmed 26 November 2026, based on combined-release
2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57. Work branch:
codex/business-operations-sprint. No pushes, hosted migration, deployment,
email, publishing or activation authorized by local implementation.

Dependency order:

1. Material inventory and append-only filament receipt/consumption ledger.
2. Private machines/status and append-only maintenance observations.
3. Internal draft cost estimates: material/waste, electricity, labor, overhead
   and profit margin. All rates explicitly entered; never automatic quotation.
4. Scheduling and job costing against existing orders/resources; preserve order
   transitions, completed-record rules and private histories.
5. Expenses and recorded (not invented) profitability summaries.
6. Draft catalogue/owner product management, never public publishing or uploads.
7. Owner summaries from actual stored records, not synthetic production metrics.
8. Customer management and audited authorized private exports.

Use additive local migrations after 011, AAL2/current owner authorization,
deny-by-default RLS and narrow RPCs. Serialize inventory/scheduling writes,
validate quantities/currency, use retry receipts/version checks and append-only
audit events. Preserve the public form, T/gear, lighting/loading/gestures exactly.
No arbitrary privileged browser clients or new paid infrastructure.

Hosted review stays frozen at 001-011 until separately approved. Later migrations
in this branch are not included in scripts/prepare-hosted-migration-package.mjs.
Each checkpoint reports tests and limitations. Do not claim hosted readiness or
physical-device coverage based on embedded tests/browser emulation.
