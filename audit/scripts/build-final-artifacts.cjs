const fs = require("node:fs");
const path = require("node:path");
const { auditRoot, resultsRoot } = require("../support/environment.cjs");
const {
  atomicWriteJson,
  atomicWriteText,
  fingerprintFiles,
  getRunManifest,
  readJson,
  walkFiles
} = require("../support/integrity.cjs");
const { sanitizeRuntimeAction, scrubValue } = require("../support/redaction.cjs");

function countBy(values) {
  return values.reduce((counts, value) => ({
    ...counts,
    [value]: (counts[value] || 0) + 1
  }), {});
}

function csvCell(value) {
  const text = Array.isArray(value)
    ? value.join(" | ")
    : typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value ?? "");
  return `"${text.replaceAll('"', '""').replace(/[\r\n]+/g, " ")}"`;
}

function findingId(finding) {
  return finding.failureId || finding.id || [
    finding.actionId,
    finding.payloadCase,
    (finding.failureClasses || []).join("+")
  ].join("|");
}

function matchesPayloadCase(finding, caseId) {
  return finding?.payloadCase === caseId
    || (finding?.additionalPayloadCases || []).includes(caseId);
}

function evidenceByAction(active, blocked, resolved) {
  const groups = new Map();
  const add = (finding, state, evidenceStatus) => {
    const actionId = finding.actionId || "unknown";
    const key = `${state}|${actionId}`;
    const current = groups.get(key) || {
      actionId,
      state,
      evidenceStatuses: new Set(),
      findingIds: []
    };
    current.evidenceStatuses.add(evidenceStatus);
    current.findingIds.push(findingId(finding));
    groups.set(key, current);
  };

  active.forEach((finding) => add(
    finding,
    "active",
    finding.evidenceStatus || "source_confirmed"
  ));
  blocked.forEach((finding) => add(finding, "blocked", "runtime_blocked"));
  resolved.forEach((finding) => add(finding, "resolved", "resolved"));

  return [...groups.values()]
    .map((entry) => ({
      ...entry,
      evidenceStatuses: [...entry.evidenceStatuses].sort(),
      findingIds: [...new Set(entry.findingIds)].sort()
    }))
    .sort((left, right) => (
      left.state.localeCompare(right.state) || left.actionId.localeCompare(right.actionId)
    ));
}

const runManifest = getRunManifest(resultsRoot);
if (!runManifest?.runId) {
  throw new Error("Audit run manifest is missing. Run npm run report:begin first.");
}

const sourceModule = path.join(resultsRoot, "source-findings.cjs");
const sourceData = fs.existsSync(sourceModule)
  ? require(sourceModule)
  : readJson(path.join(resultsRoot, "source-findings.json"), {
    failures: [],
    resolvedFindings: [],
    blockedCandidates: []
  });
const confirmedFiles = walkFiles(path.join(resultsRoot, "confirmed-failures"))
  .filter((file) => file.endsWith(".json"));
const runtimeConfirmed = confirmedFiles.map((file) => {
  const result = scrubValue(readJson(file, {}));
  return {
    ...result,
    failureClasses: (result.failureClasses || []).map((name) => (
      name === "fail_for_valid_payload" ? "fail_valid_payload" : name
    )),
    evidenceStatus: "runtime_confirmed"
  };
});

const keyed = new Map();
for (const finding of sourceData.failures || []) {
  const key = findingId(finding);
  keyed.set(key, { ...finding, failureId: key });
}
for (const runtimeFinding of runtimeConfirmed) {
  const key = findingId(runtimeFinding);
  const sourceFinding = keyed.get(key);
  keyed.set(key, {
    ...(sourceFinding || {}),
    ...runtimeFinding,
    failureId: key,
    evidenceStatus: "runtime_confirmed",
    sourceConfirmation: sourceFinding ? {
      requestEvidence: sourceFinding.requestEvidence,
      responseEvidence: sourceFinding.responseEvidence,
      databaseEvidence: sourceFinding.databaseEvidence,
      reproductionSteps: sourceFinding.reproductionSteps,
      severity: sourceFinding.severity
    } : null
  });
}

