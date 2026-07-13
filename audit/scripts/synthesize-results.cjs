const fs = require("node:fs");
const path = require("node:path");
const { auditRoot, resultsRoot } = require("../support/environment.cjs");
const { atomicWriteJson, atomicWriteText, getRunManifest } = require("../support/integrity.cjs");
const { sanitizeRuntimeAction } = require("../support/redaction.cjs");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function walk(directory, matcher) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute, matcher) : matcher(absolute) ? [absolute] : [];
  });
}

const staticInventory = readJson(path.join(resultsRoot, "static-actions.json"), { total: 0, actions: [], parseErrors: [] });
const roleStates = readJson(path.join(resultsRoot, "role-state-availability.json"), { roles: {} });
const authenticatedRoutes = new Set([
  "/", "/map", "/analytics", "/hospitals", "/ambulances", "/doctors", "/visits",
  "/emergencies", "/verification", "/users", "/organizations", "/settings", "/health-news",
  "/support-tickets", "/insurance", "/subscriptions", "/wallet", "/pricing"
]);
const publicRoutes = new Set(["/login", "/set-password", "/onboarding", "/onboarding-success", "/unauthorized", "/audit-not-found"]);
const runtimeFiles = walk(path.join(resultsRoot, "runtime-inventory"), (file) => file.endsWith(".json"));
const runtimeInventories = runtimeFiles.map((file) => ({
  inventory: readJson(file, null),
  projectName: path.basename(path.dirname(file))
})).filter(({ inventory, projectName }) => {
  if (!inventory) return false;
  if (["admin-desktop", "admin-mobile"].includes(projectName)) return authenticatedRoutes.has(inventory.requestedRoute);
  if (projectName === "unauthenticated-desktop") return publicRoutes.has(inventory.requestedRoute);
  return false;
}).map(({ inventory }) => inventory);
const runtimeActions = runtimeInventories.flatMap((inventory) => {
  const unique = new Map();
  const all = [
    ...(inventory.baseActions || []),
    ...(inventory.popups || []).flatMap((popup) => popup.actions || [])
  ].map((action, index) => sanitizeRuntimeAction(action, inventory.requestedRoute, index));
  for (const action of all) {
    if ((action.x + action.width) <= 0 || (action.y + action.height) <= 0) continue;
    const key = [
      action.actorRole || action.role,
      action.viewportClass,
      inventory.requestedRoute,
      action.tag,
      action.controlRole || action.role,
      action.name,
      action.href,
      action.type,
      action.disabled
    ].join("|");
    if (!unique.has(key)) unique.set(key, action);
  }
  return [...unique.values()];
});
const runManifest = getRunManifest(resultsRoot);
if (!runManifest?.runId) {
  throw new Error("Audit run manifest is missing. Run npm run report:begin first.");
}
const generatedAt = new Date().toISOString();
const prScope = readJson(path.join(resultsRoot, "pr-scope.json"), null);

const ledger = {
  schemaVersion: 2,
  generatedAt,
  runId: runManifest.runId,
  targetRef: "ivisit-console-revamp-*",
  discoveryOnly: true,
  provisional: true,
  counts: {
    staticCandidates: staticInventory.total,
    runtimeVisibleDefinitions: runtimeActions.length,
    runtimeSurfaces: runtimeInventories.length
  },
  roleStateAvailability: roleStates.roles,
  prScope,
  staticCandidates: staticInventory.actions,
  runtimeVisibleActions: runtimeActions,
  confirmedFailures: [],
  resolvedFindings: [],
  blockedCandidates: []
};

const defaultPayloadCases = [
  "minimum_valid", "full_valid", "missing_required", "null", "empty", "duplicate",
  "invalid_enum", "invalid_uuid", "boundary_number", "unicode", "double_submit",
  "stale_row", "unauthorized_role", "network_failure", "retry", "concurrency",
  "partial_response"
];
const payloadMatrixPath = path.join(auditRoot, "payload-matrix.json");
const payloadMatrix = {
  schemaVersion: 2,
  generatedAt,
  runId: runManifest.runId,
  provisional: true,
  cases: defaultPayloadCases.map((caseId) => ({
    caseId,
    status: "not_executed",
    evidenceByAction: [],
    actionIds: [],
    blockedActionIds: [],
    resolvedActionIds: []
  }))
};

const rawResults = {
  schemaVersion: 2,
  generatedAt,
  runId: runManifest.runId,
  provisional: true,
  roleStateAvailability: roleStates.roles,
  prScope,
  static: { total: staticInventory.total, parseErrors: staticInventory.parseErrors },
  runtime: {
    surfaceCount: runtimeInventories.length,
    visibleActionDefinitionCount: runtimeActions.length,
    surfaces: runtimeInventories.map((inventory) => ({
      requestedRoute: inventory.requestedRoute,
      observedRoute: inventory.observedRoute,
      actorRole: inventory.actorRole,
      viewportClass: inventory.viewportClass,
      capturedAt: inventory.capturedAt || inventory.generatedAt || null,
      visibleActionDefinitions: (inventory.baseActions || []).length
        + (inventory.popups || []).reduce((count, popup) => count + (popup.actions || []).length, 0)
    }))
  },
  confirmedFailures: [],
  resolvedFindings: [],
  blockedCandidates: []
};

fs.mkdirSync(resultsRoot, { recursive: true });
atomicWriteJson(path.join(auditRoot, "action-ledger.json"), ledger);
atomicWriteJson(payloadMatrixPath, payloadMatrix);
atomicWriteJson(path.join(resultsRoot, "raw-results.json"), rawResults);
atomicWriteText(path.join(resultsRoot, "failures.csv"), [
  "action_id,route,role,locator,source_component,crud_operation,payload_case,request_evidence,response_evidence,database_evidence,reproduction_steps,severity"
].join("\n"));

const unavailableRoles = Object.entries(roleStates.roles || {}).filter(([, value]) => !value.available).map(([role]) => role);
atomicWriteText(path.join(resultsRoot, "summary.md"), [
  "# iVisit Console Runtime CRUD And Interaction Audit",
  "",
  `Generated: ${generatedAt}`,
  `Run: ${runManifest.runId}`,
  "",
  "## Discovery Status",
  "",
  `- Static action candidates: ${staticInventory.total}`,
  `- Runtime-visible action definitions: ${runtimeActions.length}`,
  `- Runtime surfaces captured: ${runtimeInventories.length}`,
  "- Confirmed failures are added by the final source/runtime evidence synthesis.",
  `- Role states unavailable: ${unavailableRoles.join(", ") || "none"}`,
  "",
  "Exact defect totals remain pending until every domain lane and cleanup verification completes. Success toasts are not counted as mutation proof."
].join("\n"));

const cleanupPath = path.join(auditRoot, "cleanup-ledger.json");
if (!fs.existsSync(cleanupPath)) {
  atomicWriteJson(cleanupPath, {
    schemaVersion: 2,
    generatedAt,
    runId: runManifest.runId,
    records: [],
    cleanupStatus: "not_required",
    cleanupApplicable: false,
    cleanupVerified: false,
    noSideEffectsVerified: false,
    note: "No mutation records have been created by the discovery harness."
  });
}

process.stdout.write(`Runtime action definitions: ${runtimeActions.length}\n`);
