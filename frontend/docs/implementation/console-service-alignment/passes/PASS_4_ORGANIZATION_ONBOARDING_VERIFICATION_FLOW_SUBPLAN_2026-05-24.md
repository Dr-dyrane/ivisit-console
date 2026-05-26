# Pass 4 Organization, Onboarding, And Verification Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, Auth admin call, Edge Function, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers organization registry, onboarding, profile/admin identity, provider verification, facility verification, RBAC helper usage, display IDs, and readiness for provider operations.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/OrganizationsPage.jsx`
- `frontend/src/components/pages/VerificationQueue.jsx`
- `frontend/src/components/pages/UsersPage.jsx`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/components/mobile/MobileOrganizations.jsx`
- `frontend/src/components/mobile/MobileVerification.jsx`
- `frontend/src/components/mobile/MobileUsers.jsx`
- `frontend/src/components/mobile/MobileSettings.jsx`
- `frontend/src/components/common/ProtectedRoute.jsx`
- `frontend/src/components/navigation/SmartHeader.jsx`
- `frontend/src/components/navigation/MobileNavMenu.jsx`
- `frontend/src/lib/avatarUtils.js`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/config/navigation.js`
- `frontend/src/components/modals/UserModal.jsx`
- `frontend/src/components/modals/InviteUserModal.jsx`
- `frontend/src/components/modals/SecurityModal.jsx`
- `frontend/src/components/onboarding/OrganizationDetailsStep.jsx`
- `frontend/src/contexts/OnboardingContext.jsx`
- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/services/organizationsService.js`
- `frontend/src/services/onboardingService.js`
- `frontend/src/services/verificationService.js`
- `frontend/src/services/orgVerificationService.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/adminService.js`
- `frontend/src/services/authService.js`
- `frontend/src/services/displayIdService.js`
- `frontend/src/services/rbacPatterns.js`
- `frontend/supabase/functions/payments/index.ts`
- `frontend/supabase/functions/discovery/index.ts`
- `frontend/supabase/functions/README.md`

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
- `VerificationPanel` renders a disabled `Export (Coming Soon)` action and a `Real-time feed coming soon` placeholder over identity/approval data; `OrganizationsPanel` renders clickable `Growth` and `Pulse` affordances without handlers. These are unavailable identity/approval capabilities, not proved analytics or export receivers.
- `/organizations` is live and admin-visible in `App.js`/navigation but absent from the dormant `config/routes.jsx` doctrine; authentication/onboarding entries are similarly incomplete there.
- The shared Quick Verify action only navigates to `/verification?quick=true`; no query-param receiver was found in `VerificationQueue`, so it does not currently enter a distinct review operation.
- Privileged user lists fetch up to `1000` profiles, paginate locally and derive totals/statistics from that loaded subset; organizations load all organization and wallet rows before local slicing. Verification queues already accept server page/limit/count inputs.
- `AuthContext.fetchProfile` directly elevates one hard-coded email address to `admin` and, on profile-flow error, constructs a fallback profile with `org_admin` for other users; a read failure can therefore create client-visible privilege.
- `AuthContext` logs signed-in email/profile bootstrap state in the browser, `ContextPanel` logs the selected user object from user actions, and mounted desktop `SettingsPage` logs the resolved avatar URL on load/failure; identity/media exposure must be removed with the role-authority repair.
- `verificationService.verifyProvider()` writes approved-provider activity metadata including provider email and username through `logProviderActivity`; because dashboard recent activity is live, verification audit evidence needs an identity-minimized, role-scoped display projection rather than broad identity metadata in a general feed.
- Shell/user identity surfaces use third-party avatar fallbacks: `SmartHeader` and `MobileNavMenu` construct `ui-avatars.com` URLs from the profile username, while `avatarUtils` may construct DiceBear URLs from profile or user identity seeds. This is identity-data disclosure to external media providers unless replaced or explicitly approved.
- `InviteUserModal` labels its selector `Organization Assignment` but loads the options from `getHospitals({ limit: 100 })` and submits the selected hospital id as `metadata.organization_id`.
- `OrganizationDetailsStep` and `onboardingService.searchHospitalsByName` classify claim status from `verified` only while live hospital truth includes `verification_status`; a pending facility can be presented as available to claim.
- Provider verification service read/capability checks permit `admin`, `org_admin`, and `sponsor`, while live `/verification` route access is `org_admin` or above and the provider and organization approve/reject services require `isAdmin()` for mutation; org admins can reach controls that will be rejected and sponsor semantics conflict between service and route.
- Both verification services page the visible queue but load unbounded rows again to derive statistics, and the page subscribes to provider and organization queues even while one tab is active.
- `MobileUsers.jsx:107-157,194-219` falls back from missing statistics to the supplied user rows for totals, verified and active counts, then labels derived verification trend values `LIVE`. The responsive user registry cannot turn a capped/admin page into identity-system aggregate truth.
- `OrganizationsPage` exposes direct organization create/edit/delete over service CRUD, reports a hard-coded `99.8%` network-health KPI, and calculates wallet/network values from the unbounded organization-plus-wallet collection.
- `MobileOrganizations` is a mounted route variant that receives the same unbounded/local-paged collection, renders wallet float, revenue-share and "Network Dynamics" trend claims, and exposes create/edit/delete through the page callbacks for `canManage` actors. Mobile presentation does not narrow the organization command or aggregate risk.
- `MobileVerification` is a mounted queue variant that renders provider/facility approval controls, "LIVE" and "Trust Dynamics" metrics, and locally calculated period trends from currently loaded rows. It receives the same per-row command handlers as desktop, so command-role drift and facility-versus-organization copy persist on mobile.
- `MobileSettings` is a mounted own-user identity surface for every settings actor. It renders profile/email/phone/role/verification claims and opens profile, security and support receivers; for provider actors it opens a view-only `DoctorModal`, while desktop mounts editable `DoctorProfileCard`. This responsive capability split must consume the same identity/provider authority rather than hide an alternate policy.
- `InviteUserModal` and `adminService` address `/functions/v1/invite-user`, but the only inspected handler source is `frontend/supabase/functions/payments/index.ts`; its immediate folder does not prove deployment under the addressed slug. That source proceeds without authorization when no header is supplied and returns a generated link while email delivery is commented out.
- `adminService` exposes broad user suspension/activation/deletion, role mutation, verification, analytics, audit-log and export APIs through `useAdmin`, but the source scan found no rendered importer for `useAdmin`; the proved live `adminService` consumer is `DoctorModal` invite. Do not implement or count the unmounted admin API family as a live user flow while repairing direct `UsersPage`/verification paths.
- `SettingsPage` actively mounts `SecurityModal`, which invokes Supabase Auth MFA enrollment/challenge/verification/unenrollment and password change as own-user Auth operations. These direct Auth SDK actions are legitimate only with assurance-aware feedback, secret handling and failure states; they are not evidence for broad admin table authority.
- `LoginPage` addresses `check-user`, but the only inspected handler source is `frontend/supabase/functions/discovery/index.ts`; its immediate folder does not prove the addressed deployment slug. The handler uses service-role profile/Auth inspection to expose existence/role/password-inference signals at the login boundary.
- `handle_new_user()` creates each new profile with `role = raw_user_meta_data.role` when provided. Normal Console self-signup does not supply role, but the inspected invite handler accepts role input and embeds it into Auth invite metadata; combined with its unauthenticated-continuation path, this is a potential server-side privilege-seeding path, not only a broken email toast.
- `handle_new_organization()` creates organization wallets only after an `organizations` insert, while Console onboarding currently inserts a `hospitals` row and writes its id into `profiles.organization_id`; the visible successful registration path cannot prove organization identity or wallet initialization.
- Existing source contains corrupted rendered characters in verification status comments/organization KPI copy and auth denial decoration; implementation must repair visible encoding while preserving the audit evidence.

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
| Source-present admin API family | `adminService` contains audit/export/destructive/verification APIs through an unmounted `useAdmin` hook while live pages use other command paths. | Keep dormant methods outside capability claims; consolidate only the mounted identity workflows through proven receivers. |
| Own-user security settings | `SecurityModal` is live and invokes Auth password/MFA enrollment and unenrollment directly. | Canonical Supabase Auth adapter exception with MFA assurance, secret-display and reflected-session feedback explicitly verified. |
| Route and panel authority | Live route/navigation and context-panel role checks disagree for identity/verification/settings surfaces; dormant route config is incomplete. | One explicit access authority for route, nav and panel composition, with own-user settings separated from admin operations. |
| Identity/verification panel affordances | Verification export/feed are placeholders and organization Growth/Pulse actions have no receiver. | Keep unavailable or remove until authorized projection/export/report receiver and role scope are explicit. |
| Quick verification entry | Context action advertises a quick workflow through an unconsumed query flag. | A mounted, authorized verification queue state or no Quick Verify action. |
| Identity and organization pagination | User and organization management mix capped/unbounded client collections with management totals. | Server-paged admin projections with true counts; preserve verification service paging with scoped invalidation. |
| Session/profile fallback role | Auth context upgrades role from hard-coded email or failed profile read. | Backend-authoritative identity projection; a loading/error state never grants a role. |
| External avatar fallback identity | Header/menu and shared avatar utility can transmit username or profile/user seed to third-party avatar endpoints. | App-owned media fallback or approved privacy-scoped avatar projection that does not disclose operator identifiers unnecessarily. |
| Invite organization assignment | Organization-labelled selector submits a hospital id into `organization_id`. | Organization-backed assignment selector and receiver payload with facility linkage explicit when needed. |
| Onboarding facility claim | Search treats every non-verified hospital as unclaimed. | Verification-status-aware claim boundary preventing pending/claimed facility takeover. |
| Queue visible mutation rights | Org-admin/sponsor route/read permission differs from admin-only verification commands. | Role-correct read-only or command-enabled queue controls derived from actual receiver authority. |
| Organization health/KPI promise | Organization route displays hard-coded health alongside unbounded wallet-derived totals. | Verified aggregate source or unavailable state; no fabricated operational health. |

## Surface Read, Exposure, And Operation Closure

| Surface and mounted path | What it reads and renders now | Mutation or receiver path | Deterministic audit result |
| --- | --- | --- | --- |
| Auth bootstrap and `ProtectedRoute` | Auth context reads/creates profiles and exposes role/onboarding state used by navigation and protected routes. | Direct profile upsert/update and hard-coded/error fallback role projection. | **Blocked, highest authority risk.** A client-side fallback or email check cannot grant `admin` or `org_admin`; route claims are untrustworthy until backend role truth is exclusive. |
| Browser identity diagnostic output | Auth bootstrap emits operator email/profile state, ContextPanel can emit selected user objects, and desktop settings logs resolved avatar URLs to the browser console. | No authorized identity workflow receiver requires browser logging. | **Exposure blocker.** Remove identity/media-bearing logs or retain only explicitly gated/redacted development events before identity surfaces are complete. |
| Shell/user avatar rendering | Header, menu and identity surfaces render stored avatars or external generated fallbacks. | External avatar request can include username or profile-derived seed when stored media is absent or failed. | **Exposure gate.** Replace with app-owned fallback or explicitly approve a non-identifying external seed policy before identity surfaces are considered private by default. |
| `/users` desktop/mobile management | Profiles, organizations map, role/BVN/provider labels and statistics; privileged path loads up to `1000` then slices client-side. Mobile derives active/verified totals and `LIVE` trend language from received rows when statistics are absent. | Invite, create/edit, direct privileged delete RPC and bulk operations. | **Blocked.** Counts/bulk scope can truncate, mobile can publish current-window identity KPIs as live truth, and CRUD/auth ownership must remain invite/admin-receiver backed. |
| `InviteUserModal` | Email, role and `Organization Assignment` selection sourced from a hospital list. | Invokes `invite-user` with selected hospital id in `metadata.organization_id`. | **Blocked.** It can assign an organization-scoped user to facility identity and falsely report scoped invitation success. |
| Invite and login Edge boundaries | Invite UI/admin service and login screen invoke `invite-user` / `check-user`. | Inspected sources are housed under differently named Console function directories; invite permits unauthenticated continuation/no mail send, while check-user exposes identity/password classification through service-role inspection. | **Blocked, receiver/topology/security gate.** Prove or replace deployed slugs, require appropriate authorization/rate/privacy policy, and derive feedback only from true delivery/session outcomes. |
| Auth-trigger role and organization initialization | Enrollment appears to create a scoped operator and facility association. | New-user trigger accepts role metadata; invite supplies role metadata; new-organization trigger initializes wallets only for `organizations`, while onboarding writes a hospital id as organization scope. | **Blocked, L5 authority chain.** A signup/invite cannot grant operator privilege or organization ownership until role issuance and organization/facility/wallet creation are canonical and receiver-authorized. |
| `/organizations` registry | All organizations plus all wallets, local search/page/KPIs, network float and static network-health display. | Direct organization service create/update/delete controls. | **Blocked.** Pagination/aggregates are not authoritative, hard-coded health is false display truth, and guarded command authority is unproved. |
| `/organizations` mobile registry | Locally growing slice of the same organization/wallet collection; renders wallet float, average revenue share, active ratios and live/trend language. | Uses page create/edit/delete callbacks for admin-capable users and opens page analytics. | **Blocked responsive aggregate/command boundary.** Mobile metrics are not measured network truth and commands need the same guarded organization receiver/audit contract as desktop. |
| Public onboarding wizard facility match | Searches hospital records, renders claim status and entered organization details. | Creates/links through onboarding service and uploads verification evidence. | **Blocked.** Organization-versus-facility identity is ambiguous and pending verification status is ignored when claiming a facility. |
| `/verification` provider tab | Pages provider profiles and renders BVN/identity verification queue plus stats. | `verifyProvider` writes `profiles.bvn_verified`; command requires admin. | **Blocked.** Org admins can reach actionable controls without receiver authority, while sponsor allowance differs between service and route; stats are independently unbounded. |
| `/verification` organization tab | Pages `hospitals` under the Organizations label and derives hospital status stats. | `verifyOrganization` updates hospital verification/verified fields; command requires admin. | **Blocked.** Facility verification is mislabeled as organization approval and changes dispatch-eligibility inputs without exposing derived operational effect. |
| `/verification` mobile queue | Renders provider and "organization" tabs with approval/pending KPIs, local trust-dynamics trends and row-level approve/reject buttons. | Receives `handleVerify` / `handleVerifyOrg` directly; no separate mobile authority exists. | **Blocked responsive authority/copy boundary.** Mobile must label facility readiness accurately and hide/disable commands for actors not authorized by the receiver; loaded-row trends are not live aggregate proof. |
| `/settings` mobile own-user identity surface | Renders the active profile's role, verification, email, phone and display id; opens profile, security, support and provider professional-profile detail. | Mounted identity/auth/support modal receivers; provider doctor detail is view-only in mobile while desktop exposes editable provider card. | **Cross-pass gate.** Own-user identity/modal actions require backend-confirmed role and field exposure; deliberate mobile/desktop provider self-service parity is owned with Pass 5. |
| Verification panel and Quick Verify entry | Context panel visibility is stricter than route/nav; shared action navigates with `?quick=true`. | No found queue consumer for quick mode. | **Blocked.** Valid users can lose context and visible quick-review action is a no-op mode. |
| Verification/organization panel report affordances | Verification panel exposes disabled export/feed placeholders; organization panel exposes active-looking Growth/Pulse buttons without click handlers. | No export/report/analytics receiver proved for these panel operations. | **Unavailable operation.** Sensitive identity/approval data cannot be exported or reported through inert or unscoped controls. |
| Verification bulk selection actions | Provider queue renders Approve Selected and Reject Selected for `canVerify`; each handler only emits a success toast and clears selection. | No bulk verification receiver is invoked by `VerificationQueue.jsx:829-863`. | **False-success command blocker.** Disable bulk actions until a guarded bulk command persists and refreshes each result, or implement per-row command aggregation with failure reporting. |

## App And Operations Dependency Closure

| Downstream truth affected by identity work | Shared/app evidence | Console implementation obligation |
| --- | --- | --- |
| Facility dispatch eligibility | App hospital projection consumes `dispatch_eligible`; shared hospital trigger derives it from emergency eligibility, verification and status. | Verification UI must expose facility readiness consequence distinctly from person/BVN or organization identity approval. |
| Facility/pricing/wallet scope | Facility services and patient quotes are hospital-scoped while organization wallets and permissions are organization-scoped. | Never assign a hospital UUID where a profile, invite or wallet receiver expects organization UUID. |
| Onboarding claim safety | Current hospital schema includes `verification_status` and provider taxonomy/source state. | Facility matching must block pending/claimed records from competing registration and preserve provenance/readiness state. |
| Provider operations | Emergency/fleet passes depend on authenticated role and scoped organization/facility authority. | No downstream operation can be considered implementable while client role fallback or ambiguous ownership remains. |

## Pass 4 Deterministic Surface Register

| Surface family | Read/render closure | Command/receiver closure | Pagination/role closure | Status |
| --- | --- | --- | --- | --- |
| Auth/profile route gate | Role derivation and route consumers traced. | Direct update/upsert/fallback paths identified. | Client privilege fallback blocks every scoped surface. | Blocked - priority |
| Users and invite | Exposed fields/options/statistics traced. | Invite/delete/create/edit paths mapped. | `1000` cap and hospital-as-org invite confirmed. | Blocked |
| Organizations registry | Rendered KPIs/wallet joins traced. | Direct service CRUD mapped. | Unbounded local pagination and fabricated health confirmed. | Blocked |
| Organizations mobile variant | Wallet/revenue/active trend claims mapped. | Receives admin CRUD and analytics callbacks. | Grows from locally sliced unbounded collection. | Blocked |
| Onboarding facility match | Visible claim and document expectations traced. | Organization/facility write chain remains ambiguous. | Pending status ignored in claim availability. | Blocked |
| Provider verification queue | Render and profile write path traced. | Admin-only mutation versus broader visible access. | Page window exists; stats/subscriptions overfetch. | Blocked |
| Facility verification queue | Hospital render/write path traced. | Verification affects dispatch eligibility inputs. | Label/role/stat ownership incomplete. | Blocked |
| Mobile verification variant | Provider/facility render, local trends and action controls traced. | Reuses per-row approve/reject receivers. | Responsive copy/role/aggregate parity incomplete. | Blocked |
| Mobile settings identity surface | Own-user identity, modal and provider-detail actions traced. | Profile/security/support are active; provider detail differs from desktop editing. | Backend role truth and Pass 5 self-service parity required. | Blocked dependency |
| Context/Quick Verify | Event/navigation surface traced. | Quick mode has no found receiver. | Role composition inconsistent with live route. | Blocked |
| Verification bulk approve/reject | Selected provider exposure traced. | Buttons currently toast success and clear selection without mutation. | Receiver absent and copy false. | Blocked - disable first |

## Cross-Pass Identity Register

| Dependent pass | Identity dependency that must not be lost |
| --- | --- |
| Pass 1 - emergency lifecycle | Dispatcher/clinician authorization and hospital/organization identity used for cash and handoff commands. |
| Pass 2 - wallet and ledger | Organization wallet and Stripe ownership; no facility id accepted as organization scope. |
| Pass 3 - facilities/pricing | Facility verification, taxonomy and dispatch eligibility; hospital-scoped prices under organization authority. |
| Pass 5 - fleet/providers | Provider role, hospital assignment, doctor identity and telemetry scope. |
| Pass 6 - visits | Authorized clinical projection and patient/provider linkage. |
| Pass 7 - support/content/insurance | Policy billing scope and role-correct administrative communication. |
| Pass 8 - shell/analytics/search | One route/nav/panel authority and no aggregate based on failed/fallback role truth. |

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
| Export identity/verification data or open organization analytics | Unavailable until proved | No mounted scoped export/report receiver for panel placeholders | Hide/disable until actor scope, permitted fields, completeness/redaction and mounted receiver exist. |
| Bulk approve/reject selected verification rows | Workflow command, currently unsupported | Guarded verification command or deliberate per-row command execution with aggregate results | Never show approved/rejected success copy when no receiver ran; disable immediately until exact mutation/refetch/audit contract exists. |
| Enter Quick Verify | Workflow entry point | Verified queue mode tied to the correct person/facility lane | Do not advertise quick review until the queue consumes and renders that state. |
| Resolve session role and onboarding eligibility | Identity/auth read projection | Backend profile/Auth/RLS-backed authority | Loading or failed profile lookup renders unavailable/denied state, never elevated role. |
| Select invite assignment scope | Workflow command input | Canonical organization selector and invite receiver | A facility row cannot masquerade as organization assignment metadata. |
| Show organization health or totals | Backend-derived projection | Paged registry plus guarded aggregate source | No hard-coded health claim or incomplete wallet collection displayed as total. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Profile/auth identity | auth-backed profile `id`, role, `organization_id`, `provider_type`, onboarding and BVN state; only RPC-supported editable columns | Do not expose email/avatar/name-component saves or direct other-user writes where the audited admin receiver does not persist or authorize them. |
| Organization/facility chain | `organizations.id`, hospital `organization_id`, hospital verification and dispatch/emergency eligibility, organization wallet relationship | A hospital UUID never occupies `profiles.organization_id`; facility verification is distinct from person/BVN review. |
| Invitation/onboarding completion | invite actor scope, role/org/provider metadata, email-delivery result, linked profile/org/hospital creation effects | Do not report an invitation sent or operational ownership established without receiver-backed email and identity linkage proof. |
| Identity/verification export and reporting | Actor role, organization scope, approved fields, redaction, page/full dataset scope, format and unavailable reason | Disabled/inert panel controls remain unavailable until a receiver protects sensitive user and verification fields. |
| Verification bulk command | Selected ids, active queue/lane, actor authority, allowed target state, per-row result/failure, audit record and refreshed row/count state | Current toast-only bulk controls are unavailable; do not persist or advertise batch approval/rejection without a guarded command contract. |
| Initial role and organization wallet authority | authorized invite grant, default new-user role, canonical `organizations.id`, facility relationship and `organization_wallets` initialization result | Never trust browser fallback or unguarded invite metadata for role; never mark organization onboarding complete from a hospital-only insert that cannot fire organization-wallet creation. |

## Field-To-UI And Payload-To-Receiver Closure For First Slice

The first Pass 4 slice must make identity scope trustworthy before any downstream implementation relies on it. Route access, wallet scope, facility ownership, provider operations and verification all depend on these fields being normalized at the boundary.

| UI field or action | Current render or payload site | Current assumption | Required projection or receiver contract |
| --- | --- | --- | --- |
| Session role | `AuthContext` projects role into `ProtectedRoute`, navigation, panels and page actions. | Browser fallback or hard-coded email can safely upgrade role. | `authIdentity.role` comes only from backend profile/Auth authority. Loading, missing or failed profile lookup renders pending/denied, never elevated access. |
| Route, nav and panel access | `App.js`, navigation config and `ContextPanel.canAccessPanel()` each define access differently. | A visible route implies its panel/actions are valid, and dormant route config can be reused as doctrine. | One `accessProjection` for route, nav, panel and action visibility, with own-user settings separated from admin operations. Dormant config cannot authorize runtime behavior. |
| Profile editable fields | `UserModal` renders email, role, org, provider type, BVN and demographic fields; `profilesService.updateProfile()` accepts more fields than the admin RPC persists. | Modal fields are saveable if present in UI/service allowlist. | `profileEditProjection.editableFields` must be derived from the actual admin receiver columns. Email/avatar/name-component changes are hidden or delegated to Auth/media owner unless receiver-backed. |
| Organization assignment in user modal | Modal options are facility-labelled and mapped through hospital/organization values. | A facility label can stand in for organization identity. | Selector must return canonical `organizations.id`, display organization name, and optionally show facility context separately. Duplicate facility rows must not create duplicate organization choices. |
| Provider type | User modal offers `ambulance`, `doctor`, `nurse`, `paramedic`. | UI enum is valid profile truth. | `providerTypeOptions` must come from current schema/receiver enum; unsupported `nurse` is removed or mapped through an approved new receiver, and required `driver`/service types are exposed deliberately. |
| Invite assignment | `InviteUserModal` labels `Organization Assignment` but loads hospitals and sends `hospital.id` as `metadata.organization_id` for platform admins. | Hospital id in metadata is acceptable organization scope. | Invite payload uses canonical organization id plus explicit facility assignment if needed. UI copy distinguishes invite-created link, email delivered, role granted, and organization linked. |
| Invite role metadata | Edge source accepts role and can embed it into Auth metadata; new-user trigger reads role metadata. | Requested role can safely become profile role. | Invite receiver authorizes each role grant server-side; default user creation clamps role unless grant proof exists. No unauthenticated continuation can seed privileged role metadata. |
| Onboarding organization/facility creation | Onboarding service currently writes hospital-shaped organization truth and profile scope. | A completed hospital insert equals organization onboarding and wallet scope. | Onboarding result must include canonical organization row, facility row/link, profile organization id, verification state and organization-wallet initialization or explicit pending state. |
| Facility claim status | OrganizationDetailsStep treats `verified` as claim state. | Not verified means claimable. | Claim projection uses `verification_status`, ownership/provenance and pending states. Pending or claimed facilities cannot be silently taken over. |
| Organization registry totals and wallet values | Organizations page loads all orgs/wallets, slices locally, and displays network health. | Loaded collection equals complete registry and wallet truth. | `organizationListProjection` is server-paged with true count; wallet/health aggregates come from proved aggregate source or render unavailable. No hard-coded health KPI. |
| Verification provider tab | Provider queue reads profiles and exposes approve/reject controls. | Provider identity/BVN verification equals operational readiness. | `providerVerificationProjection` separates read visibility from admin mutation authority and labels BVN/person credential status only. |
| Verification organization tab | Organization tab reads hospitals and writes hospital verification fields. | Facility approval equals organization approval. | `facilityVerificationProjection` labels facility readiness, dispatch/booking consequences and organization relationship explicitly. |
| Mobile verification metrics/actions | `MobileVerification` renders "LIVE"/trust metrics and approve/reject controls from queue props. | Mobile layout can treat loaded rows and the same desktop callback set as complete authority. | Mobile consumes the same `providerVerificationProjection` / `facilityVerificationProjection`, action capability and bounded aggregate state; no separate local trend or command meaning. |
| Mobile organization metrics/actions | `MobileOrganizations` renders network/wallet/revenue claims and CRUD controls from page props. | Loaded organizations and wallets represent complete network truth and safe admin action scope. | Mobile consumes the server-paged organization projection, receiver capability and source-labelled aggregates; unproved trends/analytics remain unavailable. |
| Mobile own-user settings identity | `MobileSettings` renders role/verified/contact claims and opens profile/security/support/provider detail. | Desktop and mobile may expose different provider mutation authority without an explicit contract. | Identity fields use backend-confirmed projection; provider professional actions consume Pass 5 self-service/view authority consistently by viewport. |
| Quick Verify action | Context action navigates to `/verification?quick=true`. | Query param enters a quick-review mode. | Implement a consumed queue mode with lane and target, or remove/disable the action. No no-op workflow entry. |
| Display ID | Multiple services call a hospitals-only bulk display-ID resolver with profile/provider ids. | Any UUID can resolve through hospital display IDs. | Display ID resolver is entity-aware: profile/provider/org/facility ids resolve through their own source, and write payloads continue to use UUIDs. |
| External avatar fallback | Header/menu/avatar utility build third-party avatar URLs from username or identity seed. | External generated avatars are harmless presentation fallback. | Use app-owned fallback or non-identifying approved seed policy; identity-bearing profile fields are not sent to third-party avatar providers by default. |

Implementation rule: no downstream pass may use `profile.organization_id`, route role, provider type, invite metadata or organization wallet state until this pass provides normalized identity projections and blocks hospital-as-organization ambiguity.

Generated trace confirmation (May 25): `user_roles` now has a cross-repo table-flow trace with zero matched Console CRUD surfaces. Effective Console role changes remain with the approved Auth/profile/admin identity receiver; this pass must not add a parallel role-table editor.

Storage evidence confirmation (May 25): onboarding currently uploads verification files into `documents/organizations/{organization.id}/verification/*`, but no active App/Console Storage bucket/policy authority was found outside archive material. Evidence upload remains a private-command blocker until read-only deployed policy, actor scope, retention and cleanup proof is available.

## Exact Identity, Onboarding, And Verification Exhibits

These exhibits are the source anchors for the Pass 4 implementation handoff. They focus on identity-chain correctness, because every other pass depends on these ids and role claims being trustworthy.

| Exhibit | Current code location | Contract implication |
| --- | --- | --- |
| Route authority | `frontend/src/App.js:165-182` declares the live protected route map. | `App.js` is the runtime source for route access until route config is deliberately consolidated. |
| Protected route profile gate | `frontend/src/components/common/ProtectedRoute.jsx:27-70` waits for profile, checks navigation-derived access, then role/resource. | Route, nav and panel access must share one access projection; profile loading must never be treated as authorization. |
| Auth hard-coded admin elevation | `frontend/src/contexts/AuthContext.jsx:81-91` updates a specific email to admin in the browser profile flow. | Client code cannot grant platform role. This is the first implementation blocker. |
| Auth fallback elevated role | `AuthContext.jsx:134-142` builds a fallback profile with admin for one email and `org_admin` for others on profile-flow error. | A failed profile read must produce unavailable/denied state, never privileged access. |
| Identity-bearing browser logs | `AuthContext.jsx:63,180` logs account email during profile/session bootstrap; `frontend/src/components/navigation/ContextPanel.jsx:241` logs selected user objects; `frontend/src/components/pages/SettingsPage.jsx:205-217` logs the resolved avatar URL on load or failure. | Identity and identity-media location state must not be disclosed to local browser logs during ordinary use; remove or strictly redact/gate diagnostics. |
| Onboarding account creation | `frontend/src/services/onboardingService.js:63-111` signs up the admin and directly updates `profiles.onboarding_status`. | Auth/profile state must be receiver-backed and failure-aware; partial account creation needs recovery state. |
| Onboarding hospital search | `onboardingService.js:145-191` searches `hospitals` and checks `profiles.organization_id` against hospital ids. | This proves the current claim logic treats hospital ids as organization scope. It must be replaced by canonical organization/facility linkage. |
| Onboarding hospital-as-organization insert | `onboardingService.js:220-248` comments "Create organization record in hospitals table" and inserts into `hospitals`. | Onboarding completion cannot initialize organization wallet or legal organization truth from a hospital-only row. |
| Onboarding profile hospital id assignment | `onboardingService.js:250-264` sets profile `role: org_admin` and `organization_id: organization.id` where `organization` is the inserted hospital row. | This is the clearest hospital-id-versus-organization-id defect. Downstream wallet, pricing and provider scope cannot rely on this value until repaired. |
| Onboarding document upload | `onboardingService.js:266-281` uploads to `documents/organizations/{organization.id}/verification/*`. | Storage proof is required, and the path currently uses the hospital-shaped id. |
| Organizations service broad read | `frontend/src/services/organizationsService.js:86-107` reads all organizations and all wallets, maps balance in JS. | Organization registry needs server-paged rows and aggregate wallet projection; loaded collection is not complete truth. |
| Organization direct CRUD | `organizationsService.js:130-159` inserts/updates/deletes `organizations` directly from browser service. | Ordinary org CRUD needs admin workflow/RLS proof and auditability before implementation preserves these controls. |
| Mobile organization operational surface | `frontend/src/components/pages/OrganizationsPage.jsx:233-255` mounts `MobileOrganizations` with create/edit/delete and analytics callbacks; `frontend/src/components/mobile/MobileOrganizations.jsx:70-137,146-244,281-380` renders wallet/revenue/trend claims and admin controls. | Mobile is an active organization CRUD/aggregate surface and must be closed under the same scoped projection and command receiver as desktop. |
| Invite loads hospitals as organizations | `frontend/src/components/modals/InviteUserModal.jsx:23-34` loads `getHospitals({ limit: 100 })` for admin organization assignment. | The selector is mislabeled; it returns facility ids. |
| Invite sends facility id as organization id | `InviteUserModal.jsx:40-52` writes selected `organizationId` into invite metadata after it was chosen from hospital rows. | Invite receiver payload must use canonical organization id plus separate facility assignment if needed. |
| Invite success copy | `InviteUserModal.jsx:57-62` says invitation sent after Edge response. | Email-delivery and role-grant semantics must come from the receiver; link generated is not necessarily mail delivered. |
| Org verification queue read | `frontend/src/services/orgVerificationService.js:47-75` reads `hospitals` as organization verification rows with page/count. | This is facility verification unless paired with canonical organization relation. |
| Org verification queue stats | `orgVerificationService.js:87-102` rereads all hospital verification statuses for stats. | Stats need aggregate/count owner; all-row stats can drift from page authority and role scope. |
| Org verification command | `orgVerificationService.js:126-166` admin-checks then updates `hospitals.verification_status` and `verified`. | This command affects facility readiness and dispatch eligibility inputs, not just organization approval copy. |
| Org verification mojibake | `orgVerificationService.js:8-9` contains corrupted arrow characters in comments. | Implementation touching this file must run encoding repair/check. |
| Provider verification route actions | `frontend/src/components/pages/VerificationQueue.jsx:637-691` renders provider approve/reject buttons on the provider card. | Visible controls must be disabled/read-only for actors whose receiver will reject mutation. |
| Organization tab action | `VerificationQueue.jsx:763-778` renders hospital verification status and pending actions under organization language. | Copy and action state must label facility readiness, organization linkage and downstream dispatch consequence separately. |
| Mobile verification operational surface | `VerificationQueue.jsx:316-376` mounts `MobileVerification` with provider/facility approve/reject handlers; `MobileVerification.jsx:40-207,270-340` renders "LIVE"/trust metrics and invokes those handlers. | Mobile must not turn a loaded window into global trust metrics or expose role-drifting commands under friendlier layout. |
| Mobile settings identity/detail surface | `frontend/src/components/pages/SettingsPage.jsx:123-159` mounts `MobileSettings` and view-only provider `DoctorModal`; `frontend/src/components/mobile/MobileSettings.jsx:18-157` exposes identity, security, support and provider detail actions. | Preserve backend-confirmed identity and intentionally reconcile its provider action capability with the editable desktop provider card in Pass 5. |
| User management local filtering | `frontend/src/components/pages/UsersPage.jsx:80-117` filters loaded users in memory. | User search/filter/page/count need server-owned projections; local filtering over capped loads is not admin truth. |
| User stats fallback | `UsersPage.jsx:213-253` falls back to deriving role counts from loaded data. | Totals/statistics must be receiver-backed or labelled unavailable/current-window. |
| Mobile user metrics fallback | `frontend/src/components/mobile/MobileUsers.jsx:107-157,194-219` reduces supplied user rows for active/verified values and renders derived trends as `LIVE` when aggregate statistics are incomplete. | Responsive identity metrics must consume scoped user aggregates with completeness state or render current-page/unavailable language. |

## Identity Projection Boundary Target

The first executable slice should create a small identity/access projection that every downstream pass can trust before using `profile.organization_id`, `profile.role`, provider type, route access or verification state.

```ts
type ConsoleIdentityProjection = {
  auth: {
    userId: string | null;
    email: string | null;
    sessionState: 'loading' | 'ready' | 'missing' | 'error';
  };
  profile: {
    id: string | null;
    role: 'patient' | 'provider' | 'admin' | 'org_admin' | 'dispatcher' | 'viewer' | 'sponsor' | null;
    providerType: string | null;
    organizationId: string | null;
    onboardingStatus: 'pending' | 'complete' | 'skipped' | null;
    bvnVerified: boolean | null;
    source: 'backend_profile' | 'unavailable';
  };
  organizationScope: {
    organizationId: string | null;
    organizationDisplayId: string | null;
    primaryFacilityId: string | null;
    walletInitialized: boolean | null;
    state: 'ready' | 'missing_org' | 'hospital_id_mismatch' | 'pending_onboarding' | 'unavailable';
  };
  access: {
    routes: Record<string, boolean>;
    panels: Record<string, boolean>;
    actions: Record<string, 'enabled' | 'read_only' | 'hidden' | 'unavailable'>;
  };
};
```

Rules for implementation:

- `role` must be backend-confirmed only. No hard-coded email or fallback profile grants role.
- `profile.organization_id` must be validated as an `organizations.id` before finance, facility, fleet, visits, insurance or analytics code uses it as organization scope.
- If an existing profile points at a hospital id, the projection returns `hospital_id_mismatch` and disables organization-scoped money/provider commands until an explicit maintenance plan repairs it.
- Route, nav, panel and action visibility consume this projection or a derived helper from it.

## Onboarding And Invite Receiver Target

The safe onboarding/invite contract is not "write enough rows until the UI opens." It must return a durable identity chain:

```ts
type OrganizationProvisioningResult = {
  authUserId: string;
  profileId: string;
  role: 'org_admin' | 'provider' | 'viewer' | 'sponsor';
  organization: { id: string; displayId: string | null; name: string; walletState: 'ready' | 'pending' | 'missing' };
  facility?: { id: string; displayId: string | null; verificationStatus: string; dispatchEligible: boolean | null };
  verification: { lane: 'person' | 'organization' | 'facility'; status: 'pending' | 'verified' | 'rejected' };
  delivery?: { inviteLinkCreated: boolean; emailSent: boolean; emailProviderId?: string };
};
```

Implementation must not keep hospital rows as organization identity. The first safe path is:

- read-only projection that detects current valid organization/facility chain and mismatches;
- disable invite/onboarding/verification copy that promises role, email, wallet or dispatch readiness when the chain is incomplete;
- then separately repair the provisioning receiver after the audit confirms deployment, RLS and cleanup requirements.

## Implementation Packages

### 0. Auth And Session Authority Blocker

Remove all client-derived privilege grants before relying on any downstream scoped flow:

- no hard-coded email can upgrade a profile to `admin` from the browser
- profile-fetch timeout or failure renders a loading/unavailable/denied state, never fallback `org_admin` or `admin`
- missing profiles are created or recovered only through a proved Auth/profile receiver with explicit onboarding state
- route, navigation and panel access consume the same backend-confirmed role projection

Acceptance gate:

- No Console route, verification action, wallet view or organization command is enabled by a client-created elevated role.

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
- Mobile viewport smoke on organization registry, verification provider/facility lanes and settings identity/provider-detail actions, including role-denied command states and aggregate unavailable labels.
- Invite/create user flow with non-production account.
- Browser console smoke for authentication, user context actions and desktop settings avatar load/failure proves email/profile/user/media-location values are not emitted.

Backend/RLS/RPC/Auth:

- Read-only proof for `organizations`, `hospitals`, `profiles`, and wallet/org relationships.
- RLS tests for platform admin, org admin, sponsor/viewer, provider, and ordinary user paths.
- Auth-backed user creation/invite verification in non-production.
- Display ID resolution tests for profile, organization/facility, hospital, provider.

Stop conditions:

- Do not continue if organization id versus hospital id ownership is ambiguous.
- Do not approve verification semantics that grant dispatch readiness from the wrong field.
- Do not create or mutate Auth users outside an approved non-production test.
