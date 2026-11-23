# FixMate Client

FixMate Client is the independent Next.js frontend for FixMate, a role-based smart-device and home-appliance repair marketplace (Assignment 9, Category 006). It provides public service discovery, authentication flows, and role-gated dashboards for Customers, Technicians, and Admins, while using server-side BFF route handlers to communicate with the FixMate Server.

## Live URL

- Live Client URL: https://fixmate-client-snowy.vercel.app (owner-confirmed)
- Live Server/API URL: https://fxmate-server.vercel.app (owner-confirmed; see Server README)
- Deployed commit SHA: owner-confirmed pre-fix Client SHA `b81187d8affedc7c56d0a23bd70aaeb43e3ee34e`; post-fix Client commit `90efd3b66a407b86dada42fe52255a308253e4c8` was pushed and the production bundle was observed serving the current Stripe Checkout allowlist. The exact Vercel post-fix deployment SHA remains `PENDING OWNER DECISION`.

## Repository Links

- Client repository: https://github.com/Fahim-mukim/fixmate-client
- Server repository: https://github.com/Fahim-mukim/fxmate-server-

## Main Features

### Customer
- Browse/search/filter approved public services and view service details.
- Register/sign in through Better Auth-powered flows.
- Create booking requests for approved services.
- View own bookings, booking detail, and cancel eligible requested bookings.
- Pay for completed bookings through Stripe Checkout flow (server-created session).
- View own payment history and profile.

### Technician
- View and manage own services (create/update/delete where allowed).
- View technician booking requests, accept/reject/in-progress/complete transitions where allowed.
- View technician dashboard stats/charts and service/payment-related views as implemented.

### Admin
- View admin dashboard stats/charts.
- Moderate services (approve/reject/list).
- View/search/filter admin booking list (read-only).
- Manage user roles through secure admin user management flow.
- View admin payment/transaction views as implemented.

## Technology Stack

Based on `package.json` and implemented source:

- Next.js 16.4.6 (App Router)
- React 19.3.0
- Better Auth (`better-auth`, `@better-auth/mongo-adapter`)
- MongoDB driver (used by Better Auth/server-side integration)
- Tailwind CSS 4, shadcn/ui/Radix-style UI primitives, Lucide icons
- Recharts for dashboard charts
- ESLint 9 / eslint-config-next

## Installation and Local Development

```bash
cd fixmate-client
npm install
npm run dev
```

Open http://localhost:3000 in development.

## Available Scripts

- `npm run dev` - start Next.js development server.
- `npm run build` - create production build.
- `npm run start` - start production server.
- `npm run lint` - run ESLint.
- `npm test` - run Node tests (`node --test test/*.test.js`).

## Required Client Environment Variable Names

Configure these names in a local `.env` file (never commit real values). See `.env.example` for safe placeholders:

- `MONGODB_URI` - MongoDB connection string used by Better Auth/server-side Client integration.
- `BETTER_AUTH_SECRET` - Better Auth secret.
- `BETTER_AUTH_URL` - canonical Client/Better Auth base URL (e.g., `http://localhost:3000` in local dev).
- `FIXMATE_SERVER_API_URL` - server-only API origin used by Next.js server code/BFF route handlers; never expose as `NEXT_PUBLIC_*`.

## Authentication and Client-to-Server BFF Architecture

- Better Auth handles authentication in the Client app. The Client does not trust browser-supplied role/ownership for protected behavior.
- Next.js Route Handlers under `src/app/api/fixmate/*` act as a server-side BFF/proxy layer to the FixMate Server, attaching server-side auth context/tokens as required and returning controlled JSON responses.
- Better Auth routes are exposed through `src/app/api/auth/[...all]/route.js`.
- Sensitive upstream secrets (Stripe, ImgBB, server secrets) remain server-side; the Client must not expose them through `NEXT_PUBLIC_*` variables.
- Dashboard access is role-gated in UI for UX, but authoritative authorization is enforced by the Server.
- Payments use Stripe Checkout in Test Mode for local/demo verification; session creation and webhook verification remain server-side, and no Stripe key is exposed in the Client.

