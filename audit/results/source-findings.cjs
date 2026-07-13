const capturedAt = "2026-07-13T14:35:44Z";

function finding({
  id, actionId, route, role, locator, sourceComponent, crudOperation, payloadCase,
  failureClasses, severity, requestEvidence, responseEvidence, databaseEvidence,
  reproductionSteps, additionalPayloadCases = [], surfaceType = "mounted_ui"
}) {
  return {
    failureId: id,
    actionId,
    route,
    role,
    locator,
    sourceComponent,
    crudOperation,
    payloadCase,
    additionalPayloadCases,
    requestEvidence,
    responseEvidence,
    databaseEvidence,
    reproductionSteps,
    failureClasses,
    severity,
    surfaceType,
    evidenceStatus: "source_confirmed",
    capturedAt
  };
}

function blocked({ id, actionId, route, role, locator, sourceComponent, crudOperation, payloadCase, reason, additionalPayloadCases = [] }) {
  return {
    failureId: id,
    actionId,
    route,
    role,
    locator,
    sourceComponent,
    crudOperation,
    payloadCase,
    additionalPayloadCases,
    requestEvidence: "Not executed against connected data.",
    responseEvidence: "Runtime outcome intentionally unobserved.",
    databaseEvidence: "No mutation performed; cleanup ledger remained empty.",
    reproductionSteps: ["Use a synthetic isolated project and the named role state.", reason],
    failureClasses: ["conditional_failure"],
    severity: "unconfirmed",
    evidenceStatus: "runtime_blocked",
    blockedReason: reason,
    capturedAt
  };
}

