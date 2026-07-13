const path = require("node:path");
const { spawnSync } = require("node:child_process");

const auditRoot = path.resolve(__dirname, "..");
const playwrightCli = require.resolve("@playwright/test/cli");
const allRuns = [
  { project: "admin-desktop", stateTarget: "admin-desktop" },
  { project: "admin-mobile", stateTarget: "admin-mobile" },
  { project: "unauthenticated-desktop", stateTarget: "unauthenticated" }
];
const requestedProjects = new Set(process.argv.slice(2));
const runs = requestedProjects.size
  ? allRuns.filter((run) => requestedProjects.has(run.project))
  : allRuns;

if (runs.length === 0) {
  process.stderr.write(`No matching audit projects. Available projects: ${allRuns.map((run) => run.project).join(", ")}\n`);
  process.exitCode = 1;
  return;
}

let failed = false;
for (const run of runs) {
  process.stdout.write(`\n=== Runtime inventory: ${run.project} ===\n`);
  const result = spawnSync(process.execPath, [
    playwrightCli, "test", "tests/runtime-inventory.spec.cjs",
    `--project=${run.project}`,
    "--workers=1"
  ], {
    cwd: auditRoot,
    env: { ...process.env, AUDIT_STATE_TARGET: run.stateTarget },
    stdio: "inherit"
  });
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  if (result.status !== 0) failed = true;
}

process.exitCode = failed ? 1 : 0;
