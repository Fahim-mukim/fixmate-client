# FixMate UI/UX Blueprint — v0.2

## Design guardrails
Follow the official assignment and Master Project Instructions as the source of truth. Customer, Technician, and Admin remain distinct. Preserve pay-after-job-completion payment, service approval, booking status workflows, and all required dashboards. Never invent data, metrics, reviews, pricing, availability, or permissions.

## Shared visual system
- Public shell: restrained header, brand mark, clear navigation, responsive footer.
- Dashboard shell: role-aware sidebar/navigation, compact header, page title, profile controls.
- Keep real application buttons and interactions in frontend components only.
- Hero/banner artwork is decorative and static: no CTA buttons, fake links, menus, or controls embedded in the image.

## Public pages
### Home
Editorial hero with a concise value proposition and supporting device/appliance artwork. Actual booking CTA is a real frontend button placed outside the image asset. Then service categories, how-it-works, trust explanation, technician discovery, testimonials only if real, FAQ, footer.
### Services
Search, category filters, sort, result count, responsive service cards, pagination/load more per API contract.
### Service Details
Service description, scope, actual price data only if provided, technician details, booking request action, policy and trust details.
### About / How It Works
Explain customer journey and platform model; avoid unsupported guarantees.
### Sign Up / Sign In
Focused forms, accessible labels, loading/validation/error states; role selection only if required by assignment.
### Payment Success / Cancel
Stripe return state, transaction context when available, next-step guidance. Payment remains after job completion.
### Not Found / Error
Distinct 404 and server error states with recovery guidance.

## Customer dashboard
Overview; My Bookings with status filters and timeline; Payment History; Profile.
## Technician dashboard
Overview; Add Service; My Services with approval state; Manage Requests with only allowed status transitions; Profile.
## Admin dashboard
Overview from real API metrics; Manage Users; Service Approval; All Bookings; Transactions; Profile.

## Shared state requirements
Every data-driven page needs loading, empty, error/retry, success, validation, and disabled/pending states. Status colors must be consistent and always paired with labels/icons.

## Responsive
Mobile: compact nav/drawer, stacked cards, full-width forms. Tablet: compact side navigation and two-column content where useful. Desktop: spacious editorial layouts and dashboard sidebar. Large desktop: cap content width and preserve whitespace.
