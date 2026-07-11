# Settings Revamp Constitution - 2026-07-11

Status: guarded implementation in progress

## History and identity

- Baseline `f31f29ff` preserves the old Settings inventory.
- `15e107ba` introduced the current canon desktop chrome; `d7c28f63` and `03aa4587` aligned mobile interaction grammar; `5c72f808` fixed profile photo and full-name synchronization.
- Settings is an own-account dashboard, not an entity list. Selection, bulk actions, table sorting, list grouping, and row filters are excluded.

## Ownership and authority

- Identity/session truth comes from `AuthContext` (`user`, `profile`, `signOut`).
- Profile edits and avatar upload remain owned by `ProfileEditModal` and the Auth adapter/storage contract it invokes.
- Password and MFA operations remain owned by `SecurityModal` and Supabase Auth.
- Theme is app-local state owned by `ThemeContext`; it is not presented as server-persisted preference truth.
- Support hands off to `/support-tickets?add=true&from=settings` only for roles authorized on that route.
- Billing/plan truth has no proved own-user projection or portal receiver and remains unavailable.
- Provider professional profile remains a separately owned doctor workflow; Settings only reveals the proved read surface.

## Preserved perks

- Full name, avatar fallback/failure handling, email, display ID, role, verification badge, phone, theme, profile edit, security, support handoff, provider profile reveal, and sign-out pending feedback.
- Desktop and mobile use the same full-name fallback chain.

## Composition decisions

- Desktop remains a compact account dashboard; staged entrance animation is removed.
- Mobile uses dashboard grammar with structural identity loading and no mount fade.
- Right panel consumes the whole route-owned identity/settings context and performs no private reads.
- Profile/security/support bridges remain because their receivers are mounted and role-gated; billing remains visibly unavailable.

## Remaining proof

- Focused Settings contract update and hardgate admission.
- Confirm mobile dashboard grammar classification.
- Strict radius, encoding, production build, and authenticated viewer/provider/admin desktop/mobile proof.
- Profile/avatar and Auth mutation receivers remain subject to their existing focused modal contracts; no broader field authority is inferred here.
