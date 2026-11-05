# Takween 3D Printing Business Platform

Phase 0 foundation and Phase 1 homepage for a planned custom plastic FDM
business in Rajajinagar, Bengaluru. Brand name is confirmed as TAKWEEN. Contacts remain to be confirmed.

## Local preview on Windows

Node.js LTS 22+ and Git are prerequisites. Open PowerShell:

```powershell
Set-Location "C:\Users\user\OneDrive\Documents\ChatGPT\takween"
npm.cmd ci
npm.cmd run dev
```

For the first installation without a lockfile, use npm.cmd install.
Open http://localhost:3000 . Stop the server with Ctrl+C.
Use npm.cmd to avoid npm.ps1 execution-policy errors.

## Checks

```powershell
npm.cmd run check
npx.cmd playwright install chromium webkit
npm.cmd run test:e2e
```

check runs ESLint, TypeScript, unit tests and production build.
Browser tests cover desktop Chromium and an iPhone-sized WebKit browser.
Real iPhone Safari verification is still required.
See VERIFICATION.md for actual results and environment limitations.

Production preview: npm.cmd run build followed by npm.cmd run start.

## iPhone on the same private Wi-Fi

Run npm.cmd run dev:lan. In another window run ipconfig and find the Wi-Fi
IPv4 address. Open http://YOUR-LAPTOP-IP:3000 in iPhone Safari.
Allow Node.js on the private Windows network if prompted. Do not configure
router port forwarding. Clipboard copying on LAN HTTP may require manual
selection. Stop the development server when finished.

## Working foundation

- Animated black-and-red homepage with mobile navigation and reduced motion.
- About, services, printing explanation, materials and empty portfolio.
- Local enquiry draft, file selection validation and conditional WhatsApp link.
- Separate Fateen section with unconfirmed machining capabilities.
- Operations and tracking feature outlines without customer records.

The form does not submit an enquiry or upload any file. It keeps values only
in component memory. WhatsApp opens a draft for review, without attachments.
Client-side file validation is not content/security validation.

## Configuration and structure

- src/config/site.ts: public branding, status, WhatsApp number and capabilities.
- src/components: shared layout, illustration, animation and form.
- src/lib: draft generation and file selection validation.
- src/app: homepage, operations outline, tracking outline and styles.
- supabase: proposed database architecture, not an applied migration.
- tests: unit and desktop/mobile browser acceptance tests.

Confirm the brand, business phone, printer specifications and service readiness
before launching. No customer testimonials, project history or prices are invented.
/admin is a public feature outline, not an authenticated administration system.

## Git and publication

The existing Git repository is preserved. No GitHub repository or remote
is created, and no website is deployed. Review git status before committing.
Use a private GitHub repository when approved. Never commit .env files,
customer designs, credentials, node_modules or build artefacts.
Commit package-lock.json and use npm.cmd ci for reproducible installations.

## Cinematic milestone and owner rules
Read PROJECT_RULES.md and BLUEPRINT_AUDIT.md. The sculpture preview is /#assembly; the original enquiry remains /#quote. See VERIFICATION.md for current results. The blueprint is a roadmap, not a claim that backend modules are live.