const failures = [...keyed.values()].sort((left, right) => (
  left.failureId.localeCompare(right.failureId)
));
const blockedCandidates = sourceData.blockedCandidates || [];
const resolvedFindings = sourceData.resolvedFindings || [];
const priorLedger = readJson(path.join(auditRoot, "action-ledger.json"), {});
const roleStates = readJson(path.join(resultsRoot, "role-state-availability.json"), { roles: {} });
const prScope = readJson(path.join(resultsRoot, "pr-scope.json"), null);
const cleanup = readJson(path.join(auditRoot, "cleanup-ledger.json"), {});

if (!prScope || prScope.runId !== runManifest.runId) {
  throw new Error("PR scope is missing or belongs to a different audit run.");
}
if (!prScope.runIntegrity?.productUnchangedDuringAudit
  || !prScope.runIntegrity?.harnessUnchangedDuringAudit) {
  throw new Error("Audit inputs changed during the run; final artifacts were not published.");
}
if (cleanup.runId !== runManifest.runId) {
  throw new Error("Cleanup evidence is missing or belongs to a different audit run.");
}
if (cleanup.cleanupStatus === "failed") {
  throw new Error("Cleanup evidence failed and final artifacts cannot be published.");
}

const runtimeFiles = walkFiles(path.join(resultsRoot, "runtime-inventory"))
  .filter((file) => file.endsWith(".json"));
const inputFiles = [
  sourceModule,
  path.join(resultsRoot, "static-actions.json"),
  path.join(resultsRoot, "role-state-availability.json"),
  path.join(resultsRoot, "pr-scope.json"),
  path.join(auditRoot, "cleanup-ledger.json"),
  ...runtimeFiles,
  ...confirmedFiles
];
const inputProvenance = fingerprintFiles(inputFiles, auditRoot);
const generatedAt = new Date().toISOString();
const safeRuntimeActions = (priorLedger.runtimeVisibleActions || []).map((action, index) => (
  sanitizeRuntimeAction(action, action.route || action.requestedRoute || "/", index)
));
const uniqueActions = [...new Set(failures.map((finding) => finding.actionId))].sort();
const failureClassOrder = [
  "do_nothing", "wrong_destination", "browser_error", "send_no_backend_request",
  "incorrect_crud_payload", "fail_valid_payload", "accept_invalid_payload",
  "mutate_wrong_row_fields", "stale_ui", "conditional_failure"
];
const observedClassCounts = countBy(failures.flatMap((finding) => finding.failureClasses || []));
const classCounts = Object.fromEntries(failureClassOrder.map((name) => [name, observedClassCounts[name] || 0]));
for (const [name, count] of Object.entries(observedClassCounts)) {
  if (!(name in classCounts)) classCounts[name] = count;
}
const severityCounts = countBy(failures.map((finding) => finding.severity));
const evidenceCounts = countBy(failures.map((finding) => (
  finding.evidenceStatus || "source_confirmed"
)));

const counts = {
  staticCandidates: Number(priorLedger.counts?.staticCandidates || 0),
  runtimeVisibleDefinitions: safeRuntimeActions.length,
  runtimeSurfaces: Number(priorLedger.counts?.runtimeSurfaces || 0),
  confirmedFailureCases: failures.length,
  confirmedAffectedActions: uniqueActions.length,
  mountedUiFailureCases: failures.filter((finding) => finding.surfaceType !== "receiver_only").length,
  mountedUiAffectedActions: new Set(failures.filter((finding) => finding.surfaceType !== "receiver_only").map((finding) => finding.actionId)).size,
  receiverOnlyFailureCases: failures.filter((finding) => finding.surfaceType === "receiver_only").length,
  receiverOnlyAffectedReceivers: new Set(failures.filter((finding) => finding.surfaceType === "receiver_only").map((finding) => finding.actionId)).size,
  resolvedFindingCases: resolvedFindings.length,
  blockedRuntimeCandidates: blockedCandidates.length,
  failureClassesNonExclusive: classCounts,
  severities: severityCounts,
  evidenceStatus: evidenceCounts
};

