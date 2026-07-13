const fs = require("node:fs");
const path = require("node:path");
const { auditRoot, repositoryRoot, resultsRoot } = require("../support/environment.cjs");
const {
  getAuditHarnessSnapshot,
  getProductWorktreeSnapshot,
  readJson,
  sha256
} = require("../support/integrity.cjs");
const { sanitizeRuntimeAction } = require("../support/redaction.cjs");

const artifactPaths = {
  actionLedger: path.join(auditRoot, "action-ledger.json"),
  payloadMatrix: path.join(auditRoot, "payload-matrix.json"),
  rawResults: path.join(resultsRoot, "raw-results.json"),
  summary: path.join(resultsRoot, "summary.md"),
  failuresCsv: path.join(resultsRoot, "failures.csv"),
  cleanupLedger: path.join(auditRoot, "cleanup-ledger.json")
};

const fail = (message) => {
  throw new Error(`Final artifact integrity failed: ${message}`);
};

for (const [name, file] of Object.entries(artifactPaths)) {
  if (!fs.existsSync(file)) fail(`${name} is missing`);
}

const actionLedger = readJson(artifactPaths.actionLedger);
const payloadMatrix = readJson(artifactPaths.payloadMatrix);
const rawResults = readJson(artifactPaths.rawResults);
const cleanupLedger = readJson(artifactPaths.cleanupLedger);
const summary = fs.readFileSync(artifactPaths.summary, "utf8");
const failuresCsv = fs.readFileSync(artifactPaths.failuresCsv, "utf8");
for (const [name, value] of Object.entries({ actionLedger, payloadMatrix, rawResults, cleanupLedger })) {
  if (!value) fail(`${name} is not valid JSON`);
}

const runIds = new Set([
  actionLedger.runId,
  payloadMatrix.runId,
  rawResults.runId,
  cleanupLedger.runId
]);
if (runIds.size !== 1 || runIds.has(null) || runIds.has(undefined)) {
  fail("JSON artifacts do not share one non-empty runId");
}
const [runId] = runIds;
if (!summary.includes(`Run: ${runId}`)) fail("summary does not identify the shared runId");

const active = actionLedger.confirmedFailures || [];
const resolved = actionLedger.resolvedFindings || [];
const blocked = actionLedger.blockedCandidates || [];
if (actionLedger.counts?.confirmedFailureCases !== active.length) fail("active finding count contradicts its array");
if (actionLedger.counts?.resolvedFindingCases !== resolved.length) fail("resolved finding count contradicts its array");
if (actionLedger.counts?.blockedRuntimeCandidates !== blocked.length) fail("blocked finding count contradicts its array");
if (rawResults.counts?.confirmedFailureCases !== active.length) fail("raw-results active count differs from action ledger");
if ((rawResults.confirmedFailures || []).length !== active.length) fail("raw-results active array differs from action ledger");
if ((rawResults.resolvedFindings || []).length !== resolved.length) fail("raw-results resolved array differs from action ledger");
if ((rawResults.blockedCandidates || []).length !== blocked.length) fail("raw-results blocked array differs from action ledger");

const idOf = (finding) => finding.failureId || finding.id;
const stateIds = {
  active: new Set(active.map(idOf)),
  resolved: new Set(resolved.map(idOf)),
  blocked: new Set(blocked.map(idOf))
};
for (const id of stateIds.active) {
  if (stateIds.resolved.has(id) || stateIds.blocked.has(id)) fail(`${id} appears in more than one finding state`);
}
for (const id of stateIds.resolved) {
  if (stateIds.blocked.has(id)) fail(`${id} appears in both resolved and blocked states`);
}

const csvLineCount = failuresCsv.trim() ? failuresCsv.trim().split(/\r?\n/).length : 0;
if (csvLineCount !== active.length + 1) fail("failures.csv row count does not match active findings");

