# Pass 4 Identity First Implementation Checklist - 2026-05-26

## Status

Implementation-control checklist only. This document does not authorize Auth admin calls, Edge Function invocation, onboarding submission, invite delivery, profile/org/facility mutation, Storage upload, database migration, cleanup, seed, reset, or production data repair.

Pass 4 starts by making identity, organization, onboarding, verification, route authority and report affordances truthful before enabling any stronger capability.

## Source Chain Read Before Editing

Read these docs first:

- `frontend/docs/implementation/console-service-alignment/passes/PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/service-maps/IDENTITY_ADMIN_PROVIDER_SERVICE_MAP_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/IDENTITY_VISITS_SUBSCRIBERS_CONTRACT_CHART_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`

Then inspect the current runtime source. Do not rely on this checklist if the source has moved.

```powershell
rg -n "UsersPage|UsersPanel|OrganizationsPage|OrganizationDetailsStep|OnboardingContext|InviteUserModal|SecurityModal|VerificationQueue|VerificationPanel|OrganizationsPanel|AuthContext|ProtectedRoute|SmartHeader|MobileUsers|MobileOrganizations|MobileVerification|MobileSettings" frontend/src
rg -n "console\.log|console\.error|organization_id|hospital_id|invite-user|verification_status|bvn_verified|verified|onboarding|password|MFA|avatar|bulk|onDelete|Export|quick=true" frontend/src/components frontend/src/contexts frontend/src/services frontend/src/lib
```

## Runtime Files In Scope

Primary files:

- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/components/common/ProtectedRoute.jsx`
- `frontend/src/components/pages/UsersPage.jsx`
- `frontend/src/components/context/UsersPanel.jsx`
- `frontend/src/components/pages/OrganizationsPage.jsx`
- `frontend/src/components/context/OrganizationsPanel.jsx`
- `frontend/src/components/pages/VerificationQueue.jsx`
- `frontend/src/components/context/VerificationPanel.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/components/mobile/MobileUsers.jsx`
- `frontend/src/components/mobile/MobileOrganizations.jsx`
- `frontend/src/components/mobile/MobileVerification.jsx`
- `frontend/src/components/mobile/MobileSettings.jsx`
- `frontend/src/components/modals/UserModal.jsx`
- `frontend/src/components/modals/InviteUserModal.jsx`
- `frontend/src/components/modals/SecurityModal.jsx`
- `frontend/src/components/onboarding/OrganizationDetailsStep.jsx`
- `frontend/src/components/onboarding/VerificationStep.jsx`
- `frontend/src/components/pages/OnboardingPage.jsx`
- `frontend/src/components/pages/OnboardingSuccessPage.jsx`
- `frontend/src/contexts/OnboardingContext.jsx`
- `frontend/src/components/navigation/SmartHeader.jsx`
- `frontend/src/components/navigation/MobileNavMenu.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/lib/avatarUtils.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/authService.js`
- `frontend/src/services/organizationsService.js`
- `frontend/src/services/onboardingService.js`
- `frontend/src/services/verificationService.js`
- `frontend/src/services/orgVerificationService.js`
- `frontend/src/services/adminService.js`
- `frontend/src/services/rbacPatterns.js`
- `frontend/src/services/displayIdService.js`

Secondary files only if the primary pass requires them:

- `frontend/src/App.js`
- `frontend/src/config/navigation.js`
- `frontend/src/config/routes.jsx`
- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/hooks/useAdmin.js`
- `frontend/src/hooks/useContextAction.js`
- `frontend/src/utils/errorHandler.js`

## Explicitly Excluded

Do not include these in the first implementation slice:

- Auth admin user creation, role grant, invite link generation, or email delivery.
- Edge Function source edits or deployment for `invite-user`, `check-user`, or any adjacent identity function.
- Onboarding submit writes, existing-facility claim writes, verification-document upload, or Storage policy repair.
- Provider or facility approve/reject mutation repair.
- Organization create/update/delete mutation repair.
- Profile role, BVN, suspension, deletion, or bulk operation mutation repair.
- Reports, CSV exports, analytics feeds, Growth/Pulse actions, or Quick Verify mode implementation.
- Historical repair of hospital-as-organization rows.
- Schema, RLS, trigger, migration, backfill, cleanup, seed, or reset work.

## First Safe Slice

Build or identify one Console identity projection boundary before widening behavior. Acceptable shapes include a service plus hook or a pure helper consumed by `AuthContext` and route/action owners.

The projection must separate:

- Supabase Auth session identity.
- `profiles` row identity.
- `profiles.organization_id` as organization scope only when proved to reference `organizations.id`.
- Facility/hospital identity as a separate `hospital_id` or facility link.
- Route entitlement.
- Panel visibility.
- Action capability.
- Read-only versus unavailable versus denied states.
- Diagnostic redaction state.

Required projection fields:

