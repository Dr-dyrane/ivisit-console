const path = require("node:path");
const { auditRoot, repositoryRoot, resultsRoot } = require("../support/environment.cjs");
const {
  atomicWriteJson,
  getAuditHarnessSnapshot,
  getGitIdentity,
  getProductWorktreeSnapshot
} = require("../support/integrity.cjs");

const startedAt = new Date().toISOString();
const git = getGitIdentity(repositoryRoot);
const runId = `audit-${startedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${git.head.slice(0, 8)}`;
const manifest = {
  schemaVersion: 1,
  runId,
  startedAt,
  mode: "read_only",
  git,
  productWorktreeStart: getProductWorktreeSnapshot(repositoryRoot),
  auditHarnessStart: getAuditHarnessSnapshot(auditRoot),
  note: "Git and database state are read-only. Generated audit evidence is excluded from the product-worktree fingerprint."
};

atomicWriteJson(path.join(resultsRoot, "audit-run.json"), manifest);
process.stdout.write(`Audit run ${runId} started from ${git.head.slice(0, 12)}.\n`);
