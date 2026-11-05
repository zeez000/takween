# Decisions

- Independent printing identity first. Fateen is supporting industrial context.
- Use the previously supplied Next.js App Router foundation in the existing repo.
- Brand confirmed as TAKWEEN. Phone, printer dimensions, pricing and launch readiness stay unconfirmed.
- Server-render page structure, isolate browser interactions into client components.
- Tailwind v4 plus shared semantic CSS tokens keeps presentation consistent.
- Use motion/react and respect reduced motion. Keep content visible without JS.
- Hero is an abstract CSS illustration, explicitly not completed customer work.
- Form is local-only; no upload, persistence or successful-submission claims.
- WhatsApp remains disabled until a confirmed business number is configured.
- Supabase planned for auth, database and private storage; not connected now.
- /admin is a public feature outline with no sensitive data or write operations.
- Use INR paise, grams, millimetres, minutes and timezone-aware event timestamps.
- Quote acceptance, stock changes and order creation need database transactions.
- No public hosting, service purchase or GitHub remote in this implementation.
- Preserve existing files and Git metadata. Generate and commit a dependency lockfile.
- Windows sandbox setup failed because Controlled Folder Access blocked the helper.
  After targeted exceptions, setup completes. Sandbox parent-folder traversal still
  fails; approved host execution permits development. Do not claim this fully
  repairs sandbox isolation. Keep security protections enabled.
