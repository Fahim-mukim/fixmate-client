# FixMate Design Handoff — v0.2

## Direction
Option C — Modern Tech × Cinematic Editorial. Selected identity: simplified Smart Home + Shield + Wrench. Both Light and Dark themes are required.

## Package entry points
- Brand: `docs/BRAND_GUIDELINES.md`
- Tokens: `docs/DESIGN_SYSTEM.md` and `styles/fixmate-tokens.css`
- Pages: `docs/DESIGN_BLUEPRINT.md`
- Assets: `docs/ASSET_MANIFEST.md`
- Decisions: `docs/DESIGN_DECISIONS.md`

## Asset usage
Use SVG logo variants according to background. Use the homepage hero/social banner only as static artwork. Do not expect embedded buttons or links; implement all CTAs as real frontend components. Service icons are individual SVGs.

## Architecture compatibility
The frontend and backend remain separate projects. Frontend: Next.js App Router, JavaScript/JSX. Backend: Express.js. Database/auth/payment choices remain unchanged. This package does not request application implementation or architecture changes.

## Mandatory workflow guardrails
Preserve Customer, Technician, Admin roles; required service approval; booking status workflow; pay-after-completion payment; all assignment-required pages and dashboard features. Do not fabricate backend data or add optional flows that complicate implementation.

## Still to complete
Detailed component specifications, final logo approval, font and contrast verification, individual empty/error illustrations, and page-specific desktop/tablet/mobile layouts.