| Field | Meaning |
| --- | --- |
| `authState` | `loading`, `signedOut`, `sessionReady`, `profileMissing`, `profileError`, or `ready`. |
| `actorRole` | Backend-confirmed role only. No hard-coded email elevation and no profile-error fallback elevation. |
| `actorProfileId` | Current profile UUID when loaded. |
| `actorOrganizationId` | Organization UUID only after organization relationship proof. |
| `actorFacilityIds` | Facility/hospital ids separately from organization id. |
| `identityIntegrity` | `valid`, `missingProfile`, `missingOrganization`, `hospitalAsOrganizationSuspected`, or `unknown`. |
| `routeAccess` | Allowed, read-only, unavailable, or denied per route. |
| `panelAccess` | Same authority as route/action owners, not separate ad hoc checks. |
| `commandCapabilities` | Named booleans plus disabled reasons for identity/org/verification commands. |
| `diagnosticPolicy` | Redacted dev diagnostics only; no ordinary identity payload logging. |

## Command Capability Matrix

Every visible command in this pass must consume a capability state. A truthy callback is not a capability.

| Command or affordance | First-slice disposition | Receiver proof required before enabling |
| --- | --- | --- |
| View users | Retain as read projection only. | Server-paged profile projection, total counts, role/org scope and field exposure. |
| Create user | Disable. | Auth-backed create/invite receiver, profile creation/reflection and audit trail. |
| Invite user | Disable or make explicitly unavailable. | Deployed `invite-user` slug, authenticated authorization, email delivery/link state, role grant and organization/facility assignment reflection. |
| Edit profile/user role | Disable unless field is own-user safe edit. | Admin profile receiver with field allowlist, role authority and reflected read. |
| Delete/suspend/activate user | Disable. | Authorized destructive receiver, audit evidence and refreshed read. |
| Bulk user operations | Disable. | Per-row result contract, partial failure display and audit/refetch behavior. |
| View organizations | Retain as read projection only. | Paged organization registry with wallet preview state explicitly optional/degraded. |
| Create/edit/delete organization | Disable. | Organization receiver, RLS/RPC proof, wallet initialization consequence and reflected read. |
| Growth/Pulse organization panel actions | Disable/remove. | Report/analytics receiver with scope, redaction and mounted route. |
| Provider verification approve/reject | Disable unless actor and receiver agree. | Provider verification receiver, provider/person copy, audit event and queue refresh. |
| Facility verification approve/reject | Disable unless actor and receiver agree. | Facility verification receiver, organization linkage, dispatch-readiness semantics and queue refresh. |
| Verification bulk approve/reject | Disable. | Bulk command receiver with per-row result and audit. |
| Verification list/table delete | Remove. | Destructive receiver and reflected read. |
| Verification export/realtime feed | Keep unavailable. | Export/feed receiver, role scope, data minimization and delivery path. |
| Quick Verify | Disable/relabel as normal queue link. | Query-param route receiver or explicit quick-review controller. |
| Onboarding existing facility claim | Keep unavailable. | Canonical selected-facility claim/link receiver that consumes selected id. |
| Onboarding submit success claims | Relabel/unavailable until reflected truth exists. | Separate organization id, facility id, profile id, wallet state and verification state. |
| Security password/MFA | Retain only as own-user Auth adapter exception. | Loading, secret display, failure, recovery and no raw Auth diagnostics. |
| Avatar fallback | Retain stored avatar and initials only by default. | Privacy-approved app-owned media fallback; no username/email/profile seed to third party. |

## Field And Parser Gates

Do these checks before editing:

```powershell
rg -n "JSON\.parse|Number\(|new Date\(|\|\||organization_id|hospital_id|verification_status|bvn_verified|avatar_url|image_uri" frontend/src/components/pages/UsersPage.jsx frontend/src/components/pages/OrganizationsPage.jsx frontend/src/components/pages/VerificationQueue.jsx frontend/src/components/modals/InviteUserModal.jsx frontend/src/components/modals/SecurityModal.jsx frontend/src/contexts/AuthContext.jsx frontend/src/contexts/OnboardingContext.jsx frontend/src/services/onboardingService.js frontend/src/services/verificationService.js frontend/src/services/orgVerificationService.js frontend/src/lib/avatarUtils.js
```

Rules:

- Never treat `hospital_id` as an organization id.
- Never treat `profiles.organization_id` as valid until the organization relationship is proved.
- Never collapse provider verification, organization approval and facility dispatch certification into one `verified` label.
- Never show capped rows, loaded rows or local slices as total identity, organization, trust or network truth.
- Never parse or coerce an invalid date/amount/count into a believable KPI.
- Never use object truthiness to choose identity/facility/organization payloads when field validity matters.
- Every surviving external URL, avatar URL, report URL or export URL needs a privacy and role-scope decision.

## UI And Copy Gates

The first implementation must make the UI less misleading even when capability remains unavailable.

Required copy changes:

- Provider verification means provider/person readiness, not facility dispatch certification.
- Facility verification means facility/hospital readiness, not legal organization approval unless the source proves that exact lane.
- Invite success must not say "sent" unless email delivery is proved. Distinguish generated link, delivered email, role granted and organization linked.
- Organization/wallet/network metrics must label current page, recent window, unavailable state or server aggregate basis.
- Own-user security messages must be bounded and recoverable without dumping Auth provider errors.
- Onboarding success must not present a hospital-shaped object as canonical organization identity.

