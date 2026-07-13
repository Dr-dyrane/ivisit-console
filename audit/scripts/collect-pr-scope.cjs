const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { auditRoot, repositoryRoot, resultsRoot } = require("../support/environment.cjs");
const {
  atomicWriteJson,
  getAuditHarnessSnapshot,
  getProductWorktreeSnapshot,
  getRunManifest
} = require("../support/integrity.cjs");

const runGit = (args) => execFileSync("git", args, {
  cwd: repositoryRoot,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
}).trim();

const lines = (value) => String(value || "").split(/\r?\n/).filter(Boolean);
const unique = (values) => [...new Set(values)];
const parseShortStat = (value) => ({
  files: Number(value.match(/(\d+) files? changed/)?.[1] || 0),
  insertions: Number(value.match(/(\d+) insertions?\(\+\)/)?.[1] || 0),
  deletions: Number(value.match(/(\d+) deletions?\(-\)/)?.[1] || 0)
});

const baseRef = process.env.AUDIT_BASE_REF || "main";
const branch = runGit(["branch", "--show-current"]);
const head = runGit(["rev-parse", "HEAD"]);
const mergeBase = runGit(["merge-base", baseRef, "HEAD"]);
const [behind, ahead] = runGit(["rev-list", "--left-right", "--count", `${baseRef}...HEAD`])
  .split(/\s+/)
  .map(Number);
const committedFiles = lines(runGit(["diff", "--name-only", `${baseRef}...HEAD`]));
const trackedWorktreeFiles = unique([
  ...lines(runGit(["diff", "--name-only", "HEAD"])),
  ...lines(runGit(["diff", "--cached", "--name-only", "HEAD"]))
]);
const untrackedFiles = lines(runGit(["ls-files", "--others", "--exclude-standard"]));
const runManifest = getRunManifest(resultsRoot);
const productWorktreeEnd = getProductWorktreeSnapshot(repositoryRoot);
const auditHarnessEnd = getAuditHarnessSnapshot(auditRoot);
const productUnchangedDuringAudit = Boolean(
  runManifest?.productWorktreeStart?.sha256
  && runManifest.productWorktreeStart.sha256 === productWorktreeEnd.sha256
);
const harnessUnchangedDuringAudit = Boolean(
  runManifest?.auditHarnessStart?.sha256
  && runManifest.auditHarnessStart.sha256 === auditHarnessEnd.sha256
);

const payload = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  runId: runManifest?.runId || null,
  localRefSnapshot: true,
  baseRef,
  branch,
  head,
  mergeBase,
  commits: { ahead, behind },
  committedDiff: {
    ...parseShortStat(runGit(["diff", "--shortstat", `${baseRef}...HEAD`])),
    namedFiles: committedFiles.length
  },
  worktree: {
    trackedChangedFiles: trackedWorktreeFiles.length,
    untrackedFiles: untrackedFiles.length,
    clean: trackedWorktreeFiles.length === 0 && untrackedFiles.length === 0
  },
  runIntegrity: {
    productWorktreeStart: runManifest?.productWorktreeStart || null,
    productWorktreeEnd,
    productUnchangedDuringAudit,
    auditHarnessStart: runManifest?.auditHarnessStart || null,
    auditHarnessEnd,
    harnessUnchangedDuringAudit
  },
  auditTreeTrackedFiles: lines(runGit(["ls-files", "audit"])).length,
  note: "Local read-only Git snapshot. No fetch, checkout, staging, commit, push, or ref mutation was performed."
};

fs.mkdirSync(resultsRoot, { recursive: true });
atomicWriteJson(path.join(resultsRoot, "pr-scope.json"), payload);
process.stdout.write(`PR scope: ${ahead} commits ahead; ${payload.committedDiff.namedFiles} committed files; ${trackedWorktreeFiles.length} tracked worktree files; ${untrackedFiles.length} untracked files.\n`);
if (!runManifest) {
  process.stderr.write("Audit run manifest is missing. Run npm run report:begin first.\n");
  process.exitCode = 1;
} else if (!productUnchangedDuringAudit || !harnessUnchangedDuringAudit) {
  process.stderr.write("Audit inputs changed after the run began; discard this run and start again.\n");
  process.exitCode = 1;
}
