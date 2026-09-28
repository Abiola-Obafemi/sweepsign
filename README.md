# SweepSign

SweepSign is a responsive web SaaS for residential cleaning professionals to create a clear customer handoff after a job. It records scope status, client-safe notes and photos, and one next action.

## Local setup

Requires Node.js 22 or 24 and npm. On Windows, installing the local SQLite fallback may require Visual Studio Build Tools with the C++ workload when `better-sqlite3` has no matching prebuilt binary; hosted deployments use Postgres instead.

```powershell
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run dev
```

Replace the example `BETTER_AUTH_SECRET` with a random value of at least 32 characters. The Next.js 16 App Router app and its Route Handlers run together at `http://127.0.0.1:3000`.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Android demonstration shell

SweepSign includes a deliberately thin Capacitor Android shell for the RevenueCat Shipaton Next Gen demonstration. The shell opens the canonical hosted Next.js application at `https://www.sweepsign.com`; it is not represented as an offline or Google Play production build.

With Android Studio, Android SDK, and Java 21 available:

```powershell
npm run cap:sync
npm run android:build:debug
```

The debug APK is written under `android/app/build/outputs/apk/debug/`. Do not add secrets or a live billing key to the Android project. The remote `server.url` is competition-only packaging for the verified hosted product and must be replaced by an approved production mobile architecture before store distribution.

Playwright starts an isolated API/web pair and exercises signup, onboarding, a complete handoff, sign-out/sign-in persistence, failed-save recovery, template editing/application, public-link revocation after reload, route protection, cross-account ownership, honest unconfigured billing, and responsive layouts at 375px, 768px, and 1440px.

To verify a deployed preview against its hosted database without starting a local server, set `PLAYWRIGHT_BASE_URL` to the deployment origin before running `npm run test:e2e`. Use disposable test accounts and remove their records afterward.

## Data boundary

Better Auth sessions, business profile, templates, and jobs use the same server-side database boundary. Local and E2E verification use the deterministic SQLite path in `SWEEPSIGN_DB_PATH`. Every Vercel deployment requires `DATABASE_URL` or the Supabase integration's `POSTGRES_URL` pointing to pooled hosted Postgres; SQLite files are not a Vercel production datastore. A bounded local browser draft protects in-progress edits if the API is unavailable. Proof images are capped at three small client-approved images in this local/demo architecture.

Do not commit `.env` or `.data/`. The linked Vercel project now has a dedicated Supabase Postgres resource for accounts, jobs, templates, and Better Auth rate-limit state. A production launch still needs durable object storage for proof photos and a privacy/security review.

## Domain email and search verification

Password reset delivery is deliberately fail-closed. Add `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` in the server environment to activate Resend’s API; without both values, the reset request screen shows an account-enumeration-safe generic response and no message is sent. `SWEEPSIGN_SUPPORT_EMAIL` is optional and exposes a domain support address only when it is set. `GOOGLE_SITE_VERIFICATION` accepts the content value from a Google Search Console HTML verification tag; publishing that value does not verify ownership by itself.

The existing account base stays usable because mandatory email verification remains off. Optional verification email infrastructure is present but not sent automatically. Before activating domain mail, create and monitor `support@sweepsign.com` at IONOS, verify a dedicated sending subdomain such as `notify.sweepsign.com` with Resend using the exact provider records, add the server variables in Vercel, and send a real reset test. Do not turn on mandatory verification until the existing unverified account has a safe migration path.

## Current limits

- `SweepSign` is a working name, not cleared branding.
- Password reset delivery is disabled until a Resend key and verified sender are configured; the reset screen stays honest and generic while disabled.
- RevenueCat Test Store checkout requires a project key and offering; without them the interface stays explicitly unavailable.
- Capacitor packaging remains a thin-shell follow-up after the web product gate.
- This public competition repository is licensed under MIT. Third-party packages and assets retain their own licenses.

## Billing boundary

The browser uses the official `@revenuecat/purchases-js` SDK with the stable Better Auth user ID and entitlement `sweepsign_pro`. Set `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` to a RevenueCat Test Store key beginning with `test_` to enable test checkout. Other keys are rejected by this build. Without a valid Test Store key, the Billing page explicitly remains unavailable and core handoffs continue to work. Browser entitlement state is presentation-only: it is never accepted by a Route Handler as premium authorization.

The verified test entitlement removes SweepSign attribution from the signed-in live preview. Customer-facing public links and premium server mutations deliberately remain fail-closed until a server-side RevenueCat verifier is wired with an authenticated RevenueCat API contract; never accept a browser `isPro` value as authorization.
