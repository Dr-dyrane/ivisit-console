# Pass 4 Organization, Onboarding, And Verification Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Auth admin call, Edge Function, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers organization registry, onboarding, profile/admin identity, provider verification, facility verification, RBAC helper usage, display IDs, and readiness for provider operations.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/OrganizationsPage.jsx`
- `frontend/src/components/pages/VerificationQueue.jsx`
- `frontend/src/components/pages/UsersPage.jsx`
- `frontend/src/components/modals/UserModal.jsx`
- `frontend/src/components/modals/InviteUserModal.jsx`
- `frontend/src/components/onboarding/OrganizationDetailsStep.jsx`
- `frontend/src/contexts/OnboardingContext.jsx`
- `frontend/src/services/organizationsService.js`
- `frontend/src/services/onboardingService.js`
- `frontend/src/services/verificationService.js`
- `frontend/src/services/orgVerificationService.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/adminService.js`
- `frontend/src/services/authService.js`
- `frontend/src/services/displayIdService.js`
- `frontend/src/services/rbacPatterns.js`

Audit docs:

- Stage 3 capability gap audit.
- Stage 4 L5 ownership audit.
- Stage 5 service coverage audit.
- Stage 6 implementation pass plan.
- Identity/admin/provider service map.

Observed source signals:

- `organizationsService.js` is now explicitly covered after Stage 5 and is consumed by `PageDataContext`, `OrganizationsPage`, and `UsersPage`.
- `organizationsService.getOrganizations` manually maps `organization_wallets` to organizations.
- `onboardingService.submitOnboarding` says it creates an organization record in `hospitals` and links `profiles.organization_id` to that id.
- `orgVerificationService` says organization verification uses `hospitals.verification_status`.
- `verificationService` verifies provider profiles and imports `rbacPatterns`.
- `rbacPatterns.js` is used by verification services, so it is not optional infrastructure.
- Verification queue has separate provider and organization tabs but copy/action semantics can still imply the wrong readiness.
- Live route/navigation access allows `org_admin` on `/users` and `/verification`, while `ContextPanel` suppresses both panels unless `admin`; own-user `/settings` is also route-visible from `viewer` while its panel is admin-only.
- `/organizations` is live and admin-visible in `App.js`/navigation but absent from the dormant `config/routes.jsx` doctrine; authentication/onboarding entries are similarly incomplete there.
- The shared Quick Verify action only navigates to `/verification?quick=true`; no query-param receiver was found in `VerificationQueue`, so it does not currently enter a distinct review operation.

## User Flow

Operator/onboarding path:

1. New organization admin creates account.
2. Organization details are entered or matched to an existing facility.
3. Onboarding creates or links the correct organization/facility/profile records.
4. Admin reviews provider verification queue.
5. Admin reviews organization/facility verification queue.
6. Approved organization/facility becomes eligible for the correct console capabilities.
7. Users/providers inherit the correct organization scope, display IDs, and permissions.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Organization registry | `organizations` table service exists, while onboarding/org verification use `hospitals`. | Explicit organization/facility identity model. |
| Onboarding submit | Creates "organization" in `hospitals` and links profile to hospital id. | Canonical organization plus facility relationship writer. |
| Facility verification | `orgVerificationService` uses hospital verification status. | Facility/organization verification lane with correct dispatch-readiness meaning. |
| Provider verification | `verificationService` updates profiles. | Provider identity/readiness lane separate from facility dispatch certification. |
| RBAC helpers | Used by verification services but not broadly audited. | Security helper review against current RLS/RPC doctrine. |
| Display IDs | Dynamic enrichment in several services. | Entity-aware display ID resolution and fallback copy. |
| Admin/user creation | Raw profile paths may create records without Auth identity. | Auth-backed invite/create boundary. |
| Route and panel authority | Live route/navigation and context-panel role checks disagree for identity/verification/settings surfaces; dormant route config is incomplete. | One explicit access authority for route, nav and panel composition, with own-user settings separated from admin operations. |
| Quick verification entry | Context action advertises a quick workflow through an unconsumed query flag. | A mounted, authorized verification queue state or no Quick Verify action. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| Browse organizations/facilities/users | Scoped read projection | `organizations`, `hospitals`, guarded auth/profile reads | Show identity chain correctly; do not imply management authority from read access. |
| Create/update/delete organization | Missing guarded workflow command | Organization/admin onboarding authority not proven by table RLS | Direct `organizations` browser CRUD is blocked from supported implementation. |
| Invite/create user or provider | Workflow command | Auth/invite-backed provisioning plus profile projection | No raw profile-only account creation. |
| Review person credential/BVN | Workflow command needing policy/receiver proof | Profile identity lane | Do not describe as facility dispatch certification. |
| Review/approve facility readiness | Workflow command | Hospital verification/eligibility lane | Render derived dispatch/booking state distinctly. |
| Assign role/organization/provider identity | Workflow command | Admin/profile/auth authority | Preserve UUID identity chain and display-ID lookup only. |
| Reach identity and verification surfaces | Role-scoped UI access projection | Consolidated live route/navigation/panel authority plus backend permission | Do not show a route without its valid context or suppress valid org-admin operational context through a stricter panel-only rule. |
| Enter Quick Verify | Workflow entry point | Verified queue mode tied to the correct person/facility lane | Do not advertise quick review until the queue consumes and renders that state. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Profile/auth identity | auth-backed profile `id`, role, `organization_id`, `provider_type`, onboarding and BVN state; only RPC-supported editable columns | Do not expose email/avatar/name-component saves or direct other-user writes where the audited admin receiver does not persist or authorize them. |
| Organization/facility chain | `organizations.id`, hospital `organization_id`, hospital verification and dispatch/emergency eligibility, organization wallet relationship | A hospital UUID never occupies `profiles.organization_id`; facility verification is distinct from person/BVN review. |
| Invitation/onboarding completion | invite actor scope, role/org/provider metadata, email-delivery result, linked profile/org/hospital creation effects | Do not report an invitation sent or operational ownership established without receiver-backed email and identity linkage proof. |

