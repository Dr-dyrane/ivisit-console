const fs = require("node:fs");
const path = require("node:path");
const { auditRoot, resultsRoot } = require("../support/environment.cjs");
const { atomicWriteJson, getRunManifest } = require("../support/integrity.cjs");

const evidenceRoot = path.join(resultsRoot, "confirmed-failures");
const evidenceFiles = fs.existsSync(evidenceRoot)
  ? fs.readdirSync(evidenceRoot).filter((name) => name.endsWith(".json"))
  : [];

const checks = evidenceFiles.map((name) => {
  const evidence = JSON.parse(fs.readFileSync(path.join(evidenceRoot, name), "utf8"));
  const request = evidence.requestEvidence || {};
  const database = evidence.databaseEvidence || {};
  const hasRequestPair = Object.prototype.hasOwnProperty.call(request, "backendMutationRequestsBefore")
    && Object.prototype.hasOwnProperty.call(request, "backendMutationRequestsAfter");
  const hasDatabasePair = Object.prototype.hasOwnProperty.call(database, "exactAuditTitleCountBefore")
    && Object.prototype.hasOwnProperty.call(database, "exactAuditTitleCountAfter");
  const requestBefore = Number(request.backendMutationRequestsBefore || 0);
  const requestAfter = Number(request.backendMutationRequestsAfter || 0);
  const databaseBefore = Number(database.exactAuditTitleCountBefore || 0);
  const databaseAfter = Number(database.exactAuditTitleCountAfter || 0);

  return {
    evidenceFile: `results/confirmed-failures/${name}`,
    actionId: evidence.actionId || null,
    requestMutationDelta: requestAfter - requestBefore,
    databaseRowDelta: databaseAfter - databaseBefore,
    evidenceCapturedAt: evidence.capturedAt || evidence.generatedAt || null,
    verified: hasRequestPair
      && hasDatabasePair
      && requestAfter === requestBefore
      && databaseAfter === databaseBefore
  };
});

const cleanupStatus = checks.length === 0
  ? "not_required"
  : checks.every((check) => check.verified)
    ? "verified"
    : "failed";
const cleanupApplicable = checks.length > 0;
const cleanupVerified = cleanupStatus === "verified";
const noSideEffectsVerified = cleanupStatus === "verified";
const generatedAt = new Date().toISOString();
const runManifest = getRunManifest(resultsRoot);
const cleanupLedger = {
  schemaVersion: 2,
  generatedAt,
  runId: runManifest?.runId || null,
  discoveryOnly: true,
  records: [],
  evidenceChecks: checks,
  cleanupStatus,
  cleanupApplicable,
  cleanupVerified,
  noSideEffectsVerified,
  verifiedScope: cleanupVerified
    ? ["captured browser mutation-request delta", "captured tagged database-row delta"]
    : [],
  unverifiedDomains: ["Auth users", "Storage objects", "Edge side effects", "email", "payments"],
  note: cleanupStatus === "verified"
    ? `Safe-failure evidence recorded zero captured browser mutation-request and tagged database-row deltas across ${checks.length} evidence file(s). This does not prove unobserved Auth, Storage, Edge, email, or payment side effects.`
    : cleanupStatus === "not_required"
      ? "The discovery and safe-failure passes executed no mutation probe, so no audit-created record required cleanup."
      : "At least one runtime evidence file recorded a backend mutation or database-row delta; cleanup is not verified."
};

atomicWriteJson(path.join(auditRoot, "cleanup-ledger.json"), cleanupLedger);
process.stdout.write(`Cleanup verification: ${cleanupStatus}; evidence files=${checks.length}.\n`);
if (!runManifest) {
  process.stderr.write("Audit run manifest is missing. Run npm run report:begin first.\n");
  process.exitCode = 1;
} else if (cleanupStatus === "failed") {
  process.exitCode = 1;
}