const sharedEvidence = {
  runId: runManifest.runId,
  generatedAt,
  inputProvenance,
  sourceSnapshots: sourceData.sourceSnapshots || []
};
const actionLedger = {
  ...priorLedger,
  schemaVersion: 2,
  ...sharedEvidence,
  discoveryOnly: true,
  provisional: false,
  counts,
  prScope,
  roleStateAvailability: roleStates.roles,
  staticCandidates: scrubValue(priorLedger.staticCandidates || []),
  runtimeVisibleActions: safeRuntimeActions,
  confirmedFailures: failures,
  resolvedFindings,
  blockedCandidates
};

const caseIds = [
  "minimum_valid", "full_valid", "missing_required", "null", "empty", "duplicate",
  "invalid_enum", "invalid_uuid", "boundary_number", "unicode", "double_submit",
  "stale_row", "unauthorized_role", "network_failure", "retry", "concurrency",
  "partial_response"
];
const payloadMatrix = {
  schemaVersion: 2,
  ...sharedEvidence,
  cases: caseIds.map((caseId) => {
    const active = failures.filter((finding) => matchesPayloadCase(finding, caseId));
    const blocked = blockedCandidates.filter((finding) => matchesPayloadCase(finding, caseId));
    const resolved = resolvedFindings.filter((finding) => matchesPayloadCase(finding, caseId));
    const activeStatuses = [...new Set(active.map((finding) => (
      finding.evidenceStatus || "source_confirmed"
    )))];
    const status = activeStatuses.length > 1
      ? "mixed_confirmed"
      : activeStatuses.length === 1
        ? activeStatuses[0]
        : blocked.length
          ? "runtime_blocked"
          : resolved.length
            ? "resolved"
            : "not_executed";
    return {
      caseId,
      status,
      evidenceByAction: evidenceByAction(active, blocked, resolved),
      actionIds: [...new Set(active.map((finding) => finding.actionId))].sort(),
      blockedActionIds: [...new Set(blocked.map((finding) => finding.actionId))].sort(),
      resolvedActionIds: [...new Set(resolved.map((finding) => finding.actionId))].sort()
    };
  })
};

const rawResults = {
  schemaVersion: 2,
  ...sharedEvidence,
  target: {
    repository: "Dr-dyrane/ivisit-console",
    refPattern: "ivisit-console-revamp-*",
    frontendRoot: "frontend/",
    workingTreeWasDirtyDuringAudit: !prScope.worktree.clean,
    productWorktreeUnchangedDuringAudit: prScope.runIntegrity.productUnchangedDuringAudit,
    auditHarnessUnchangedDuringAudit: prScope.runIntegrity.harnessUnchangedDuringAudit
  },
  counts,
  prScope,
  roleStateAvailability: roleStates.roles,
  cleanup,
  confirmedFailures: failures,
  resolvedFindings,
  blockedCandidates,
  runtimeInventory: {
    surfaces: counts.runtimeSurfaces,
    visibleDefinitions: counts.runtimeVisibleDefinitions,
    staticCandidates: counts.staticCandidates
  }
};

const csvHeaders = [
  "action_id", "route", "role", "locator", "source_component", "crud_operation",
  "payload_case", "request_evidence", "response_evidence", "database_evidence",
  "reproduction_steps", "severity"
];
const csvRows = failures.map((finding) => [
  finding.actionId,
  finding.route,
  finding.role,
  finding.locator,
  finding.sourceComponent,
  finding.crudOperation,
  finding.payloadCase,
  finding.requestEvidence,
  finding.responseEvidence,
  finding.databaseEvidence,
  finding.reproductionSteps,
  finding.severity
].map(csvCell).join(","));

const cleanupSummary = cleanup.cleanupStatus === "not_required"
  ? "not applicable because no mutation probe executed"
  : cleanup.cleanupVerified
    ? "verified only for the captured request and tagged-row deltas"
    : "not verified";
