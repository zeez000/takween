# Phase 3 dependency and migration plan

Base: operational-foundation 73647e5. Local-only implementation; no hosted SQL,
email activation, deployment or indexing permission.

1. Add quotation snapshots/items, revisions, bounded integer-paise calculations,
   explicit tax basis points and legal entity, immutable issued revisions, manual
   lifecycle evidence and owner/AAL2-only RPCs. No default commercial terms.
2. Add one order per accepted quotation, validated production transitions,
   append-only job observations and audit history. Costs stay private.
3. Extend the existing owner workspace and same-origin/rate-limited API. Generate
   authenticated on-demand PDFs; no public PDF bucket or customer access links.
4. Test SQL/RLS, retries/concurrency/rollback, local Supabase and owner journeys;
   run production/OpenNext/Worker and existing animation regressions.

All new writes use request UUIDs with payload comparison, transaction locks and
version checks. No direct authenticated table writes. Monetary limits are technical
bounds, not business prices. Tax rates, validity, entity and terms are owner input.
Fateen remains a consented category with manual routing; entity text is not proof
of authority. Rollback disables operations and preserves records; never drop data.