## Demo Account Setup / Readiness

Demo/test credentials are owner-managed and must not be committed. The Phase 47 read-only audit confirmed the live canonical account counts: 7 Customers, 8 Technicians, and 1 Admin. Placeholder ranges below reflect those live counts (no real email or password is stored here):

- Customer: `<customer-demo-email-{1..7}>` / `<owner-set-password>`
- Technician: `<technician-demo-email-{1..8}>` / `<owner-set-password>` (owner-reported demo mapping: Istiak = Laptop & PC specialist slot, Nayim = second technician slot)
- Admin: `<admin-demo-email>` / `<owner-set-password>` (manual owner-controlled provisioning)

No account is created by the seed script or by this repository. Confirm role in canonical Better Auth `user` records and use real credentials only in the intended environment. For seed workflow, database safety rules, and account provisioning details, see the Server README: https://github.com/Fahim-mukim/fxmate-server-

## Submission Readiness Checklist

Status labels: IMPLEMENTED (source present), TESTED (automated/mocked evidence), VERIFIED (review against authoritative owner/live evidence), OWNER ACTION REQUIRED (owner-controlled task), BLOCKED (missing source/action prevents completion).

- [x] IMPLEMENTED — Project purpose/overview, confirmed live URLs, repo links, role feature list, stack, setup, env variable names (never values), demo account placeholders, and BFF/Stripe/ImgBB boundaries documented here.
- [x] TESTED — Client source/tests cover role-gated UI, payment read-only return pages, checkout input contract, dashboard states, and safe BFF boundaries with mocked/local tests.
- [x] VERIFIED — Owner-authorized Stripe Test Mode paid Checkout E2E for production booking `CE6EE1`: the current Stripe-hosted URL was accepted, the same `cs_test_…` Session was reused, Checkout showed USD `$79.00`, the approved test card paid, the success page showed server-confirmed `Paid`, one paid payment record and one completed payment with `79.00 USD` Admin revenue were observed, and the cancel return page changed no records.
- [ ] VERIFIED — Official complete Assignment 9 Category 006 specification/guide files are not present in workspace docs; full official reconciliation remains `PENDING OWNER DECISION`.
- [x] VERIFIED — Live Client/Server health/readiness and authenticated Customer/Technician/Admin role flows were exercised through the normal UI during the Phase 50 run; no credentials were pasted or stored in this repository.
- [ ] OWNER ACTION REQUIRED — Real demo credentials and the exact post-fix Vercel deployment SHA must be supplied by owner; live Client/Server URLs are confirmed and documented above. No credential is invented here.
- [x] OWNER ACTION REQUIRED — Live canonical account counts confirmed by the Phase 47 read-only audit: 7 Customer / 8 Technician / 1 Admin; secure credential handoff is owner-controlled, and no account is created by this repository or the demo seed.
- [ ] BLOCKED — Stripe Dashboard webhook endpoint/subscribed events, delivery log, event replay/idempotency, and live Checkout expiration remain owner-controlled and were not independently agent-observable; no second booking was created for expiration testing.
- [ ] OWNER ACTION REQUIRED — Production responsive/error smoke checks beyond the payment flow, data-side outstanding work (orphan service ownership, missing categories, ImgBB placeholders) in the Server README, official X handle decision (D7), and secure submission credential/live URL handoff.

## Deployment / Production Status

- Live Client deployment: https://fixmate-client-snowy.vercel.app (owner-confirmed). Post-fix Client commit `90efd3b66a407b86dada42fe52255a308253e4c8` is pushed and the deployed JavaScript bundle was observed containing `["/c/pay/","/g/pay/"]`; the exact Vercel post-fix deployment SHA remains `PENDING OWNER DECISION`.
- Production/live authenticated E2E verification: the Phase 50 paid Checkout flow is recorded above; production responsive/error smoke checks beyond that flow remain owner-controlled.
- Keep Client and Server as independent repositories, deployments, and env configurations.