const roleLines = Object.entries(roleStates.roles || {}).map(([role, state]) => (
  `- ${role}: ${state.available ? "available" : `blocked - ${state.reason}`}`
));
const classLines = Object.entries(classCounts).sort().map(([name, count]) => `- ${name}: ${count}`);
const summary = [
  "# iVisit Console Runtime CRUD And Interaction Audit",
  "",
  `Generated: ${generatedAt}`,
  `Run: ${runManifest.runId}`,
  `Input fingerprint: ${inputProvenance.sha256}`,
  "",
  "## Exact totals",
  "",
  `- Confirmed affected action definitions: **${uniqueActions.length}**`,
  `- Confirmed failure cases: **${failures.length}**`,
  `- Mounted UI failure cases: **${counts.mountedUiFailureCases}** across **${counts.mountedUiAffectedActions}** mounted action definitions`,
  `- Receiver-only failure cases: **${counts.receiverOnlyFailureCases}** across **${counts.receiverOnlyAffectedReceivers}** backend receivers`,
  `- Findings resolved by the current worktree: **${resolvedFindings.length}**`,
  `- Runtime-blocked candidates retained separately: **${blockedCandidates.length}**`,
  `- Static JSX candidates (upper bound, not visible total): **${counts.staticCandidates}**`,
  `- Runtime-visible semantic definitions captured: **${counts.runtimeVisibleDefinitions}** across **${counts.runtimeSurfaces}** role/viewport/route surfaces`,
  "",
  "## PR scope",
  "",
  `- Local base/head: \`${prScope.baseRef}\` -> \`${prScope.branch}\``,
  `- Commits ahead/behind: ${prScope.commits.ahead}/${prScope.commits.behind}`,
  `- Committed diff: ${prScope.committedDiff.namedFiles} files, ${prScope.committedDiff.insertions} insertions, ${prScope.committedDiff.deletions} deletions`,
  `- Worktree: ${prScope.worktree.trackedChangedFiles} tracked files changed and ${prScope.worktree.untrackedFiles} untracked files`,
  `- Product worktree unchanged during audit: ${prScope.runIntegrity.productUnchangedDuringAudit}`,
  `- Audit harness unchanged during audit: ${prScope.runIntegrity.harnessUnchangedDuringAudit}`,
  `- Audit files already tracked at capture: ${prScope.auditTreeTrackedFiles}`,
  `- ${prScope.note}`,
  "",
  "Failure-class totals are non-exclusive because one action can fail in more than one way:",
  "",
  ...classLines,
  "",
  "## Evidence boundary",
  "",
  `- Runtime-confirmed cases: ${evidenceCounts.runtime_confirmed || 0}`,
  `- Source/receiver-confirmed cases: ${evidenceCounts.source_confirmed || 0}`,
  "- No success toast was accepted as mutation proof.",
  "- Live mutation was not performed where real patient or financial data, trigger side effects, or cleanup uncertainty made it unsafe.",
  `- Cleanup verification: ${cleanupSummary}.`,
  "- Auth, Storage, Edge, email, and payment side effects are not claimed as verified unless explicitly named by evidence.",
  "",
  "## Role storage states",
  "",
  ...roleLines,
  "",
  "## Artifacts",
  "",
  "- `audit/action-ledger.json` - sanitized inventory plus active, resolved, and blocked findings.",
  "- `audit/payload-matrix.json` - per-action payload-case evidence without provenance promotion.",
  "- `audit/results/raw-results.json` - structured synthesis and input provenance.",
  "- `audit/results/failures.csv` - one row per active confirmed failure case.",
  "- `audit/cleanup-ledger.json` - cleanup applicability and bounded side-effect evidence."
].join("\n");

atomicWriteJson(path.join(auditRoot, "action-ledger.json"), actionLedger);
atomicWriteJson(path.join(auditRoot, "payload-matrix.json"), payloadMatrix);
atomicWriteJson(path.join(resultsRoot, "raw-results.json"), rawResults);
atomicWriteText(path.join(resultsRoot, "failures.csv"), [csvHeaders.join(","), ...csvRows].join("\n"));
atomicWriteText(path.join(resultsRoot, "summary.md"), summary);

process.stdout.write(`Confirmed actions=${uniqueActions.length}; failure cases=${failures.length}; blocked candidates=${blockedCandidates.length}.\n`);