const findingCatalog = [
  finding({
    id: "B-HSP-SELF-VERIFY", actionId: "hospital.modal.edit.save", route: "/hospitals", role: "org_admin",
    locator: "getByRole('button', { name: /Save|Update hospital/i })",
    sourceComponent: "frontend/src/components/modals/HospitalModal.jsx; frontend/supabase/migrations RPC update_hospital_by_admin",
    crudOperation: "update", payloadCase: "unauthorized_role", additionalPayloadCases: ["full_valid"],
    requestEvidence: "The edit form exposes verified and submits verified=true for org_admin; the same-org RPC branch accepts it without requiring verification_status.",
    responseEvidence: "The RPC can return success to an org_admin caller.",
    databaseEvidence: "hospitals.verified becomes true; public hospital projection/RLS exposes verified rows.",
    reproductionSteps: ["Use an org_admin state and open an owned unverified hospital.", "Enable Verified and save.", "Read back hospitals.verified and verification_status."],
    failureClasses: ["accept_invalid_payload", "mutate_wrong_row_fields", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "B-FAC-VERIFY-CLEARS-TAXONOMY-APPROVE", actionId: "verification.facility.approve", route: "/verification", role: "admin",
    locator: "getByRole('button', { name: /Approve/i })", sourceComponent: "frontend/src/pages/VerificationPage.jsx; update_hospital_by_admin RPC",
    crudOperation: "update", payloadCase: "minimum_valid",
    requestEvidence: "Approve sends only verification_status and verified.",
    responseEvidence: "The receiver converts omitted specialties, service_types, and features to empty arrays and reports success.",
    databaseEvidence: "The approved hospital's taxonomy arrays are overwritten with {}.",
    reproductionSteps: ["Select a pending facility with populated taxonomy arrays.", "Choose Approve.", "Compare all taxonomy columns before and after."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields"], severity: "critical"
  }),
  finding({
    id: "B-FAC-VERIFY-CLEARS-TAXONOMY-REJECT", actionId: "verification.facility.reject", route: "/verification", role: "admin",
    locator: "getByRole('button', { name: /Reject/i })", sourceComponent: "frontend/src/pages/VerificationPage.jsx; update_hospital_by_admin RPC",
    crudOperation: "update", payloadCase: "minimum_valid",
    requestEvidence: "Reject sends only verification_status and verified.",
    responseEvidence: "The receiver converts omitted specialties, service_types, and features to empty arrays and reports success.",
    databaseEvidence: "The rejected hospital's taxonomy arrays are overwritten with {}.",
    reproductionSteps: ["Select a pending facility with populated taxonomy arrays.", "Choose Reject.", "Compare all taxonomy columns before and after."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields"], severity: "critical"
  }),
  finding({
    id: "B-AMB-CROSS-ORG-STATION", actionId: "ambulance.receiver.write", route: "/ambulances", role: "org_admin",
    locator: "ambulances INSERT/UPDATE receiver", sourceComponent: "frontend/src/services/ambulancesService.js; frontend/supabase/migrations/20260219000700_security.sql",
    crudOperation: "update", payloadCase: "unauthorized_role", surfaceType: "receiver_only",
    requestEvidence: "The mounted modal and service now reject cross-scope stations, but the canonical WITH CHECK still authorizes an ambulance when organization_id is owned OR hospital_id belongs to the caller. A forged direct payload can satisfy the first edge while crossing the second.",
    responseEvidence: "Normal Console use is mitigated; a direct authenticated table request can still accept the cross-organization hospital link.",
    databaseEvidence: "ambulances.hospital_id can point to a hospital outside ambulances.organization_id.",
    reproductionSteps: ["In an isolated project authenticate as org_admin.", "Submit an ambulance write with the caller organization_id and another organization's hospital_id.", "Read back both ownership edges and verify the policy accepted the mismatched pair."],
    failureClasses: ["accept_invalid_payload", "mutate_wrong_row_fields", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "B-AMB-STALE-STATUS-OVERWRITE", actionId: "ambulance.modal.save", route: "/ambulances", role: "admin",
    locator: "getByRole('button', { name: /Save|Update ambulance/i })", sourceComponent: "frontend/src/components/modals/AmbulanceModal.jsx",
    crudOperation: "update", payloadCase: "stale_row", additionalPayloadCases: ["concurrency"],
    requestEvidence: "Every metadata edit resubmits the status value captured when the modal opened.",
    responseEvidence: "A later dispatch status update can be overwritten by the stale modal save.",
    databaseEvidence: "ambulances.status is restored to the stale form value while unrelated metadata is saved.",
    reproductionSteps: ["Open an ambulance edit modal.", "Change the same ambulance status through dispatch in a second session.", "Save unrelated metadata from the stale modal and read back status."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "B-DOC-INVITED-STATUS-MUTATION", actionId: "doctor.modal.save", route: "/doctors", role: "admin",
    locator: "getByRole('button', { name: /Save|Update doctor/i })", sourceComponent: "frontend/src/components/modals/DoctorModal.jsx",
    crudOperation: "update", payloadCase: "full_valid",
    requestEvidence: "The edit projection normalizes invited to off_duty and always submits status.",
    responseEvidence: "An unrelated doctor edit reports success.",
    databaseEvidence: "doctors.status changes from invited to off_duty without an explicit lifecycle action.",
    reproductionSteps: ["Open an invited doctor for editing.", "Change an unrelated field and save.", "Read back doctors.status."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields"], severity: "high"
  }),
  finding({
    id: "B-DOC-AVAILABLE-BUT-UNUSABLE", actionId: "doctor.modal.save", route: "/doctors", role: "admin",
    locator: "getByRole('button', { name: /Save|Update doctor/i })", sourceComponent: "frontend/src/components/modals/DoctorModal.jsx; emergency assignment receiver",
    crudOperation: "update", payloadCase: "full_valid",
    requestEvidence: "Selecting available updates status but omits is_available.",
    responseEvidence: "The save succeeds, while canonical assignment requires both status and is_available.",
    databaseEvidence: "doctors.status='available' can coexist with is_available=false, leaving the doctor ineligible.",
    reproductionSteps: ["Edit a doctor whose is_available is false.", "Set status to Available and save.", "Attempt canonical assignment or read both columns."],
    failureClasses: ["incorrect_crud_payload", "fail_valid_payload", "mutate_wrong_row_fields"], severity: "critical"
  }),
  finding({
    id: "B-DOC-DELETE-CLINICAL-EVIDENCE", actionId: "doctor.delete.confirm", route: "/doctors", role: "admin",
    locator: "getByRole('button', { name: /Delete|Confirm delete/i })", sourceComponent: "frontend/src/pages/DoctorsPage.jsx; doctor foreign keys",
    crudOperation: "delete", payloadCase: "full_valid",
    requestEvidence: "The action performs a direct doctor delete without an active-assignment guard.",
    responseEvidence: "A policy-supported delete can succeed even when clinical references exist.",
    databaseEvidence: "Cascade/set-null foreign keys can remove or detach emergency assignment evidence.",
    reproductionSteps: ["In an isolated synthetic project create an audit doctor with linked emergency evidence.", "Confirm Delete.", "Inspect dependent assignment rows and audit history."],
    failureClasses: ["mutate_wrong_row_fields", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "B-DOC-STALE-DELETE-SUCCESS", actionId: "doctor.delete.confirm", route: "/doctors", role: "admin",
    locator: "getByRole('button', { name: /Delete|Confirm delete/i })", sourceComponent: "frontend/src/services/doctorsService.js; DoctorsPage.jsx",
    crudOperation: "delete", payloadCase: "stale_row",
    requestEvidence: "Delete filters by id but requests no returned row/count.",
    responseEvidence: "A zero-row delete can resolve as success and trigger success UI.",
    databaseEvidence: "Pre/post target row is unchanged or already absent; affected-row proof is unavailable.",
    reproductionSteps: ["Open a doctor deletion confirmation.", "Delete the row in a second synthetic session.", "Confirm from the stale first session and observe success messaging."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-DOC-LINKED-DELETE-NOT-DURABLE", actionId: "doctor.delete.confirm", route: "/doctors", role: "admin",
    locator: "getByRole('button', { name: /Delete|Confirm delete/i })", sourceComponent: "frontend/src/services/doctorsService.js; profile doctor automation",
    crudOperation: "delete", payloadCase: "full_valid",
    requestEvidence: "The direct delete does not change the linked provider profile state that drives doctor automation.",
    responseEvidence: "Delete reports success, but a later profile update can recreate the doctor.",
    databaseEvidence: "A doctor row with the linked provider identity is reinserted after subsequent profile automation.",
    reproductionSteps: ["Create an audit provider/doctor pair in isolation.", "Delete the doctor from Console.", "Update the linked profile and query doctors again."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-VER-MODAL-FALSE-SUCCESS-APPROVE", actionId: "verification.modal.approve", route: "/verification", role: "admin",
    locator: "getByRole('button', { name: /Approve/i })", sourceComponent: "frontend/src/pages/VerificationPage.jsx; VerificationModal.jsx",
    crudOperation: "update", payloadCase: "network_failure",
    requestEvidence: "The page handler catches receiver errors and returns false.",
    responseEvidence: "VerificationModal ignores the false result, closes, and shows success.",
    databaseEvidence: "The target verification row remains unchanged after the failed request.",
    reproductionSteps: ["Open a pending verification.", "Intercept the approval receiver with HTTP 500.", "Choose Approve and compare row state with the success UI."],
    failureClasses: ["fail_valid_payload", "stale_ui", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "B-VER-MODAL-FALSE-SUCCESS-REJECT", actionId: "verification.modal.reject", route: "/verification", role: "admin",
    locator: "getByRole('button', { name: /Reject/i })", sourceComponent: "frontend/src/pages/VerificationPage.jsx; VerificationModal.jsx",
    crudOperation: "update", payloadCase: "network_failure",
    requestEvidence: "The page handler catches receiver errors and returns false.",
    responseEvidence: "VerificationModal ignores the false result, closes, and shows success.",
    databaseEvidence: "The target verification row remains unchanged after the failed request.",
    reproductionSteps: ["Open a pending verification.", "Intercept the rejection receiver with HTTP 500.", "Choose Reject and compare row state with the success UI."],
    failureClasses: ["fail_valid_payload", "stale_ui", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "B-VER-MOBILE-BULK-RACE-APPROVE", actionId: "verification.mobile.bulk.approve", route: "/verification", role: "admin",
    locator: "getByRole('button', { name: /Approve selected/i })", sourceComponent: "frontend/src/components/mobile/MobileVerification.jsx",
    crudOperation: "update", payloadCase: "concurrency", additionalPayloadCases: ["double_submit"],
    requestEvidence: "The handler starts async mutations inside forEach without awaiting them.",
    responseEvidence: "Selection and progress state clear before all approvals settle; per-item failures arrive later.",
    databaseEvidence: "Only a subset of selected rows may be approved at the time UI reports completion.",
    reproductionSteps: ["Select several synthetic pending records on mobile.", "Delay one approval response and reject another.", "Choose Approve selected and compare immediate UI with final row states."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-VER-MOBILE-BULK-RACE-REJECT", actionId: "verification.mobile.bulk.reject", route: "/verification", role: "admin",
    locator: "getByRole('button', { name: /Reject selected/i })", sourceComponent: "frontend/src/components/mobile/MobileVerification.jsx",
    crudOperation: "update", payloadCase: "concurrency", additionalPayloadCases: ["double_submit"],
    requestEvidence: "The handler starts async mutations inside forEach without awaiting them.",
    responseEvidence: "Selection and progress state clear before all rejections settle; per-item failures arrive later.",
    databaseEvidence: "Only a subset of selected rows may be rejected at the time UI reports completion.",
    reproductionSteps: ["Select several synthetic pending records on mobile.", "Delay one rejection response and reject another.", "Choose Reject selected and compare immediate UI with final row states."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-HSP-STALE-UPDATE-SUCCESS", actionId: "hospital.modal.edit.save", route: "/hospitals", role: "admin",
    locator: "getByRole('button', { name: /Save|Update hospital/i })", sourceComponent: "frontend/src/services/hospitalsService.js; update_hospital_by_admin RPC",
    crudOperation: "update", payloadCase: "stale_row",
    requestEvidence: "The RPC path does not prove an affected row for a nonexistent hospital id.",
    responseEvidence: "The action can resolve and show success for a zero-row update.",
    databaseEvidence: "The stale hospital remains absent; no updated-row readback exists.",
    reproductionSteps: ["Open a synthetic hospital edit modal.", "Delete the row in another session.", "Save the stale modal and compare UI result with exact row count."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-HSP-BLANK-CLEAR-NOOP", actionId: "hospital.modal.edit.save", route: "/hospitals", role: "admin",
    locator: "getByRole('button', { name: /Save|Update hospital/i })", sourceComponent: "frontend/src/components/modals/HospitalModal.jsx; hospitalsService.js",
    crudOperation: "update", payloadCase: "empty", additionalPayloadCases: ["null"],
    requestEvidence: "Cleared optional fields are omitted from the update payload.",
    responseEvidence: "The receiver preserves omitted columns and the UI reports success.",
    databaseEvidence: "The old column values remain instead of being cleared.",
    reproductionSteps: ["Open an audit hospital with optional text values.", "Clear those inputs and save.", "Read back the cleared columns."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields"], severity: "high"
  }),
  finding({
    id: "B-HSP-CAPACITY-SILENT-NORMALIZATION", actionId: "hospital.modal.edit.save", route: "/hospitals", role: "admin",
    locator: "getByRole('button', { name: /Save|Update hospital/i })", sourceComponent: "frontend/src/components/modals/HospitalModal.jsx; hospitalsService.js",
    crudOperation: "update", payloadCase: "boundary_number", additionalPayloadCases: ["invalid_enum"],
    requestEvidence: "Negative capacity and inconsistent ICU/available/total/status values are clamped or normalized rather than rejected.",
    responseEvidence: "The action succeeds without explaining that the submitted values changed.",
    databaseEvidence: "Stored capacity/status differs from the values entered by the operator.",
    reproductionSteps: ["Enter negative or internally inconsistent capacity values on an audit hospital.", "Save.", "Compare submitted payload, stored values, and visible confirmation."],
    failureClasses: ["accept_invalid_payload", "mutate_wrong_row_fields"], severity: "high"
  }),
  finding({
    id: "B-HSP-RESERVATION-FAILURE-AS-EMPTY", actionId: "hospital.reservations.view", route: "/hospitals", role: "admin",
    locator: "getByRole('button', { name: /Reservations|View reservations/i })", sourceComponent: "frontend/src/pages/HospitalsPage.jsx; reservation query service",
    crudOperation: "read", payloadCase: "network_failure",
    requestEvidence: "Reservation read errors are only logged to console.",
    responseEvidence: "The surface renders No active reservations instead of an unavailable/error state.",
    databaseEvidence: "Database truth is unknown because the failed read is converted to an empty collection.",
    reproductionSteps: ["Open a hospital reservation surface.", "Intercept the reservation request with HTTP 500.", "Observe the empty-state claim and captured failed request."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "high"
  }),
  finding({
    id: "B-DOC-EXTERNAL-FACILITY-OPTION", actionId: "doctor.modal.save", route: "/doctors", role: "org_admin",
    locator: "getByRole('button', { name: /Save|Update doctor/i })", sourceComponent: "frontend/src/components/modals/DoctorModal.jsx; doctor RLS",
    crudOperation: "update", payloadCase: "unauthorized_role",
    requestEvidence: "The facility selector includes externally owned verified facilities visible through read policy.",
    responseEvidence: "The write policy rejects a valid-looking selection for org_admin.",
    databaseEvidence: "The doctor row remains unchanged after the rejected update.",
    reproductionSteps: ["As org_admin edit an owned doctor.", "Choose an externally owned verified facility offered by the form.", "Save and capture the RLS failure."],
    failureClasses: ["fail_valid_payload", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-RQ-DERIVED-STALE-UI", actionId: "facility.modal.save", route: "/hospitals", role: "admin",
    locator: "getByRole('button', { name: /Save|Update/i })", sourceComponent: "frontend/src/hooks facility mutations; TanStack Query projections",
    crudOperation: "update", payloadCase: "full_valid", additionalPayloadCases: ["network_failure"],
    requestEvidence: "onSettled starts invalidations but does not return/await them; the modal closes first.",
    responseEvidence: "The route can render the old enriched projection after a successful mutation.",
    databaseEvidence: "Canonical foreign-key value is updated while cached enrichment still shows the previous relationship.",
    reproductionSteps: ["Edit a synthetic facility relationship.", "Delay the refetch response.", "Save and observe the route before invalidation settles, then compare DB state."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-ONB-STORAGE-CLEANUP-UNVERIFIED", actionId: "onboarding.submit", route: "/onboarding", role: "unauthenticated",
    locator: "getByRole('button', { name: /Submit|Complete onboarding/i })", sourceComponent: "frontend/src/pages/OnboardingPage.jsx; Storage cleanup",
    crudOperation: "create", payloadCase: "network_failure",
    requestEvidence: "Documents upload before provisioning; the compensation remove result/error is ignored.",
    responseEvidence: "Provisioning can fail without proof that uploaded objects were removed.",
    databaseEvidence: "No profile/facility row is created, while one or more Storage objects may remain orphaned.",
    reproductionSteps: ["Use an isolated audit signup and attach a document.", "Fail the provisioning request after upload.", "List the exact audit Storage paths and compare to created database rows."],
    failureClasses: ["conditional_failure", "mutate_wrong_row_fields"], severity: "high"
  }),
  finding({
    id: "B-ONB-SIGNOUT-UNHANDLED", actionId: "onboarding.signout", route: "/onboarding", role: "authenticated_incomplete",
    locator: "getByRole('button', { name: /Sign out/i })", sourceComponent: "frontend/src/pages/OnboardingPage.jsx",
    crudOperation: "auth", payloadCase: "network_failure",
    requestEvidence: "The signOut promise has no catch/finally path.",
    responseEvidence: "A rejected sign-out can produce a page error and leave the loading state active.",
    databaseEvidence: "No database mutation; the Auth session remains active.",
    reproductionSteps: ["Open onboarding in an incomplete authenticated state.", "Inject a rejected signOut call.", "Choose Sign out and capture pageerror plus the persistent pending UI."],
    failureClasses: ["browser_error", "conditional_failure"], severity: "medium"
  })
];

findingCatalog.push(
  finding({
    id: "C-01-ORG-ADMIN-CREATE-MISSING-FACILITY", actionId: "emergency.create.submit", route: "/emergencies", role: "org_admin",
    locator: "getByRole('button', { name: /Create request|Submit request/i })", sourceComponent: "frontend/src/components/modals/EmergencyRequestModal.jsx; console_create_emergency_request RPC",
    crudOperation: "create", payloadCase: "minimum_valid",
    requestEvidence: "The advertised org_admin create form has no facility selector and sends hospital_id only when preloaded form data already contains one.",
    responseEvidence: "console_create_emergency_request rejects non-admin calls without hospital_id.",
    databaseEvidence: "No emergency_requests row is inserted for the otherwise valid form.",
    reproductionSteps: ["As org_admin open /emergencies and choose Create new request.", "Complete the visible required fields and submit.", "Capture the RPC failure and verify the exact audit request was not inserted."],
    failureClasses: ["incorrect_crud_payload", "fail_valid_payload", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "C-02-ADMIN-CREATE-DROPS-COORDINATES", actionId: "emergency.create.submit", route: "/emergencies", role: "admin",
    locator: "getByRole('button', { name: /Create request|Submit request/i })", sourceComponent: "frontend/src/components/modals/EmergencyRequestModal.jsx; frontend/src/services/emergencyService.js",
    crudOperation: "create", payloadCase: "full_valid",
    requestEvidence: "The modal submits coordinates under patient_location, while buildConsoleCreatePayload reads only top-level latitude/longitude or pickup_location.",
    responseEvidence: "The fallback create RPC can succeed without the entered geography.",
    databaseEvidence: "The inserted emergency row has null/missing coordinates despite valid entered coordinates.",
    reproductionSteps: ["As admin create a request without a hospital and enter coordinates.", "Submit and capture both the form payload and normalized RPC payload.", "Read back the inserted geography columns."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields"], severity: "critical"
  }),
  finding({
    id: "C-03-CREATE-TYPE-COERCED", actionId: "emergency.create.submit", route: "/emergencies", role: "admin",
    locator: "getByRole('button', { name: /Create request|Submit request/i })", sourceComponent: "frontend/src/components/modals/EmergencyRequestModal.jsx; console_create_emergency_request RPC",
    crudOperation: "create", payloadCase: "invalid_enum",
    requestEvidence: "The Type field sends an incident token in service_type.",
    responseEvidence: "The receiver silently coerces any token outside ambulance/bed/booking to ambulance.",
    databaseEvidence: "emergency_requests.service_type stores ambulance rather than the operator-selected incident type.",
    reproductionSteps: ["Choose a visible incident Type other than the receiver's service enum.", "Submit the request.", "Compare the selected value, RPC payload, and stored service_type."],
    failureClasses: ["accept_invalid_payload", "mutate_wrong_row_fields"], severity: "high"
  }),
  finding({
    id: "C-04-CREATE-OMITS-LINKED-VISIT", actionId: "emergency.create.submit", route: "/emergencies", role: "admin",
    locator: "getByRole('button', { name: /Create request|Submit request/i })", sourceComponent: "console_create_emergency_request RPC; 20260219000900_automations.sql",
    crudOperation: "create", payloadCase: "full_valid",
    requestEvidence: "The fallback receiver inserts only emergency_requests; the visit trigger is AFTER UPDATE and only updates an already existing visit.",
    responseEvidence: "Emergency creation can report success with no corresponding visit creation path.",
    databaseEvidence: "The new request has no linked visits row.",
    reproductionSteps: ["Create an isolated audit emergency through the fallback path.", "Wait for triggers to settle.", "Query visits by emergency_request_id and verify no row was created."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields"], severity: "critical"
  }),
  finding({
    id: "C-06-PROVIDER-COMPLETE-OWNERSHIP-MISMATCH", actionId: "emergency.complete", route: "/emergencies", role: "provider",
    locator: "getByRole('button', { name: /Complete/i })", sourceComponent: "frontend/src/pages/EmergencyRequestsPage.jsx; complete emergency RPC",
    crudOperation: "workflow_command", payloadCase: "unauthorized_role",
    requestEvidence: "The UI exposes Complete from provider role plus lifecycle state, but does not require responder ownership.",
    responseEvidence: "The receiver rejects a hospital-scoped provider who is not the assigned responder.",
    databaseEvidence: "The request lifecycle remains unchanged after the rejected command.",
    reproductionSteps: ["As a provider who can read a hospital request but is not its responder, open the request.", "Choose Complete.", "Capture the authorization failure and unchanged lifecycle."],
    failureClasses: ["fail_valid_payload", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "C-07-RETRY-PAYMENT-METHOD-RLS", actionId: "emergency.retry-payment", route: "/emergencies", role: "admin|org_admin|provider",
    locator: "getByRole('button', { name: /Retry payment/i })", sourceComponent: "frontend/src/pages/EmergencyRequestsPage.jsx; payment_methods RLS",
    crudOperation: "create", payloadCase: "unauthorized_role", surfaceType: "receiver_only",
    requestEvidence: "The handler first reads the patient's payment_methods, but policy allows only auth.uid()=user_id.",
    responseEvidence: "An operator retrying another patient's declined payment receives no methods and cannot send the retry command.",
    databaseEvidence: "No new payment row is created and request payment status remains declined.",
    reproductionSteps: ["As an authorized operator open another patient's declined request.", "Choose Retry payment.", "Capture the owner-only payment_methods read and verify no payment insert."],
    failureClasses: ["fail_valid_payload", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "C-08-DETAIL-REFRESH-REUSES-STALE-PROP", actionId: "emergency.details.refresh", route: "/emergencies", role: "admin",
    locator: "getByRole('button', { name: /Refresh/i })", sourceComponent: "frontend/src/components/modals/EmergencyDetailsModal.jsx; emergencyService.js",
    crudOperation: "read", payloadCase: "stale_row",
    requestEvidence: "refreshProjection passes current request and getEmergencyDetailProjection reuses the matching initialRequest instead of re-reading the row.",
    responseEvidence: "Refresh completes while showing the old request values.",
    databaseEvidence: "Canonical request fields can differ from the unchanged modal projection.",
    reproductionSteps: ["Open a synthetic request details modal.", "Update the request in a second session.", "Choose Refresh and compare the modal to a direct row read."],
    failureClasses: ["stale_ui"], severity: "high"
  }),
  finding({
    id: "C-09-ANALYTICS-PARTIAL-AS-TOTAL", actionId: "emergency.analytics.open", route: "/emergencies", role: "admin",
    locator: "getByRole('button', { name: /Analytics|View analytics/i })", sourceComponent: "frontend/src/pages/EmergencyRequestsPage.jsx",
    crudOperation: "read", payloadCase: "partial_response",
    requestEvidence: "When stats are unavailable, analytics falls back to counts from the currently loaded request page.",
    responseEvidence: "The modal presents page-derived values without a partial/unavailable label.",
    databaseEvidence: "Displayed totals are not proven against an exact database count.",
    reproductionSteps: ["Ensure more requests exist than the loaded page size in an isolated project.", "Fail only the stats request.", "Open Analytics and compare displayed totals to exact counts."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "C-10-MOBILE-VISIT-INCIDENT-NO-DESTINATION", actionId: "visit.mobile.incident.open", route: "/visits", role: "admin",
    locator: "getByRole('button', { name: /View incident|Incident details/i })", sourceComponent: "frontend/src/components/modals/VisitModal.jsx; VisitsPage.jsx",
    crudOperation: "view", payloadCase: "full_valid",
    requestEvidence: "VisitModal dispatches openEmergencyDetails and closes itself.",
    responseEvidence: "The mobile VisitsPage does not mount EmergencyDetailsModal, so no destination becomes visible.",
    databaseEvidence: "Read-only interaction; no database mutation occurs.",
    reproductionSteps: ["On mobile open a visit linked to an incident.", "Choose View incident.", "Observe the visit modal close with no emergency details surface."],
    failureClasses: ["do_nothing", "wrong_destination"], severity: "high"
  }),
  finding({
    id: "C-11-VISIT-DETAIL-RETRY-NO-CALLBACK", actionId: "visit.details.payment.retry", route: "/visits", role: "admin",
    locator: "getByRole('button', { name: /Retry payment/i })", sourceComponent: "frontend/src/pages/VisitsPage.jsx; EmergencyDetailsModal.jsx",
    crudOperation: "create", payloadCase: "full_valid",
    requestEvidence: "Desktop VisitsPage mounts EmergencyDetailsModal without onRetryPayment; the handler returns when the callback is absent.",
    responseEvidence: "The visible Retry payment action produces no request and no feedback.",
    databaseEvidence: "No payment row or payment-status change occurs.",
    reproductionSteps: ["On desktop open a visit's incident with declined payment.", "Choose Retry payment.", "Verify that no payment request is sent and the surface does not change."],
    failureClasses: ["do_nothing", "send_no_backend_request", "fail_valid_payload"], severity: "critical"
  }),
  finding({
    id: "C-15-DRIVER-REJECTED-STATUS-FALSE-SUCCESS", actionId: "map.driver.mark-on-way", route: "/map", role: "provider",
    locator: "getByRole('button', { name: /Mark on way/i })", sourceComponent: "frontend/src/pages/GodModeMap.jsx; driverManagementService.js",
    crudOperation: "workflow_command", payloadCase: "invalid_enum",
    requestEvidence: "The service catches receiver errors and returns null; the caller does not inspect the result.",
    responseEvidence: "A rejected backward Arrived to On way transition still triggers a success toast.",
    databaseEvidence: "The trip/request status remains Arrived despite visible success.",
    reproductionSteps: ["Open an Arrived synthetic trip on the map.", "Choose Mark on way.", "Capture the rejected transition and compare the unchanged row to the success toast."],
    failureClasses: ["accept_invalid_payload", "stale_ui", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "C-16-WRONG-ASSIGNEE-DRIVER-CONTROLS", actionId: "map.driver.lifecycle.action", route: "/map", role: "provider",
    locator: "getByRole('button', { name: /Accept|On way|Arrived|Complete/i })", sourceComponent: "frontend/src/pages/GodModeMap.jsx; lifecycle RPCs",
    crudOperation: "workflow_command", payloadCase: "unauthorized_role",
    requestEvidence: "driverActiveEmergency grants controls on responder match OR ambulance match, while command authority is responder-keyed.",
    responseEvidence: "A provider associated only through the ambulance can see controls that the receiver rejects; error swallowing can also produce false success.",
    databaseEvidence: "The request lifecycle remains unchanged for the wrong responder.",
    reproductionSteps: ["Assign an audit request to responder A and an ambulance visible to provider B.", "As provider B use a lifecycle control.", "Capture receiver rejection and unchanged lifecycle."],
    failureClasses: ["fail_valid_payload", "conditional_failure", "stale_ui"], severity: "critical"
  }),
  finding({
    id: "C-17-LOCATION-COMMIT-THEN-READ-FAILS", actionId: "map.responder.location.publish", route: "/map", role: "provider",
    locator: "Map location tracking interaction", sourceComponent: "frontend/src/services/emergencyResponseService.js",
    crudOperation: "update", payloadCase: "network_failure",
    requestEvidence: "updateResponderLocation commits through RPC, then performs a direct GET and throws if that follow-up read fails.",
    responseEvidence: "A post-commit read failure is surfaced as an update failure.",
    databaseEvidence: "Responder location is committed even though the client reports failure.",
    reproductionSteps: ["Enable location tracking for an audit responder.", "Allow the update RPC and fail only the follow-up GET.", "Compare the error UI with the committed location row."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "high"
  }),
  finding({
    id: "C-18-CROSS-ORG-NEAREST-DISPATCH", actionId: "map.dispatch.nearest", route: "/map", role: "org_admin",
    locator: "getByRole('button', { name: /Dispatch nearest|Assign ambulance/i })", sourceComponent: "frontend/src/services/emergencyResponseService.js; ambulancesService.js",
    crudOperation: "workflow_command", payloadCase: "unauthorized_role",
    requestEvidence: "Candidate discovery uses global SECURITY DEFINER nearby_ambulances and unscoped ambulance hydration, then picks the first eligible result without actor-org filtering.",
    responseEvidence: "A foreign nearest unit is selected and the org-scoped dispatch RPC rejects it instead of trying a farther same-org unit.",
    databaseEvidence: "No assignment is made although an authorized same-org ambulance is available.",
    reproductionSteps: ["Place a foreign audit ambulance closer than an eligible same-org ambulance.", "As org_admin choose Dispatch nearest.", "Capture the rejected foreign command and verify the same-org unit was not attempted."],
    failureClasses: ["wrong_destination", "fail_valid_payload", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "C-20-MAP-CAP-HIDDEN-FROM-OPERATOR", actionId: "map.refresh", route: "/map", role: "admin",
    locator: "getByRole('button', { name: /Refresh/i })", sourceComponent: "frontend/src/services/supabaseMapService.js; GodModeMap.jsx",
    crudOperation: "read", payloadCase: "partial_response",
    requestEvidence: "The map caps emergencies at 100 and records sourceState.emergencies.partial.",
    responseEvidence: "GodModeMap and MobileMap do not consume that partial marker; live counts appear complete.",
    databaseEvidence: "Displayed request count equals capped loaded rows, not the exact source count when more than 100 match.",
    reproductionSteps: ["In an isolated dataset create more than 100 matching audit emergencies.", "Choose Refresh.", "Compare visible map count to sourceState.partial and an exact database count."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  })
);

findingCatalog.push(
  finding({
    id: "G-F001-EMERGENCY-NOTIFICATION-PARTIAL-COMMIT", actionId: "emergency.create.submit", route: "/emergencies", role: "org_admin",
    locator: "getByRole('button', { name: /Create request|Submit request/i })", sourceComponent: "frontend/src/components/modals/EmergencyRequestModal.jsx",
    crudOperation: "create", payloadCase: "network_failure", additionalPayloadCases: ["retry"],
    requestEvidence: "The authoritative emergency create is followed by an awaited notification create inside the same catch block.",
    responseEvidence: "If the emergency insert succeeds and notification insert fails, the modal reports failure and remains open; retry is enabled.",
    databaseEvidence: "emergency_requests changes 0 to 1 while notifications remains 0; retry can create another request.",
    reproductionSteps: ["In tagged staging allow the audit emergency receiver to return 2xx and fail the notification receiver with 500.", "Submit once and observe failure with the modal still open.", "Verify the request exists before any retry."],
    failureClasses: ["stale_ui", "conditional_failure", "accept_invalid_payload"], severity: "critical"
  }),
  finding({
    id: "G-F002-DOCTOR-DELETE-DOUBLE-CONFIRM", actionId: "doctor.delete.confirm", route: "/doctors", role: "org_admin",
    locator: "getByRole('button', { name: /Delete|Confirm/i })", sourceComponent: "frontend/src/pages/DoctorsPage.jsx; ConfirmationModal.jsx",
    crudOperation: "delete", payloadCase: "double_submit", additionalPayloadCases: ["concurrency"],
    requestEvidence: "DoctorsPage omits ConfirmationModal isLoading, so Confirm stays enabled while the first delete is pending.",
    responseEvidence: "Double activation sends two deletes; the first removes the row and the second returns zero-row/error or another 2xx.",
    databaseEvidence: "The tagged doctor changes 1 to 0 once despite two destructive requests.",
    reproductionSteps: ["Delay the first delete for a synthetic doctor.", "Activate Confirm twice.", "Count delete requests/responses and exact affected rows."],
    failureClasses: ["accept_invalid_payload", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "G-F003-DOCTOR-BULK-PARTIAL-CONCURRENT", actionId: "doctors.bulk-delete.confirm", route: "/doctors", role: "org_admin",
    locator: "getByRole('button', { name: /Delete selected staff|Delete/i })", sourceComponent: "frontend/src/pages/DoctorsPage.jsx",
    crudOperation: "delete", payloadCase: "concurrency",
    requestEvidence: "Bulk delete sends all selected deletes in Promise.all; one rejection rejects the batch after peer requests are already in flight.",
    responseEvidence: "One 2xx plus one 500 yields a generic failure and closes the modal while selection remains; optimistic snapshots can temporarily restore the successful peer.",
    databaseEvidence: "Two tagged doctors change 2 to 1 after a partial batch.",
    reproductionSteps: ["Select two isolated audit doctors.", "Allow one delete and fail the other.", "Confirm bulk delete and compare selection/UI with exact remaining ids."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "high"
  }),
  finding({
    id: "G-F004-SUPPORT-BULK-PARTIAL-SEQUENTIAL", actionId: "support.bulk-delete.confirm", route: "/support-tickets", role: "org_admin",
    locator: "getByRole('button', { name: /Delete [0-9]+ selected tickets|Delete/i })", sourceComponent: "frontend/src/pages/SupportTicketsPage.jsx",
    crudOperation: "delete", payloadCase: "concurrency",
    requestEvidence: "Bulk delete executes selected ticket deletes sequentially and stops after a later failure.",
    responseEvidence: "The modal closes with a generic error and selection is not cleared after a partial batch.",
    databaseEvidence: "Two tagged tickets change 2 to 1 when the first delete succeeds and second returns 500.",
    reproductionSteps: ["Select two synthetic tickets.", "Allow the first delete and fail the second.", "Confirm bulk delete and compare remaining selection/UI with exact ids."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "high"
  }),
  finding({
    id: "G-F005-EMERGENCY-CANCEL-DOUBLE-CONFIRM", actionId: "emergency.cancel.confirm", route: "/emergencies", role: "admin",
    locator: "getByRole('button', { name: /Cancel request|Confirm/i })", sourceComponent: "frontend/src/pages/EmergencyRequestsPage.jsx; ConfirmationModal.jsx",
    crudOperation: "workflow_command", payloadCase: "double_submit", additionalPayloadCases: ["concurrency"],
    requestEvidence: "EmergencyRequestsPage omits ConfirmationModal isLoading, leaving Confirm enabled across the trigger-sensitive cancel RPC.",
    responseEvidence: "Two cancel commands can race; the first transitions once and the second produces an invalid-transition/zero-row response, with contradictory feedback possible.",
    databaseEvidence: "One isolated request transitions active to cancelled exactly once despite two command requests.",
    reproductionSteps: ["In serialized tagged staging open Cancel request for an isolated emergency.", "Delay the first command and activate Confirm twice.", "Compare request count/responses with the single lifecycle transition."],
    failureClasses: ["accept_invalid_payload", "conditional_failure", "stale_ui"], severity: "critical"
  }),
  finding({
    id: "G-F007-SUPPORT-CREATE-REFETCH-FAILURE", actionId: "support.ticket.create.submit", route: "/support-tickets", role: "provider",
    locator: "getByRole('button', { name: /Create request/i })", sourceComponent: "frontend/src/pages/SupportTicketsPage.jsx; useSupportTicketsMutations.js",
    crudOperation: "create", payloadCase: "network_failure",
    requestEvidence: "Create has no optimistic row; onSettled starts but does not await invalidation/refetch.",
    responseEvidence: "Insert 2xx closes with success, then refetch 500 is hidden when a nonempty cache exists, so the new row stays absent.",
    databaseEvidence: "Exact audit subject changes 0 to 1 while the visible cached list lacks it.",
    reproductionSteps: ["In tagged staging submit a valid audit support request.", "Allow INSERT and fail only the follow-up list GET.", "Compare exact row count with the unchanged cached list."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "G-F008-NOTIFICATIONS-FAILURE-FALSE-EMPTY", actionId: "notifications.open", route: "/settings", role: "viewer",
    locator: "getByRole('button', { name: /Open notifications|Notifications/i })", sourceComponent: "frontend/src/services/notificationService.js; NotificationCenter.jsx",
    crudOperation: "read", payloadCase: "network_failure", additionalPayloadCases: ["unauthorized_role"],
    requestEvidence: "Notification reads convert 401/403/429/500 failures to [] and cache the value for 60 seconds.",
    responseEvidence: "The panel says No notifications with no unavailable/error disclosure.",
    databaseEvidence: "Nonempty isolated notifications remain unchanged but are represented as empty.",
    reproductionSteps: ["Open notifications for a synthetic account with at least one notification.", "Intercept the GET with 500 or 401.", "Observe No notifications and the cached false-empty state."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "G-F009-MARK-ALL-SILENT-ROLLBACK", actionId: "notifications.mark-all-read", route: "/settings", role: "viewer",
    locator: "getByRole('button', { name: /Mark all as read/i })", sourceComponent: "frontend/src/services/notificationService.js; NotificationCenter.jsx",
    crudOperation: "update", payloadCase: "network_failure",
    requestEvidence: "The service converts update failure to false; the panel optimistically flips unread state then rolls back.",
    responseEvidence: "Rollback is silent: no toast/error and no pending guard explains the failure.",
    databaseEvidence: "Unread synthetic rows remain unread after the failed update.",
    reproductionSteps: ["Open notifications containing unread audit rows.", "Fail Mark all updates with 500.", "Choose Mark all as read and compare silent rollback with unchanged rows."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "medium"
  }),
  finding({
    id: "G-F010-QUICK-SEARCH-FAILURE-FALSE-EMPTY", actionId: "quick-search.query", route: "/settings", role: "viewer",
    locator: "getByRole('button', { name: /Search/i }) then getByRole('searchbox')", sourceComponent: "frontend/src/components/QuickSearch.jsx; searchService.js",
    crudOperation: "read", payloadCase: "network_failure",
    requestEvidence: "Category search methods ignore Supabase error objects, and the aggregate path converts failures to empty results that the UI does not distinguish.",
    responseEvidence: "The surface renders No results for the query after one/all category requests return 4xx/5xx.",
    databaseEvidence: "Matching synthetic rows remain present; tracking writes must be blocked during safe interception.",
    reproductionSteps: ["Open Quick Search and enter a query known to match a synthetic row.", "Fail the category GET requests.", "Observe the false No results state."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "G-F011-QUICK-SEARCH-OUT-OF-ORDER", actionId: "quick-search.query", route: "/settings", role: "viewer",
    locator: "getByRole('button', { name: /Search/i }) then getByRole('searchbox')", sourceComponent: "frontend/src/components/QuickSearch.jsx",
    crudOperation: "read", payloadCase: "concurrency",
    requestEvidence: "Search requests have no abort or latest-generation guard.",
    responseEvidence: "If q2 returns before q1, the final input shows q2 while late q1 results overwrite the list; selecting can navigate to a stale object.",
    databaseEvidence: "Read-only test; matching rows remain unchanged.",
    reproductionSteps: ["Enter q1 then q2 rapidly.", "Return q2 first and q1 last.", "Compare final input text, result labels, and selected destination."],
    failureClasses: ["wrong_destination", "stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "G-F012A-AMBULANCES-REFRESH-TIMEOUT-AMPLIFICATION", actionId: "ambulances.refresh", route: "/ambulances", role: "authorized_reader",
    locator: "getByRole('button', { name: /Refresh ambulances|Refresh/i })", sourceComponent: "frontend/src/pages/AmbulancesPage.jsx; ambulancesService.js; lib/utils.js; queryClient.js",
    crudOperation: "read", payloadCase: "retry",
    requestEvidence: "The 8s Promise.race rejects without aborting the Supabase request; TanStack retry=2 can start up to three underlying attempts.",
    responseEvidence: "Refresh reports timeout while orphaned requests continue and late responses can arrive.",
    databaseEvidence: "Read-only operation; no database mutation.",
    reproductionSteps: ["Intercept the ambulance data GET so each attempt exceeds eight seconds.", "Choose Refresh.", "Count three attempts and continued underlying requests after timeout."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "medium"
  }),
  finding({
    id: "G-F012A-AMBULANCES-RETRY-TIMEOUT-AMPLIFICATION", actionId: "ambulances.error.retry", route: "/ambulances", role: "authorized_reader",
    locator: "getByRole('button', { name: /Retry/i })", sourceComponent: "frontend/src/pages/AmbulancesPage.jsx; ambulancesService.js; lib/utils.js; queryClient.js",
    crudOperation: "read", payloadCase: "retry",
    requestEvidence: "The error-state Retry uses the same non-aborting timeout path; TanStack retry=2 can start up to three attempts.",
    responseEvidence: "Retry reports timeout while underlying requests continue and late responses can arrive.",
    databaseEvidence: "Read-only operation; no database mutation.",
    reproductionSteps: ["Put Ambulances in its error state and delay every data GET beyond eight seconds.", "Choose Retry.", "Count attempts and requests that remain alive after the visible timeout."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "medium"
  }),
  finding({
    id: "G-F012B-VISITS-REFRESH-TIMEOUT-AMPLIFICATION", actionId: "visits.refresh", route: "/visits", role: "authorized_reader",
    locator: "getByRole('button', { name: /Refresh visits|Refresh/i })", sourceComponent: "frontend/src/pages/VisitsPage.jsx; visitsService.js; lib/utils.js",
    crudOperation: "read", payloadCase: "retry",
    requestEvidence: "The non-aborting Promise.race is wrapped by service withRetry(maxRetries=3), starting repeated underlying requests.",
    responseEvidence: "Refresh reports timeout while late attempts continue and may resolve out of order.",
    databaseEvidence: "Read-only operation; no database mutation.",
    reproductionSteps: ["Delay every visits GET beyond eight seconds.", "Choose Refresh.", "Count service attempts and underlying requests surviving the timeout."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "medium"
  }),
  finding({
    id: "G-F012B-VISITS-RETRY-TIMEOUT-AMPLIFICATION", actionId: "visits.error.retry", route: "/visits", role: "authorized_reader",
    locator: "getByRole('button', { name: /Retry/i })", sourceComponent: "frontend/src/pages/VisitsPage.jsx; visitsService.js; lib/utils.js",
    crudOperation: "read", payloadCase: "retry",
    requestEvidence: "The error-state Retry uses the same non-aborting service retry path.",
    responseEvidence: "Retry reports timeout while repeated late requests remain active.",
    databaseEvidence: "Read-only operation; no database mutation.",
    reproductionSteps: ["Put Visits in its error state and delay every data GET beyond eight seconds.", "Choose Retry.", "Count service attempts and late underlying responses."],
    failureClasses: ["conditional_failure", "stale_ui"], severity: "medium"
  })
);

findingCatalog.push(
  finding({
    id: "D-ID-001-MFA-AAL1-BYPASS", actionId: "login.password.submit", route: "/login", role: "unauthenticated",
    locator: "getByRole('button', { name: /Sign in/i })", sourceComponent: "frontend/src/contexts/AuthContext.jsx; Login page; ProtectedRoute",
    crudOperation: "auth", payloadCase: "full_valid",
    requestEvidence: "Password sign-in establishes an AAL1 session; user/profile state is published and Login navigates to / before MFA verification completes.",
    responseEvidence: "ProtectedRoute checks authentication/role but not an AAL2 assurance level.",
    databaseEvidence: "No CRUD row mutation; an MFA-enabled account retains an AAL1 Auth session while protected UI is reachable.",
    reproductionSteps: ["Use an isolated MFA-enabled audit account.", "Submit correct email/password but do not complete the second factor.", "Observe navigation to a protected route and inspect the session AAL."],
    failureClasses: ["wrong_destination", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "D-ID-002-CLEAR-OPTIONAL-PROFILE-NOOP", actionId: "users.profile.edit.save", route: "/users", role: "admin",
    locator: "getByRole('button', { name: /Save|Update user/i })", sourceComponent: "frontend/src/services/profilesService.js; update_profile_by_admin RPC",
    crudOperation: "update", payloadCase: "null", additionalPayloadCases: ["empty"],
    requestEvidence: "Clearing username, phone, address, or DOB is serialized as JSON null.",
    responseEvidence: "The RPC uses ->> and preserves the old column when the extracted value is null, then reports success.",
    databaseEvidence: "The optional profile columns retain their previous values.",
    reproductionSteps: ["Open an audit profile with optional values.", "Clear one or more optional inputs and save.", "Compare submitted JSON, success UI, and database readback."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields", "stale_ui"], severity: "high"
  }),
  finding({
    id: "D-ID-003-PROVIDER-SUBTYPE-PERSISTS", actionId: "users.profile.edit.save", route: "/users", role: "admin",
    locator: "getByRole('button', { name: /Save|Update user/i })", sourceComponent: "frontend/src/services/profilesService.js; update_profile_by_admin RPC",
    crudOperation: "update", payloadCase: "full_valid",
    requestEvidence: "Changing provider to a non-provider role removes provider_type from the client object; the service omits it from the receiver payload.",
    responseEvidence: "The role update succeeds while the receiver preserves the old provider subtype.",
    databaseEvidence: "profiles.role is non-provider but provider_type remains populated.",
    reproductionSteps: ["Open an audit provider profile.", "Change role to a non-provider role and save.", "Read back role and provider_type together."],
    failureClasses: ["incorrect_crud_payload", "mutate_wrong_row_fields"], severity: "high"
  }),
  finding({
    id: "D-ID-004-AVATAR-CANCEL-ORPHAN", actionId: "profile.avatar.cancel", route: "/settings", role: "admin|provider",
    locator: "getByRole('button', { name: /Cancel|Close/i })", sourceComponent: "frontend/src settings/profile editor; Supabase Storage upload",
    crudOperation: "create", payloadCase: "full_valid",
    requestEvidence: "Selecting an avatar uploads immediately before the form is saved.",
    responseEvidence: "Cancel, backdrop, and close dismiss the editor without removing the uploaded object.",
    databaseEvidence: "The profile row keeps its old avatar reference while an unreferenced Storage object remains.",
    reproductionSteps: ["Open profile settings and select an AUDIT_-named avatar.", "After upload completes, choose Cancel or close the modal.", "Compare the profile avatar column with the exact Storage object list."],
    failureClasses: ["mutate_wrong_row_fields", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "D-ID-005-PROFESSIONAL-PROFILE-NO-MODAL", actionId: "settings.mobile.professional-profile.open", route: "/settings", role: "provider",
    locator: "getByRole('button', { name: /Professional profile/i })", sourceComponent: "frontend/src settings mobile components",
    crudOperation: "view", payloadCase: "null",
    requestEvidence: "The visible button sets modal state even when doctorProfile is absent.",
    responseEvidence: "The modal is conditionally not mounted, producing no request, dialog, or feedback.",
    databaseEvidence: "Read-only interaction; no database mutation occurs.",
    reproductionSteps: ["Use a provider account without a doctor_profile.", "On mobile open Settings.", "Choose Professional profile and observe no visible result."],
    failureClasses: ["do_nothing", "send_no_backend_request"], severity: "medium"
  }),
  finding({
    id: "D-ID-006-UNAUTHORIZED-GO-TODAY-LOOP", actionId: "unauthorized.go-today", route: "/unauthorized", role: "authenticated_missing_profile",
    locator: "getByRole('button', { name: /Go to Today/i })", sourceComponent: "frontend/src unauthorized page; ProtectedRoute",
    crudOperation: "navigate", payloadCase: "null",
    requestEvidence: "The button navigates to / for an account whose profile cannot satisfy the route guard.",
    responseEvidence: "The guard immediately redirects back to /unauthorized.",
    databaseEvidence: "No mutation; profile remains missing/unavailable.",
    reproductionSteps: ["Use an authenticated account whose profile lookup is unavailable.", "On /unauthorized choose Go to Today.", "Observe the redirect loop back to /unauthorized."],
    failureClasses: ["wrong_destination", "conditional_failure"], severity: "medium"
  }),
  finding({
    id: "D-ID-007-USERS-COUNT-FAILS-AS-ZERO", actionId: "users.refresh", route: "/users", role: "admin",
    locator: "getByRole('button', { name: /Refresh/i })", sourceComponent: "frontend/src/pages/UsersPage.jsx; profilesService.js",
    crudOperation: "read", payloadCase: "partial_response",
    requestEvidence: "Exact-count HEAD errors are swallowed and converted to zero while the list query can still succeed.",
    responseEvidence: "The refreshed page shows users but KPI totals of zero without an unavailable label.",
    databaseEvidence: "Displayed zero is not an exact database count; list rows prove at least one matching row.",
    reproductionSteps: ["Allow the users list request and fail only a count request.", "Choose Refresh.", "Compare visible rows with the zero KPI and captured failed response."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "medium"
  }),
  finding({
    id: "D-ID-008-ORG-ADMIN-USERS-CONTEXT-DENIED", actionId: "users.context-panel.open", route: "/users", role: "org_admin",
    locator: "Navigate to /users and open the route context panel", sourceComponent: "frontend/src context panel routing; /users authority checks",
    crudOperation: "view", payloadCase: "unauthorized_role",
    requestEvidence: "The route and invite capability admit org_admin, but the /users context-panel branch checks only isAdmin.",
    responseEvidence: "A valid org_admin sees Access Restricted instead of the Invite/Stats/Filter panel.",
    databaseEvidence: "Read-only interaction; no database mutation occurs.",
    reproductionSteps: ["Sign in as org_admin and navigate to /users.", "Open the route context panel.", "Observe Access Restricted despite the route's org_admin authority."],
    failureClasses: ["wrong_destination", "conditional_failure"], severity: "medium"
  })
);

findingCatalog.push(
  finding({
    id: "FIN-EMG-RETRY-RPC-AUTH", actionId: "emergency.retry-payment", route: "/emergencies", role: "authenticated",
    locator: "getByRole('button', { name: /Retry payment/i })", sourceComponent: "retry payment RPC migration; EmergencyRequestsPage.jsx",
    crudOperation: "create", payloadCase: "unauthorized_role", surfaceType: "receiver_only",
    requestEvidence: "The SECURITY DEFINER retry receiver does not check auth.uid, role, organization, request state, or patient ownership, and EXECUTE is not revoked from public/authenticated.",
    responseEvidence: "A direct authenticated caller who knows a request UUID can invoke the receiver outside the UI's intended authority.",
    databaseEvidence: "A pending payment can be inserted for another patient's request.",
    reproductionSteps: ["In an isolated synthetic project authenticate as an unrelated low-authority user.", "Invoke the retry RPC for a known AUDIT_ request UUID.", "Verify whether a payment row was inserted despite no request authority."],
    failureClasses: ["accept_invalid_payload", "mutate_wrong_row_fields", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "FIN-EMG-RETRY-DUPLICATE-STALE", actionId: "emergency.retry-payment", route: "/emergencies", role: "admin",
    locator: "getByRole('button', { name: /Retry payment/i })", sourceComponent: "retry payment RPC; EmergencyRequestsPage.jsx",
    crudOperation: "create", payloadCase: "double_submit", additionalPayloadCases: ["concurrency", "stale_row"], surfaceType: "receiver_only",
    requestEvidence: "The receiver has no lock, idempotency key, or uniqueness guard for pending retries.",
    responseEvidence: "It inserts a payment but does not update request payment status, so Retry remains visible and concurrent/repeated calls can both succeed.",
    databaseEvidence: "Multiple pending payment rows can reference the same emergency request while its visible payment status remains declined.",
    reproductionSteps: ["Use a synthetic declined audit request with a valid method.", "Submit two retry commands concurrently or repeat before refetch.", "Count pending payments and read request payment_status."],
    failureClasses: ["accept_invalid_payload", "stale_ui", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "FIN-INS-POLICY-PROJECTION-RLS", actionId: "insurance.refresh", route: "/insurance", role: "admin",
    locator: "getByRole('button', { name: /Refresh/i })", sourceComponent: "frontend/src insurance service/page; insurance policy RLS",
    crudOperation: "read", payloadCase: "unauthorized_role",
    requestEvidence: "The service labels its result an admin exact projection, while policy permits only owner-scoped policy reads.",
    responseEvidence: "Admin receives zero/partial policies and exact counts without an authorization-unavailable state.",
    databaseEvidence: "Displayed collection/count can omit policies that exist for other users.",
    reproductionSteps: ["Create policies for two audit users in isolation.", "As admin open or refresh Insurance.", "Compare the projection and totals to service-role exact counts."],
    failureClasses: ["fail_valid_payload", "stale_ui", "conditional_failure"], severity: "critical"
  }),
  finding({
    id: "FIN-SUB-DATE-FILTER", actionId: "subscriptions.filters.apply", route: "/subscriptions", role: "admin",
    locator: "getByRole('button', { name: 'Apply' })", sourceComponent: "frontend/src/components/common/FilterSheet.jsx; subscription service",
    crudOperation: "read", payloadCase: "full_valid",
    requestEvidence: "FilterSheet emits dateRange as {start,end}; the service expects a scalar 7d/30d/90d token and therefore adds no created_at predicate.",
    responseEvidence: "Apply closes the filter sheet, but the result set is unchanged by the selected date range.",
    databaseEvidence: "Rows outside the requested interval remain in the returned projection.",
    reproductionSteps: ["On Subscriptions choose a preset date range.", "Choose Apply.", "Inspect the outgoing query and verify it lacks a created_at range."],
    failureClasses: ["do_nothing", "incorrect_crud_payload", "stale_ui"], severity: "high"
  }),
  finding({
    id: "FIN-SUB-MOBILE-CAP-100", actionId: "subscriptions.mobile.next", route: "/subscriptions", role: "admin",
    locator: "getByRole('button', { name: /Next|Load more/i })", sourceComponent: "frontend/src mobile subscriptions page; subscription service",
    crudOperation: "read", payloadCase: "boundary_number",
    requestEvidence: "Mobile requests currentPage*20 rows, but the service clamps every request to 100 while hasNext continues using the exact larger count.",
    responseEvidence: "Next remains available beyond 100 but no rows after the first 100 can appear.",
    databaseEvidence: "Rows 101+ exist and are included in the exact count but absent from the rendered collection.",
    reproductionSteps: ["Seed more than 100 isolated audit subscriptions.", "On mobile advance past the fifth 20-row page.", "Compare rendered ids, requested limit, and exact count."],
    failureClasses: ["do_nothing", "stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "FIN-INS-ZERO-AMOUNT-RENDER", actionId: "insurance.record.open", route: "/insurance", role: "admin",
    locator: "getByRole('button', { name: /View|Details/i })", sourceComponent: "frontend/src insurance record/detail components",
    crudOperation: "view", payloadCase: "boundary_number",
    requestEvidence: "Amount rendering uses truthiness for numeric fields.",
    responseEvidence: "A valid numeric zero is shown as Not set.",
    databaseEvidence: "The stored amount is exactly 0, not null or missing.",
    reproductionSteps: ["Open an isolated audit insurance record with an amount of 0.", "Open its details.", "Compare the Not set label with the database value."],
    failureClasses: ["stale_ui"], severity: "medium"
  })
);

findingCatalog.push(
  finding({
    id: "F-CONTENT-HN-ANALYTICS-SHAPE", actionId: "health-news.analytics.open", route: "/health-news", role: "admin",
    locator: "getByRole('button', { name: /Analytics/i })", sourceComponent: "frontend/src health news service; AnalyticsModal",
    crudOperation: "read", payloadCase: "full_valid",
    requestEvidence: "The service returns scalar category totals, while AnalyticsModal reads bySource and byCategory collections.",
    responseEvidence: "The modal renders zeros/No data despite nonzero article category values.",
    databaseEvidence: "Stored and service-projected category counts are nonzero but not consumed by the modal shape.",
    reproductionSteps: ["Ensure isolated audit news rows have multiple categories.", "Open Health News Analytics.", "Compare modal distributions with the service response."],
    failureClasses: ["stale_ui"], severity: "medium"
  }),
  finding({
    id: "F-SUPPORT-MOBILE-DELETE-STALE", actionId: "support.ticket.delete.confirm", route: "/support-tickets", role: "admin",
    locator: "getByRole('button', { name: /Delete|Confirm/i })", sourceComponent: "frontend/src mobile support list accumulator",
    crudOperation: "delete", payloadCase: "full_valid",
    requestEvidence: "The mobile accumulator merges nonempty refreshed pages but never removes an id absent from the refreshed source.",
    responseEvidence: "After a successful delete/refetch, the deleted ticket can remain visible on mobile.",
    databaseEvidence: "The ticket row is absent while the client accumulator still contains it.",
    reproductionSteps: ["Delete a synthetic support ticket on mobile.", "Allow the exact delete and refetch to succeed.", "Compare the rendered accumulator with an exact id read."],
    failureClasses: ["stale_ui"], severity: "high"
  }),
  finding({
    id: "F-SUPPORT-DELETE-DOUBLE", actionId: "support.ticket.delete.confirm", route: "/support-tickets", role: "admin",
    locator: "getByRole('button', { name: /Delete|Confirm/i })", sourceComponent: "frontend/src/pages/SupportTicketsPage.jsx; ConfirmationModal.jsx",
    crudOperation: "delete", payloadCase: "double_submit", additionalPayloadCases: ["concurrency"],
    requestEvidence: "The support deletion mount does not pass isLoading to ConfirmationModal, so Confirm remains enabled during the async delete.",
    responseEvidence: "Rapid double-confirm can send two DELETE requests and produce conflicting success/error feedback.",
    databaseEvidence: "First request removes the row; the second affects zero rows or returns a receiver error.",
    reproductionSteps: ["Open delete confirmation for a synthetic support ticket.", "Delay the first DELETE and click Confirm twice.", "Count outgoing deletes and compare their responses/affected rows."],
    failureClasses: ["accept_invalid_payload", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "F-SUPPORT-STALE-DELETE-FALSE-SUCCESS", actionId: "support.ticket.delete.confirm", route: "/support-tickets", role: "admin",
    locator: "getByRole('button', { name: /Delete|Confirm/i })", sourceComponent: "frontend/src support ticket service/page",
    crudOperation: "delete", payloadCase: "stale_row",
    requestEvidence: "Delete requests no returned row/count, so a PostgREST zero-row 204 is treated as success.",
    responseEvidence: "A stale or repeated delete shows success despite no mutation.",
    databaseEvidence: "The exact target row is already absent and the second request affects zero rows.",
    reproductionSteps: ["Open a ticket deletion confirmation.", "Delete the ticket in a second synthetic session.", "Confirm from the stale session and compare success UI with affected-row evidence."],
    failureClasses: ["stale_ui", "conditional_failure"], severity: "medium"
  }),
  finding({
    id: "F-SUPPORT-ASSIGN-DOUBLE", actionId: "support.ticket.assign", route: "/support-tickets", role: "admin",
    locator: "getByRole('button', { name: /Assign|Assign to me/i })", sourceComponent: "frontend/src support desktop/mobile row actions",
    crudOperation: "update", payloadCase: "double_submit", additionalPayloadCases: ["concurrency"],
    requestEvidence: "Desktop and mobile assignment controls have no mutation-pending disable/lock.",
    responseEvidence: "Rapid activation sends duplicate PATCH requests and duplicate toasts.",
    databaseEvidence: "Both requests target the same assignment fields; final value is last-write-wins with duplicate workflow activity.",
    reproductionSteps: ["Delay assignment PATCH for a synthetic ticket.", "Activate Assign twice rapidly.", "Count PATCH requests, responses, and visible notifications."],
    failureClasses: ["accept_invalid_payload", "conditional_failure"], severity: "medium"
  }),
  finding({
    id: "F-SUPPORT-MUTATION-DOUBLE-ERROR", actionId: "support.ticket.save", route: "/support-tickets", role: "admin",
    locator: "getByRole('button', { name: /Save|Update ticket/i })", sourceComponent: "frontend/src/pages/SupportTicketsPage.jsx; SupportTicketModal.jsx",
    crudOperation: "update", payloadCase: "network_failure",
    requestEvidence: "Page handleSave calls handleApiError and rethrows; the modal catches the same rejection and calls handleApiError again.",
    responseEvidence: "One failed request produces two error notifications.",
    databaseEvidence: "The ticket row is unchanged after the single failed mutation.",
    reproductionSteps: ["Open a synthetic ticket for edit.", "Intercept save with HTTP 500.", "Choose Save and count error notifications against one failed request."],
    failureClasses: ["conditional_failure"], severity: "medium"
  }),
  finding({
    id: "F-SUPPORT-INVALID-ENUM-ACCEPTED", actionId: "support.ticket.save", route: "/support-tickets", role: "admin",
    locator: "getByRole('button', { name: /Save|Update ticket/i })", sourceComponent: "frontend/src support ticket service; support table schema",
    crudOperation: "update", payloadCase: "invalid_enum",
    requestEvidence: "The service has no allowlist validation and the schema has no CHECK constraint for category/priority.",
    responseEvidence: "A syntactically valid request containing an unsupported enum token can succeed.",
    databaseEvidence: "The invalid category or priority token is stored verbatim.",
    reproductionSteps: ["In an isolated audit project intercept/modify the save payload with an unsupported category or priority.", "Allow the request to reach Supabase.", "Read back the stored token."],
    failureClasses: ["accept_invalid_payload", "mutate_wrong_row_fields"], severity: "medium"
  }),
  finding({
    id: "F-SUPPORT-ANALYTICS-WRONG", actionId: "support.analytics.open", route: "/support-tickets", role: "admin",
    locator: "getByRole('button', { name: /Analytics/i })", sourceComponent: "frontend/src support analytics projection/modal",
    crudOperation: "read", payloadCase: "full_valid",
    requestEvidence: "avgResolutionTime is hardcoded to zero and the high-priority bucket is mapped from urgent.",
    responseEvidence: "Analytics shows a zero average and mislabeled high-priority totals.",
    databaseEvidence: "Resolved timestamps and priority values can prove nonzero/different results.",
    reproductionSteps: ["Create isolated resolved tickets with measurable durations and distinct high/urgent priorities.", "Open Support Analytics.", "Compare displayed values with exact calculations."],
    failureClasses: ["stale_ui"], severity: "medium"
  }),
  finding({
    id: "F-SUB-ANALYTICS-SHAPE", actionId: "subscriptions.analytics.open", route: "/subscriptions", role: "admin",
    locator: "getByRole('button', { name: /Analytics/i })", sourceComponent: "frontend/src subscription analytics service/modal",
    crudOperation: "read", payloadCase: "full_valid",
    requestEvidence: "The analytics object omits distribution structures consumed by the modal.",
    responseEvidence: "The modal renders zero/No data distributions although subscription rows exist.",
    databaseEvidence: "Exact grouped subscription counts are nonzero but absent from the consumed response shape.",
    reproductionSteps: ["Seed isolated audit subscriptions across plans/statuses.", "Open Subscription Analytics.", "Compare modal distributions with exact grouped counts and the service object."],
    failureClasses: ["stale_ui"], severity: "medium"
  }),
  finding({
    id: "F-HEALTH-PARTIAL-STATS-FAIL-CLOSE", actionId: "health-news.refresh", route: "/health-news", role: "admin",
    locator: "getByRole('button', { name: /Refresh/i })", sourceComponent: "frontend/src health news page/service",
    crudOperation: "read", payloadCase: "partial_response",
    requestEvidence: "Rows, count, and stats are combined with Promise.all.",
    responseEvidence: "Failure of one stats/count request rejects the whole load and hides otherwise readable article rows.",
    databaseEvidence: "Article rows remain readable in the database even though the route renders a failure/empty state.",
    reproductionSteps: ["Allow the article row request and fail only a stats/count request.", "Choose Refresh.", "Compare captured successful rows with the rendered route state."],
    failureClasses: ["fail_valid_payload", "conditional_failure"], severity: "medium"
  }),
  finding({
    id: "F-SUBSCRIBER-PARTIAL-STATS-FAIL-CLOSE", actionId: "subscriptions.refresh", route: "/subscriptions", role: "admin",
    locator: "getByRole('button', { name: /Refresh/i })", sourceComponent: "frontend/src subscription page/service",
    crudOperation: "read", payloadCase: "partial_response",
    requestEvidence: "Subscriber rows are coupled to eight count/stat requests in an all-or-nothing load path.",
    responseEvidence: "One auxiliary count failure blanks readable subscriber rows.",
    databaseEvidence: "Subscriber rows remain readable even though the combined route load fails.",
    reproductionSteps: ["Allow subscriber rows and fail one auxiliary count request.", "Choose Refresh.", "Compare successful row evidence with the rendered route state."],
    failureClasses: ["fail_valid_payload", "conditional_failure"], severity: "medium"
  }),
  finding({
    id: "B-DOC-PROFILE-FIELDS-NOT-DURABLE", actionId: "doctor.modal.save", route: "/doctors", role: "org_admin",
    locator: "getByRole('button', { name: /Save/i })", sourceComponent: "frontend/src/components/modals/DoctorModal.jsx; doctorsService.js; 20260219000900_automations.sql",
    crudOperation: "update", payloadCase: "stale_row",
    requestEvidence: "Doctor edits write name, email, and phone directly to the doctors row even when the row is linked to a profile.",
    responseEvidence: "The save can report success, but a later linked-profile update reprojects profile-owned identity fields over the doctor row.",
    databaseEvidence: "The profile-to-doctor automation overwrites linked doctor identity fields on later profile updates.",
    reproductionSteps: ["Edit identity fields for a profile-linked doctor.", "Update the linked profile.", "Compare the doctor identity fields before and after automation."],
    failureClasses: ["mutate_wrong_row_fields", "stale_ui", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "C-21-NEARBY-AMBULANCES-PUBLIC-DEFINER", actionId: "map.dispatch.nearest", route: "/map", role: "unauthenticated",
    locator: "nearby_ambulances RPC", sourceComponent: "frontend/supabase/migrations/20260219010000_core_rpcs.sql; frontend/src/services/emergencyResponseService.js",
    crudOperation: "read", payloadCase: "unauthorized_role", surfaceType: "receiver_only",
    requestEvidence: "The dispatch candidate path calls a global SECURITY DEFINER nearby_ambulances projection, and maintained source contains no matching privilege revoke or actor-organization predicate.",
    responseEvidence: "A caller with function execution privilege can receive live fleet candidates outside an authorized console route.",
    databaseEvidence: "The function reads current ambulance location and availability without an auth.uid() or organization boundary in its body.",
    reproductionSteps: ["In an isolated project, invoke nearby_ambulances without an authenticated operator role.", "Verify execution privilege and returned fleet scope."],
    failureClasses: ["accept_invalid_payload", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "C-22-CRITICAL-CARE-IMPOSSIBLE-FACET", actionId: "map.refresh", route: "/map", role: "admin",
    locator: "getByRole('button', { name: /Refresh/i })", sourceComponent: "frontend/src/services/supabaseMapService.js; 20260219000300_logistics.sql",
    crudOperation: "read", payloadCase: "invalid_enum",
    requestEvidence: "The map requests and displays an exact critical_care service-type facet.",
    responseEvidence: "The facet is structurally zero and can be mistaken for a real operational absence.",
    databaseEvidence: "Maintained emergency_requests.service_type permits ambulance, bed, and booking, but not critical_care.",
    reproductionSteps: ["Open /map with an authorized operator.", "Compare the Critical care facet to the maintained service_type constraint."],
    failureClasses: ["incorrect_crud_payload", "stale_ui"], severity: "high"
  }),
  finding({
    id: "D-ID-009-QUICK-SEARCH-ROLE-BLIND", actionId: "quick-search.result.open", route: "multiple", role: "viewer",
    locator: "Quick Search result", sourceComponent: "frontend/src/components/navigation/QuickSearch.jsx; searchService.js; App.js",
    crudOperation: "navigate", payloadCase: "unauthorized_role",
    requestEvidence: "Quick Search does not constrain categories or destinations to the actor's route authority.",
    responseEvidence: "A public-readable provider or facility result can navigate a lower-role actor directly to an org-admin route and Unauthorized.",
    databaseEvidence: "Public-readable directory policies can return rows whose console detail routes require org_admin.",
    reproductionSteps: ["Use a viewer role and search for a public-readable facility or provider.", "Open the result.", "Observe navigation to an unauthorized destination."],
    failureClasses: ["wrong_destination", "conditional_failure"], severity: "high"
  }),
  finding({
    id: "B-HSP-RPC-ORG-ADMIN-SELF-VERIFY", actionId: "rpc.update-hospital.self-verify", route: "/hospitals", role: "org_admin",
    locator: "update_hospital_by_admin RPC", sourceComponent: "frontend/supabase/migrations/20260219010000_core_rpcs.sql",
    crudOperation: "update", payloadCase: "unauthorized_role", surfaceType: "receiver_only",
    requestEvidence: "The mounted form strips verification fields for org_admin, but the authenticated RPC still accepts verified and verification_status from a same-organization caller.",
    responseEvidence: "A direct org-admin RPC call can report success outside the protected UI path.",
    databaseEvidence: "The receiver can set hospitals.verified and verification_status without requiring platform-admin authority.",
    reproductionSteps: ["In an isolated project, authenticate as org_admin for an owned hospital.", "Invoke update_hospital_by_admin directly with verification fields.", "Read back the hospital verification state."],
    failureClasses: ["accept_invalid_payload", "mutate_wrong_row_fields", "conditional_failure"], severity: "critical"
  })
);

const baseBlockedCandidates = [
  blocked({
    id: "G-H001-CROSS-ACCOUNT-CACHE-SCOPE", actionId: "auth.signout-then-signin", route: "multiple", role: "admin_to_org_admin_or_provider",
    locator: "getByRole('button', { name: /Sign out/i }) then password sign-in", sourceComponent: "frontend/src query keys; queryClient.js; AuthContext.jsx",
    crudOperation: "read", payloadCase: "unauthorized_role",
    reason: "Requires two approved tagged accounts in the same browser. Query keys omit actor/org, cache is retained, and signOut does not clear it; real clinical data made this unsafe to exercise."
  }),
  blocked({
    id: "G-H002-REALTIME-OPTIMISTIC-RACE", actionId: "domain.optimistic-mutation", route: "multiple", role: "authorized_mutator",
    locator: "Domain Save/Delete control", sourceComponent: "frontend/src TanStack mutations and realtime handlers",
    crudOperation: "update", payloadCase: "concurrency",
    reason: "Requires two isolated tagged rows plus delayed mutation/refetch/realtime ordering. Query functions do not consume abort signals, so convergence must be proven in synthetic staging."
  }),
  blocked({
    id: "G-H003-GO-BACK-EMPTY-HISTORY", actionId: "protected-route.go-back", route: "/unauthorized", role: "unauthorized",
    locator: "getByRole('button', { name: /Go back/i })", sourceComponent: "frontend/src ProtectedRoute unauthorized surface",
    crudOperation: "navigate", payloadCase: "stale_row",
    reason: "Direct-entry empty-history behavior needs a dedicated clean browser context; source sets pending before navigate(-1) and has no reset if navigation is a no-op."
  }),
  blocked({
    id: "PR-DB-HOSPITAL-ARRAY-CANON-MERGE", actionId: "schema.hospital-array-preservation.merge", route: "/verification", role: "schema_owner",
    locator: "ivisit-app branch fix/hospital-array-coalesce", sourceComponent: "ivisit-app commit 35c8c969; frontend/supabase/docs/PENDING_REVIEW_MERGES.md",
    crudOperation: "deploy", payloadCase: "stale_row",
    reason: "The live update_hospital_by_admin receiver is documented as array-preserving, but its canonical pillar fix remains on an unmerged ivisit-app branch. Merge that source before declaring clean-rebuild parity."
  }),
  blocked({
    id: "PR-DB-INSURANCE-PILLAR-DRIFT", actionId: "schema.insurance-policy-parity", route: "/insurance", role: "schema_owner",
    locator: "insurance_policies pillar versus generated/live projection", sourceComponent: "frontend/supabase/migrations/20260219000400_finance.sql; frontend/src/types/database.ts",
    crudOperation: "deploy", payloadCase: "partial_response",
    reason: "Read-only live OpenAPI and generated types expose modern insurance policy columns that the maintained finance pillar does not create. Reconcile the canonical ivisit-app pillar before claiming clean-rebuild parity."
  }),
  blocked({
    id: "PR-DB-STORAGE-POLICY-CANON", actionId: "storage.upload.authority", route: "multiple", role: "authenticated",
    locator: "images/documents Storage upload controls", sourceComponent: "frontend/src upload services; frontend/supabase migrations",
    crudOperation: "create", payloadCase: "unauthorized_role",
    reason: "Read-only live evidence confirms public images and private documents buckets exist, but maintained migrations still do not capture their storage.objects policies. Upload authority and cleanup parity remain source-unproved."
  }),
  blocked({
    id: "PR-DOCTOR-GENERIC-UPDATE-RECEIVER", actionId: "doctor.service.update", route: "/doctors", role: "admin|org_admin|provider",
    locator: "doctorsService.updateDoctor", sourceComponent: "frontend/src/services/doctorsService.js; frontend/src/hooks/useDoctorProfile.js",
    crudOperation: "update", payloadCase: "unauthorized_role", additionalPayloadCases: ["full_valid"],
    reason: "Mounted Staff editing no longer writes lifecycle or linked identity, but the generic exported service still accepts status and profile_id. Prove or replace the dedicated lifecycle/profile authority before reconnecting either field."
  }),
  blocked({
    id: "PR-DOCTOR-GENERIC-DELETE-RECEIVER", actionId: "doctor.service.delete", route: "/doctors", role: "admin|org_admin",
    locator: "doctorsService.deleteDoctor", sourceComponent: "frontend/src/services/doctorsService.js; doctor foreign keys and profile automation",
    crudOperation: "delete", payloadCase: "full_valid", additionalPayloadCases: ["stale_row"],
    reason: "Mounted single and bulk delete actions are removed, but the exported direct-table delete has no clinical-evidence, linked-profile, affected-row, or durable-retirement contract. Keep it disconnected until a canonical retirement receiver exists."
  }),
  blocked({
    id: "PR-DOCTOR-RLS-ROLE-AUTHORITY", actionId: "doctor.receiver.role-authority", route: "/doctors", role: "provider|sponsor|viewer",
    locator: "direct doctors INSERT/UPDATE/DELETE in an organization", sourceComponent: "frontend/supabase/migrations/20260219000700_security.sql",
    crudOperation: "update", payloadCase: "unauthorized_role", additionalPayloadCases: ["full_valid"],
    reason: "The maintained policy named Org Admins manage doctors checks only that doctors.hospital_id belongs to p_get_current_org_id() or that the caller is platform admin. p_get_current_org_id() returns organization_id for any authenticated profile and the policy has no org_admin role predicate, so non-admin organization members need isolated receiver-level authorization proof before doctor writes are trusted."
  }),
  blocked({
    id: "PR-SUPPORT-ENUM-CONSTRAINT", actionId: "schema.support-ticket-enum-authority", route: "/support-tickets", role: "schema_owner",
    locator: "support_tickets category/status/priority columns", sourceComponent: "frontend/supabase/migrations/20260219000500_ops_content.sql",
    crudOperation: "deploy", payloadCase: "invalid_enum",
    reason: "Console service writes now enforce the mounted category, status, and priority vocabularies, but the canonical table still declares unconstrained TEXT columns. Add and reconcile database CHECK constraints before claiming ecosystem-wide enum enforcement."
  }),
  blocked({
    id: "PR-DB-SHARED-CONTRACT-LIVE-APPLY", actionId: "schema.console-shared-contracts.deploy", route: "multiple", role: "schema_owner",
    locator: "ivisit-app canonical pillars and linked Supabase project", sourceComponent: "ivisit-app/supabase/migrations; frontend/supabase/migrations",
    crudOperation: "deploy", payloadCase: "partial_response", additionalPayloadCases: ["unauthorized_role", "concurrency"],
    reason: "The canonical App pillars, Console mirror, static shared-contract guard, Console tests, and production build are aligned. These dated pillar versions are already recorded on the linked project and will not replay automatically; merge the App owner source, apply the reviewed SQL through the approved Supabase workflow, and run receiver-level role/concurrency proof before claiming linked-project parity."
  })
];

const sourceSnapshots = [
  { lane: "B", capturedAt, mode: "read_only", note: "Facilities, organizations, verification, onboarding, fleet, and staff receivers revalidated against the current worktree and maintained SQL." },
  { lane: "C", capturedAt, mode: "read_only", head: "b827458b", note: "Clinical and dispatch mounted paths plus canonical receiver source revalidated; linked-project application remains separately blocked." },
  { lane: "D", capturedAt, mode: "read_only", visibleCandidates: 67, note: "Identity, profiles, Settings, MFA assurance, account cache, avatar persistence, and role guards revalidated with focused tests." },
  { lane: "E", capturedAt, mode: "read_only", mountedSourceActions: 75, note: "Financial routes plus emergency payment actions; trigger-sensitive writes were not invoked." },
  { lane: "F", capturedAt, mode: "read_only", semanticCandidates: 84, note: "Health News, Support, and subscriber mounted paths revalidated; schema-wide Support enum authority remains blocked." },
  { lane: "G", capturedAt, mode: "read_only", semanticFailureInjectionCases: 50, note: "Failure, concurrency, timeout, cache, and navigation mechanisms revalidated with focused tests; unsafe live mutation was not performed." },
  { lane: "PR", capturedAt, mode: "read_only_current_worktree", note: "All findings were revalidated against the dirty PR worktree and App-owned canonical pillars; source resolution and linked-project deployment proof remain disjoint." }
];

const resolvedFindingReasons = Object.freeze({
  "B-HSP-SELF-VERIFY": "The mounted hospital editor strips verification fields for non-admins, and the canonical receiver independently rejects verification keys unless the actor is a platform admin.",
  "B-FAC-VERIFY-CLEARS-TAXONOMY-APPROVE": "update_hospital_by_admin preserves omitted taxonomy arrays and still permits an explicit empty array to clear them; the exact branch patch is absorbed in the App-owned pillar.",
  "B-FAC-VERIFY-CLEARS-TAXONOMY-REJECT": "update_hospital_by_admin preserves omitted taxonomy arrays and still permits an explicit empty array to clear them; the exact branch patch is absorbed in the App-owned pillar.",
  "B-VER-MODAL-FALSE-SUCCESS-APPROVE": "Verification approval now withholds success and keeps the modal open when the receiver rejects or returns false.",
  "B-VER-MODAL-FALSE-SUCCESS-REJECT": "The provider verification modal is approve-only; facility rejection is owned by a separate page action.",
  "B-VER-MOBILE-BULK-RACE-APPROVE": "Mobile provider approvals now run sequentially with progress and retain failed selections.",
  "B-VER-MOBILE-BULK-RACE-REJECT": "Mobile verification selection is provider-only and the bulk surface no longer advertises rejection.",
  "B-ONB-STORAGE-CLEANUP-UNVERIFIED": "Onboarding inspects Storage remove results and surfaces DOCUMENT_CLEANUP_FAILED when cleanup is rejected; canonical private evidence policies restrict upload, read, and pre-submission cleanup to the actor path.",
  "B-ONB-SIGNOUT-UNHANDLED": "Onboarding awaits sign-out and AuthContext clears local state from a finally block when remote sign-out fails.",
  "C-09-ANALYTICS-PARTIAL-AS-TOTAL": "The analytics entry point now treats loaded rows as an explicit preview and does not open complete statistics when the server summary is unavailable.",
  "C-10-MOBILE-VISIT-INCIDENT-NO-DESTINATION": "The visit incident event now opens Emergency Details on mobile as well as desktop.",
  "C-11-VISIT-DETAIL-RETRY-NO-CALLBACK": "Retry payment is rendered only when a real retry callback is supplied.",
  "C-15-DRIVER-REJECTED-STATUS-FALSE-SUCCESS": "The map now treats a null or false lifecycle result as failure and withholds success feedback.",
  "C-20-MAP-CAP-HIDDEN-FROM-OPERATOR": "Desktop Active routes now uses an RBAC-scoped exact count and labels its fallback as routes shown.",
  "D-ID-005-PROFESSIONAL-PROFILE-NO-MODAL": "Mobile Settings now renders loading, available, and explicit unavailable professional-profile states with a guarded modal action.",
  "D-ID-006-UNAUTHORIZED-GO-TODAY-LOOP": "The Unauthorized surface now offers Today only when a confirmed profile can access the canonical root navigation item.",
  "D-ID-008-ORG-ADMIN-USERS-CONTEXT-DENIED": "The Users context panel now accepts the same org_admin authority as the mounted route.",
  "D-ID-009-QUICK-SEARCH-ROLE-BLIND": "Quick Search now filters and rechecks destinations against the same canonical accessible navigation used by the active shell, including normalized query-string paths.",
  "G-F001-EMERGENCY-NOTIFICATION-PARTIAL-COMMIT": "Notification failure is contained and no longer turns a committed emergency request into a retryable create failure.",
  "G-F005-EMERGENCY-CANCEL-DOUBLE-CONFIRM": "The emergency cancel confirmation now receives mutation pending state and cannot submit twice while the receiver is active.",
  "G-F008-NOTIFICATIONS-FAILURE-FALSE-EMPTY": "Notification query failures now propagate into retryable failure states instead of rendering false empty state.",
  "G-F009-MARK-ALL-SILENT-ROLLBACK": "Mark all read now exposes pending and failure feedback and restores the prior row state when the receiver rejects.",
  "G-F010-QUICK-SEARCH-FAILURE-FALSE-EMPTY": "Search projections now propagate failures and Quick Search renders sanitized retry feedback rather than false no-results copy.",
  "G-F011-QUICK-SEARCH-OUT-OF-ORDER": "Quick Search request sequencing prevents stale responses from replacing newer results after search, clear, close, or selection.",
  "FIN-SUB-DATE-FILTER": "Subscriber date filters now translate the selected start/end range into created_at bounds instead of silently dropping the predicate.",
  "FIN-SUB-MOBILE-CAP-100": "Mobile subscriber pagination now requests true offset pages and accumulates settled rows without clamping the whole route to 100 records.",
  "FIN-INS-ZERO-AMOUNT-RENDER": "Insurance amount projections use nullish checks, so a legitimate zero renders as money instead of an unavailable placeholder.",
  "F-CONTENT-HN-ANALYTICS-SHAPE": "Health News analytics now consumes the route projection and labels category and source distributions as current-page evidence.",
  "F-SUPPORT-DELETE-DOUBLE": "Single-ticket deletion passes pending state to the confirmation surface and rejects a second submit while the receiver is active.",
  "F-SUPPORT-ASSIGN-DOUBLE": "Support assignment controls share a pending guard and remain disabled while the assignment receiver is active.",
  "F-SUPPORT-MUTATION-DOUBLE-ERROR": "Support save failures are handled once at the modal boundary instead of being reported by both page and modal.",
  "F-SUPPORT-ANALYTICS-WRONG": "Support analytics derives resolution time and priority buckets from available ticket fields and labels the projection scope honestly.",
  "F-SUB-ANALYTICS-SHAPE": "Subscriber analytics now exposes the distribution structures consumed by the modal and labels their available scope.",
  "B-HSP-STALE-UPDATE-SUCCESS": "Hospital updates now require a successful RPC result and an existing-row readback before the page can report success.",
  "B-HSP-BLANK-CLEAR-NOOP": "Intentional clears for optional text fields now remain explicit empty values in the RPC payload instead of being omitted and silently preserved.",
  "B-HSP-CAPACITY-SILENT-NORMALIZATION": "The service rejects negative, fractional, cross-field inconsistent, and unsupported capacity/status values before the normalization trigger can rewrite them silently.",
  "B-HSP-RESERVATION-FAILURE-AS-EMPTY": "Bed read failures now propagate to a retryable modal error state; an empty reservation list is rendered only after a successful read.",
  "B-AMB-STALE-STATUS-OVERWRITE": "Ambulance metadata edits omit status in both the modal payload and generic update whitelist; dispatch lifecycle state is read-only on existing units.",
  "B-DOC-INVITED-STATUS-MUTATION": "Staff editing preserves invited and unknown lifecycle values and no longer submits status during ordinary edits.",
  "B-DOC-AVAILABLE-BUT-UNUSABLE": "The mounted Staff editor no longer advertises a lifecycle write, rows with status available but is_available false are labeled unavailable for assignment, and the generic service rejects lifecycle and availability fields.",
  "B-DOC-DELETE-CLINICAL-EVIDENCE": "Mounted single and bulk Staff deletion were removed from desktop, mobile, and the detail rail; the generic delete export also fails closed without a database call.",
  "B-DOC-STALE-DELETE-SUCCESS": "The mounted Staff route no longer invokes doctor deletion, so stale zero-row success cannot be presented by the current page.",
  "B-DOC-LINKED-DELETE-NOT-DURABLE": "The mounted Staff route no longer invokes doctor deletion, and the generic delete export fails closed until a durable retirement receiver exists.",
  "G-F002-DOCTOR-DELETE-DOUBLE-CONFIRM": "The mounted Staff route no longer exposes single deletion or a deletion confirmation surface.",
  "G-F003-DOCTOR-BULK-PARTIAL-CONCURRENT": "The mounted Staff selection bar no longer exposes bulk deletion.",
  "B-DOC-PROFILE-FIELDS-NOT-DURABLE": "Linked profile identity fields are read-only in the mounted Staff editor, omitted from generic writes, and guarded at the database trigger boundary as profile-owned identity.",
  "B-DOC-EXTERNAL-FACILITY-OPTION": "The Staff editor now loads canonical organization-scoped facility options, and the service rejects missing, cleared, or forged external facility ids before Supabase for org_admin creates and updates.",
  "C-01-ORG-ADMIN-CREATE-MISSING-FACILITY": "Org-admin emergency creation now requires and server-verifies a facility in the actor organization before either create receiver is called.",
  "C-02-ADMIN-CREATE-DROPS-COORDINATES": "Console emergency creation normalizes {lat,lng}, pickup, and scalar coordinate inputs into the patient_location and scalar receiver fields without dropping valid zero values.",
  "C-03-CREATE-TYPE-COERCED": "The create surface and service accept only the canonical ambulance, bed, and booking service vocabulary; incident language remains separate from service_type.",
  "C-06-PROVIDER-COMPLETE-OWNERSHIP-MISMATCH": "Provider completion now requires the current actor to be the assigned responder in both page action state and the service boundary.",
  "C-07-RETRY-PAYMENT-METHOD-RLS": "The mounted retry-payment path remains disconnected until deployment proof, while the canonical receiver now validates owner, method, request state, locking, and execute scope.",
  "C-08-DETAIL-REFRESH-REUSES-STALE-PROP": "Emergency Details always rereads the canonical row by id and applies payment, visit, loading, error, and request state only for the latest open request sequence.",
  "C-16-WRONG-ASSIGNEE-DRIVER-CONTROLS": "Map lifecycle controls now require the current provider identity to match the assigned responder before a command is exposed or submitted.",
  "C-17-LOCATION-COMMIT-THEN-READ-FAILS": "Responder location command success is returned independently from the optional projection reload, which now reports projectionState unavailable without reclassifying the committed command.",
  "C-18-CROSS-ORG-NEAREST-DISPATCH": "Nearest dispatch now validates the actor facility scope and excludes ambulance candidates outside the actor organization and canonical hospital set before invoking the receiver.",
  "G-F004-SUPPORT-BULK-PARTIAL-SEQUENTIAL": "Bulk Support deletion settles every selected id, tombstones only exact receiver-confirmed identities, and leaves failed ids selected with accurate partial feedback.",
  "G-F007-SUPPORT-CREATE-REFETCH-FAILURE": "Support create writes the receiver-confirmed row into the active cache before awaited convergence; a failed refetch is rendered as a separate degraded state instead of a false insert failure.",
  "G-F012A-AMBULANCES-REFRESH-TIMEOUT-AMPLIFICATION": "Ambulance TanStack queries consume the provided abort signal, and one request budget now cancels the underlying PostgREST request instead of stacking timeout retries.",
  "G-F012A-AMBULANCES-RETRY-TIMEOUT-AMPLIFICATION": "Ambulance Retry uses the same abort-aware query owner and bounded retry policy as Refresh.",
  "G-F012B-VISITS-REFRESH-TIMEOUT-AMPLIFICATION": "Visits owns one AbortController and one transient retry layer inside a single request budget; timeout, cancellation, supersession, and unmount abort the underlying requests.",
  "G-F012B-VISITS-RETRY-TIMEOUT-AMPLIFICATION": "Visits Retry reuses the same abort-aware bounded request owner instead of multiplying page and query retries.",
  "D-ID-001-MFA-AAL1-BYPASS": "AuthContext now owns AAL assurance, MFA challenge, and verification state; Login retains an AAL1 MFA-required session for verification and ProtectedRoute never renders protected children before AAL satisfaction.",
  "D-ID-002-CLEAR-OPTIONAL-PROFILE-NOOP": "Explicit optional-field clears are translated to the maintained admin RPC empty-value contract instead of becoming ignored JSON nulls.",
  "D-ID-003-PROVIDER-SUBTYPE-PERSISTS": "Moving a profile out of the provider role now clears provider_type in both the mounted modal payload and the service invariant.",
  "D-ID-004-AVATAR-CANCEL-ORPHAN": "Avatar selection now creates only a revocable local preview; upload starts on Save, and failed profile persistence performs reflected-read cleanup limited to the new owned object.",
  "D-ID-007-USERS-COUNT-FAILS-AS-ZERO": "Exact-count failure no longer becomes zero: loaded users remain visible while desktop and mobile render an explicit retryable totals-unavailable state.",
  "F-SUPPORT-MOBILE-DELETE-STALE": "Receiver-confirmed Support deletions become durable mobile tombstones that prune every loaded and later page window; failed mutations create no tombstone.",
  "F-SUPPORT-STALE-DELETE-FALSE-SUCCESS": "Support delete requires the exact returned deleted id and rejects stale, policy-filtered, or zero-row results before success feedback.",
  "F-SUPPORT-INVALID-ENUM-ACCEPTED": "Mounted Support paths validate one canonical service allowlist and the App-owned table pillar enforces the same category, priority, and status vocabularies with CHECK constraints.",
  "F-HEALTH-PARTIAL-STATS-FAIL-CLOSE": "Health News auxiliary-stat failure now preserves successfully loaded rows and exact count while labeling the KPI fallback as loaded-row evidence.",
  "F-SUBSCRIBER-PARTIAL-STATS-FAIL-CLOSE": "Subscriber auxiliary-count failure now preserves successfully loaded rows and reports totals as unavailable instead of replacing the route with false empty state.",
  "C-22-CRITICAL-CARE-IMPOSSIBLE-FACET": "The impossible critical_care facet was removed; Requests and Map now use canonical ambulance, bed, booking, and active dimensions only.",
  "B-AMB-CROSS-ORG-STATION": "Canonical ambulance RLS now requires an org_admin role, treats a non-null organization_id as the primary owner, and requires every supplied hospital edge to belong to the same actor organization; Console service and dispatch candidate scope use the same rule.",
  "B-HSP-RPC-ORG-ADMIN-SELF-VERIFY": "update_hospital_by_admin now requires platform-admin authority whenever verified or verification_status is present, even for a same-organization org_admin direct RPC call.",
  "C-04-CREATE-OMITS-LINKED-VISIT": "console_create_emergency_request now inserts the linked visit in the same receiver transaction and returns the visit identity with the request projection.",
  "C-21-NEARBY-AMBULANCES-PUBLIC-DEFINER": "nearby_ambulances now validates the authenticated operator role, scopes org_admin and dispatcher results to their organization, uses geography meters, and revokes PUBLIC and anon execution.",
  "FIN-EMG-RETRY-DUPLICATE-STALE": "Payment retry now locks the request, reuses any existing pending payment, serializes new pending creation, and converges request status and payment_status before returning.",
  "FIN-EMG-RETRY-RPC-AUTH": "Payment retry now permits only the request owner or service_role, validates the replacement method against that owner, sets a safe search_path, and revokes PUBLIC and anon execution.",
  "FIN-INS-POLICY-PROJECTION-RLS": "The canonical insurance policy pillar now matches the App and Console projection, owner writes include WITH CHECK, and platform admins have an explicit SELECT policy for complete Console reads.",
  "B-RQ-DERIVED-STALE-UI": "Hospital mutations await a throwing root invalidation before mutateAsync settles and report convergence failures separately from committed writes; route queries and deep-link reads consume cancellation signals."
});

const resolvedBlockedCandidateReasons = Object.freeze({
  "G-H001-CROSS-ACCOUNT-CACHE-SCOPE": "AuthContext clears the TanStack Query client whenever authenticated ownership changes or ends, while same-user token and MFA refreshes retain the cache; focused contracts cover replacement and sign-out paths.",
  "G-H003-GO-BACK-EMPTY-HISTORY": "Unauthorized Go Back enters pending immediately, detects unusable history, and falls back to the first role-accessible canonical navigation route or signs out before Login when no console route exists.",
  "G-H002-REALTIME-OPTIMISTIC-RACE": "All five active domain query owners forward TanStack cancellation to PostgREST, all five mutation owners await throwing invalidation, and focused delayed-invalidation coverage proves mutateAsync cannot settle before convergence.",
  "PR-DB-HOSPITAL-ARRAY-CANON-MERGE": "The exact hospital array-preservation branch behavior is absorbed in the App-owned core RPC pillar, synchronized to Console, and guarded; the standalone branch no longer needs merging.",
  "PR-DB-INSURANCE-PILLAR-DRIFT": "The App-owned finance pillar now creates the modern insurance fields consumed by both products and the shared-contract guard locks clean-rebuild parity.",
  "PR-DB-STORAGE-POLICY-CANON": "The security pillar now declares public images and private documents buckets, owner-folder image writes, and private onboarding evidence policies; unproved hospital, ambulance, and insurance uploads remain disconnected.",
  "PR-DOCTOR-GENERIC-UPDATE-RECEIVER": "The generic doctor service rejects profile, lifecycle, availability, rating, and derived fields; linked provider editing is fail-closed until a dedicated workflow exists.",
  "PR-DOCTOR-GENERIC-DELETE-RECEIVER": "The generic doctor delete export now fails closed with DOCTOR_RETIREMENT_UNAVAILABLE and performs no database call.",
  "PR-DOCTOR-RLS-ROLE-AUTHORITY": "Doctor RLS now requires platform admin or an explicit org_admin in the facility organization, and authenticated grants are limited to proved directory columns with no DELETE grant.",
  "PR-SUPPORT-ENUM-CONSTRAINT": "The canonical support_tickets table now enforces the mounted category, status, and priority vocabularies with database CHECK constraints."
});

const uncertainFindingReasons = Object.freeze({});

const resolvedCatalogFindings = findingCatalog
  .filter((item) => resolvedFindingReasons[item.failureId])
  .map((item) => ({
    ...item,
    evidenceStatus: "resolved",
    resolvedAt: capturedAt,
    resolutionEvidence: resolvedFindingReasons[item.failureId]
  }));

const resolvedBlockedFindings = baseBlockedCandidates
  .filter((item) => resolvedBlockedCandidateReasons[item.failureId])
  .map((item) => ({
    ...item,
    evidenceStatus: "resolved",
    resolvedAt: capturedAt,
    resolutionEvidence: resolvedBlockedCandidateReasons[item.failureId]
  }));

const resolvedFindings = [...resolvedCatalogFindings, ...resolvedBlockedFindings];

const uncertainCandidates = findingCatalog
  .filter((item) => uncertainFindingReasons[item.failureId])
  .map((item) => ({
    ...item,
    severity: "unconfirmed",
    evidenceStatus: "runtime_blocked",
    blockedReason: uncertainFindingReasons[item.failureId]
  }));

const failures = findingCatalog.filter((item) => (
  !resolvedFindingReasons[item.failureId] && !uncertainFindingReasons[item.failureId]
));
const blockedCandidates = [
  ...baseBlockedCandidates.filter((item) => !resolvedBlockedCandidateReasons[item.failureId]),
  ...uncertainCandidates
];

module.exports = {
  failures,
  resolvedFindings,
  blockedCandidates,
  sourceSnapshots,
  finding,
  blocked
};