Required interaction changes:

- Every disabled command needs visible reason or unavailable-state copy.
- Every retained command needs immediate pending feedback.
- Mobile and desktop variants must consume the same capability state.
- View-mode switches must not expose actions hidden in another variant.
- Context panel actions must not be more powerful than the route they navigate to.

## App Consequences

Pass 4 changes can affect `ivisit-app` even when no app code is edited.

Check these consequences before implementation:

- App wallet, pricing, provider, dispatch and visit flows depend on true organization scope. A hospital UUID in `profiles.organization_id` can break downstream scoping.
- Facility verification and provider verification drive different app meanings. Do not make a provider BVN approval look like dispatch facility readiness.
- Organization wallet creation belongs to organization provisioning, not hospital-only onboarding.
- Public review/demo app auth is not Console operator auth, invite, onboarding or privilege proof.
- Dashboard/recent-activity identity metadata must not become broadly visible app-facing evidence merely because a writer logged it.

## First Implementation Package

### Package 4.1 - Identity Projection And False Capability Removal

Allowed:

- Add a projection helper/hook/service for auth/profile/org/facility identity and action capability.
- Remove hard-coded email role promotion from ordinary runtime.
- Remove fallback elevated role construction on profile fetch failure.
- Convert route/nav/panel/action checks to consume one projected capability where touched.
- Disable or remove false/no-op commands in `VerificationQueue`, `VerificationPanel`, `OrganizationsPanel`, and visible user/organization variants.
- Replace identity-bearing ordinary console logs with redacted, development-gated diagnostics.
- Replace external generated avatar fallbacks with initials or app-owned safe fallback where touched.
- Repair visible mojibake in touched identity/security/onboarding/verification files.

Blocked:

- Any write receiver implementation listed in the excluded section.
- Any migration or backend repair.

Acceptance:

- A failed profile read never grants `admin` or `org_admin`.
- Route, navigation, context panel and visible action access agree for the same actor.
- A hospital id cannot be submitted or displayed as organization scope.
- Verification delete and bulk controls are not visible as working commands without receivers.
- Invite/onboarding/organization mutation commands are unavailable until receiver proof exists.
- Browser console does not emit operator email, selected user object, profile payload, Auth error object, avatar URL, facility-search payload or onboarding receiver payload in normal runtime.

### Package 4.2 - Read Projection Repair

Begin only after Package 4.1 is clean.

Allowed:

- Move user registry rows/counts behind a paged identity projection.
- Move organization registry rows/counts/wallet preview behind a paged organization projection.
- Keep wallet preview optional and labelled degraded when wallet join fails.
- Normalize verification queue projections so provider/facility lanes have distinct labels and command states.

Blocked:

- Create/edit/delete/approve/reject/invite/onboard writes.

Acceptance:

- Loaded row count is not rendered as global truth.
- Mobile and desktop consume the same projected counts and disabled reasons.
- Verification statistics state their lane and source.

### Package 4.3 - Receiver Planning Only

This is not runtime implementation. Produce follow-up receiver specs for:

- Auth-backed invite and profile creation.
- Organization provisioning and wallet initialization.
- Existing facility claim/link.
- Provider verification command.
- Facility verification command.
- User role/status/destructive operations.
- Export/report/Quick Verify operations.

Each spec must name payload fields, receiver, role authorization, audit event, reflected read, failure copy and test path.

## Verification

Docs-only checklist verification:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_4_IDENTITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_4_IDENTITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
```

Runtime implementation verification, once code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
rg -n "console\.log|console\.warn|console\.error" frontend/src/contexts/AuthContext.jsx frontend/src/components/common/ProtectedRoute.jsx frontend/src/components/pages/UsersPage.jsx frontend/src/components/pages/OrganizationsPage.jsx frontend/src/components/pages/VerificationQueue.jsx frontend/src/components/modals/InviteUserModal.jsx frontend/src/components/modals/SecurityModal.jsx frontend/src/contexts/OnboardingContext.jsx frontend/src/services/onboardingService.js
npm run build
```

Browser smoke, no mutation:

- Login/session restore with valid profile.
- Login/session restore with simulated missing/failed profile state if possible without DB mutation.
- `/users` desktop and mobile read-only view.
- `/organizations` desktop and mobile read-only view.
- `/verification` provider and facility tabs on desktop and mobile.
- `/settings` own-user security modal open/close, password mismatch and MFA initial state without enrollment.
- Context panel actions for users, organizations and verification.
- Browser console scan for identity, Auth, avatar, onboarding and verification payload leaks.

## Commit Boundary

Commit Package 4.1 as one coherent identity capability checkpoint only after the first safe slice is implemented and verified. Package 4.2 and Package 4.3 should be separate checkpoints unless a small read-projection edit is inseparable from the identity projection.

This checklist itself belongs to the implementation-plan pack and may be committed with the checklists index after docs-only verification.
