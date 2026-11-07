# Supabase client setup

The existing homepage and all business workflows remain unchanged. No migration,
policy, bucket, database table, API endpoint or auth page is created by this setup.

## Environment

In ignored .env.local set NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY using your own project settings.
Use sb_publishable_ keys. Never put a secret/service-role key into NEXT_PUBLIC_.
Do not send credentials in chat or commit .env.local. Restart dev after edits.
No helper is constructed until called; a missing environment cannot break the
existing static homepage. Public values are intentionally eligible for browser use.

## Browser and server clients

Browser components: import createClient from @/lib/supabase/browser.
Server Components: await createClient from @/lib/supabase/server, per request.
Server Action/Route Handler: await createClient({ writableCookies: true }) only
where Next.js permits response cookie writes. The default is read-only cookies.
Do not use the read-only server helper for login/logout or rely on it to persist
session refresh. Authenticated flows require a separately reviewed Next.js proxy
and verified session/authorization implementation; neither is enabled here.
No privileged server credentials are used. All data access remains subject to RLS.
No application page currently calls these helpers.

## Safe check

Run from the project folder:
node --experimental-strip-types scripts/check-supabase.mjs

It loads the local environment silently and performs GET /auth/v1/settings with
only the publishable key. Output contains status and generic diagnostics only.
A pass confirms endpoint/key reachability, not SQL, RLS, bucket or user-access
correctness. No users, sessions, records or tables are created.

Do not implement quotes, uploads, tracking or admin authentication until approved.

## Verified results
On 6 November 2026: read-only Auth settings GET returned HTTP 200; lint, TypeScript, 5 unit tests and production build passed. Existing browser regressions: 22 passed and 2 intentional Chromium-only skips in WebKit. Production dependency audit: 0 vulnerabilities. No database, RLS, storage or login workflow was verified or changed. .env.local exists, is ignored and is not tracked. Branch: codex/supabase-client-setup.
