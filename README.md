This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Isolated authentication test mode

Phase 5E adds a fail-closed test configuration path. Set `FIXMATE_TEST_MODE=true` only with the test-only variables documented in `.env.example` and the workspace `AUTH_TEST_ENVIRONMENT.md`. Test mode requires `FIXMATE_TEST_MONGODB_URI` with an explicit `/fixmate_auth_test` path, `FIXMATE_TEST_DATABASE_NAME=fixmate_auth_test`, test-only Better Auth and provisioning values, and a test-only Server API origin. It rejects `NODE_ENV=production` and never falls back to the normal `MONGODB_URI`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `FIXMATE_SERVER_API_URL`, or `FIXMATE_PROVISIONING_SECRET` values. Keep real values out of Git.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