Generated trace confirmation (May 25): `user_roles` now has a cross-repo table-flow trace with zero matched Console CRUD surfaces. Effective Console role changes remain with the approved Auth/profile/admin identity receiver; this pass must not add a parallel role-table editor.

Storage evidence confirmation (May 25): onboarding currently uploads verification files into `documents/organizations/{organization.id}/verification/*`, but no active App/Console Storage bucket/policy authority was found outside archive material. Evidence upload remains a private-command blocker until read-only deployed policy, actor scope, retention and cleanup proof is available.

## Implementation Packages

### 1. Organization Registry Boundary

Established boundary to preserve during implementation:

- `organizations` owns legal/operating organization identity and organization wallet scope.
- `hospitals` owns facility identity and facility verification/dispatch eligibility under an organization.
- `profiles.organization_id` references an organization UUID, never a hospital UUID.
- Facility-scoped pricing/providers/media remain tied to the facility while authorization resolves through its organization.
- Existing hospital-as-organization rows, if present, require a separate read-only evidence and authorized maintenance plan.

Acceptance gate:

- No onboarding or verification change can submit an ambiguous hospital-versus-organization identifier.

### 2. Onboarding Writer

Onboarding must write:

- authenticated user/profile state
- organization record
- facility/hospital record, if applicable
- profile organization linkage
- verification state
- uploaded verification documents
- display ID projection

Acceptance gate:

- Onboarding no longer writes hospital-shaped organization truth unless that is explicitly the canonical model.
- If profile update fails after organization/facility creation, UI shows a recoverable pending state.

### 3. Verification Lane Split

Separate:

- profile/provider verification
- organization verification
- facility dispatch certification
- onboarding completion
- operational readiness

Acceptance gate:

- Verification queue copy and actions do not imply dispatch eligibility from profile/BVN verification alone.
- Organization/facility approval updates the fields app and console actually consume.

### 4. Admin/Profile/Auth Boundary

Resolve:

- invite-only users
- Auth-created users
- profile edits
- email/name/avatar edits
- role/status/suspend/delete
- MFA/admin checks

Acceptance gate:

- Console-created users have Auth identity or are explicitly invite-pending.
- Destructive admin actions route through one authorized service/RPC/Edge boundary.

### 5. RBAC And Display ID Guardrail

Audit before reuse:

- `rbacPatterns.isAdmin`
- `checkRole`
- `AuthorizationError`
- `handleServiceError`
- display ID bulk resolution
- entity-aware ID resolution

Acceptance gate:

- Client RBAC helpers do not substitute for RLS/RPC/Edge authorization.
- Display ID lookups are entity-aware where ambiguity can affect writes.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on organizations page.
- Browser smoke on onboarding wizard.
- Browser smoke on provider and organization verification queues.
- Invite/create user flow with non-production account.

Backend/RLS/RPC/Auth:

- Read-only proof for `organizations`, `hospitals`, `profiles`, and wallet/org relationships.
- RLS tests for platform admin, org admin, sponsor/viewer, provider, and ordinary user paths.
- Auth-backed user creation/invite verification in non-production.
- Display ID resolution tests for profile, organization/facility, hospital, provider.

Stop conditions:

- Do not continue if organization id versus hospital id ownership is ambiguous.
- Do not approve verification semantics that grant dispatch readiness from the wrong field.
- Do not create or mutate Auth users outside an approved non-production test.