for (const payloadCase of payloadMatrix.cases || []) {
  const activeEvidence = (payloadCase.evidenceByAction || []).filter((entry) => entry.state === "active");
  const activeStatuses = [...new Set(activeEvidence.flatMap((entry) => entry.evidenceStatuses || []))];
  if (activeStatuses.length > 1 && payloadCase.status !== "mixed_confirmed") {
    fail(`${payloadCase.caseId} promotes mixed evidence into one status`);
  }
  if (activeStatuses.length === 0 && payloadCase.actionIds?.length) {
    fail(`${payloadCase.caseId} has active actions without per-action evidence`);
  }
}

if (cleanupLedger.cleanupStatus === "not_required") {
  if (cleanupLedger.cleanupApplicable || cleanupLedger.cleanupVerified || cleanupLedger.noSideEffectsVerified) {
    fail("not-required cleanup is presented as verified");
  }
} else if (cleanupLedger.cleanupStatus === "verified") {
  if (!cleanupLedger.cleanupApplicable || !cleanupLedger.cleanupVerified || !cleanupLedger.noSideEffectsVerified) {
    fail("verified cleanup is missing applicable bounded evidence");
  }
} else {
  fail(`cleanup status is not publishable: ${cleanupLedger.cleanupStatus}`);
}

const provenanceHashes = new Set([
  actionLedger.inputProvenance?.sha256,
  payloadMatrix.inputProvenance?.sha256,
  rawResults.inputProvenance?.sha256
]);
if (provenanceHashes.size !== 1 || provenanceHashes.has(undefined)) {
  fail("final JSON artifacts do not share one input fingerprint");
}
for (const input of actionLedger.inputProvenance?.files || []) {
  const absolute = path.join(auditRoot, input.path);
  if (!fs.existsSync(absolute)) fail(`provenance input is missing: ${input.path}`);
  if (sha256(fs.readFileSync(absolute)) !== input.sha256) {
    fail(`provenance input changed after synthesis: ${input.path}`);
  }
}

const prScope = actionLedger.prScope;
if (!prScope?.runIntegrity?.productUnchangedDuringAudit
  || !prScope?.runIntegrity?.harnessUnchangedDuringAudit) {
  fail("PR scope does not prove stable audit inputs");
}
if (getProductWorktreeSnapshot(repositoryRoot).sha256 !== prScope.runIntegrity.productWorktreeEnd.sha256) {
  fail("product worktree changed after the PR-scope snapshot");
}
if (getAuditHarnessSnapshot(auditRoot).sha256 !== prScope.runIntegrity.auditHarnessEnd.sha256) {
  fail("audit harness changed after the PR-scope snapshot");
}

const piiPatterns = [
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["telephone URI", /\btel:\s*\+?[\d(). -]{7,}\d/i],
  ["mail URI", /\bmailto:/i],
  ["international phone", /\+\d{8,15}\b/],
  ["bearer token", /Bearer\s+(?!\[REDACTED\])[A-Za-z0-9._~-]+/i],
  ["JWT", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["UUID", /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i],
  ["Supabase secret", /\b(?:sbp_|sb_secret_)[A-Za-z0-9_-]{12,}\b/]
];
for (const [name, file] of Object.entries(artifactPaths)) {
  const contents = fs.readFileSync(file, "utf8");
  for (const [kind, pattern] of piiPatterns) {
    if (pattern.test(contents)) fail(`${name} contains an unredacted ${kind}`);
  }
}

for (const [index, action] of (actionLedger.runtimeVisibleActions || []).entries()) {
  const sanitized = sanitizeRuntimeAction(action, action.route || action.requestedRoute || "/", index);
  if (JSON.stringify(sanitized) !== JSON.stringify(action)) {
    fail(`runtime action ${index} is not idempotently sanitized`);
  }
}

process.stdout.write(`Final artifacts validated for run ${runId}: active=${active.length}, resolved=${resolved.length}, blocked=${blocked.length}.\n`);
