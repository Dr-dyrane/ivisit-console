const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const normalizePath = (value) => String(value || "").replaceAll("\\", "/");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function runGit(repositoryRoot, args, encoding = null) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function atomicWriteText(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, contents);
  try {
    fs.renameSync(temporary, file);
  } catch (error) {
    if (!fs.existsSync(file)) throw error;
    fs.rmSync(file, { force: true });
    fs.renameSync(temporary, file);
  }
}

function atomicWriteJson(file, value) {
  atomicWriteText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

function fingerprintFiles(files, root) {
  const hash = crypto.createHash("sha256");
  const inputs = [...new Set(files)]
    .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
    .sort((left, right) => normalizePath(path.relative(root, left)).localeCompare(normalizePath(path.relative(root, right))))
    .map((file) => {
      const contents = fs.readFileSync(file);
      const relativePath = normalizePath(path.relative(root, file));
      hash.update(relativePath);
      hash.update("\0");
      hash.update(contents);
      hash.update("\0");
      return {
        path: relativePath,
        bytes: contents.length,
        sha256: sha256(contents),
        modifiedAt: fs.statSync(file).mtime.toISOString()
      };
    });

  return {
    sha256: hash.digest("hex"),
    fileCount: inputs.length,
    files: inputs
  };
}

function getProductWorktreeSnapshot(repositoryRoot) {
  const trackedDiff = runGit(repositoryRoot, [
    "diff", "--binary", "HEAD", "--", ".", ":(exclude)audit/**"
  ]);
  const untracked = String(runGit(repositoryRoot, [
    "ls-files", "--others", "--exclude-standard"
  ], "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizePath)
    .filter((file) => !file.startsWith("audit/"))
    .sort();
  const hash = crypto.createHash("sha256");
  hash.update(trackedDiff);

  for (const relativePath of untracked) {
    hash.update(relativePath);
    hash.update("\0");
    const absolute = path.join(repositoryRoot, relativePath);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      hash.update(fs.readFileSync(absolute));
    }
    hash.update("\0");
  }

  const trackedChangedFiles = String(runGit(repositoryRoot, [
    "diff", "--name-only", "HEAD", "--", ".", ":(exclude)audit/**"
  ], "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .length;

  return {
    sha256: hash.digest("hex"),
    trackedChangedFiles,
    untrackedFiles: untracked.length
  };
}

function getAuditHarnessSnapshot(auditRoot) {
  const includedRoots = ["scripts", "support", "tests"];
  const files = includedRoots.flatMap((directory) => walkFiles(path.join(auditRoot, directory)));
  for (const relativePath of [
    "package.json",
    "package-lock.json",
    "playwright.config.cjs",
    "README.md",
    ".gitignore",
    "results/source-findings.cjs"
  ]) {
    const absolute = path.join(auditRoot, relativePath);
    if (fs.existsSync(absolute)) files.push(absolute);
  }
  return fingerprintFiles(files, auditRoot);
}

function getGitIdentity(repositoryRoot) {
  return {
    branch: String(runGit(repositoryRoot, ["branch", "--show-current"], "utf8")).trim(),
    head: String(runGit(repositoryRoot, ["rev-parse", "HEAD"], "utf8")).trim()
  };
}

function getRunManifest(resultsRoot) {
  return readJson(path.join(resultsRoot, "audit-run.json"), null);
}

module.exports = {
  atomicWriteJson,
  atomicWriteText,
  fingerprintFiles,
  getAuditHarnessSnapshot,
  getGitIdentity,
  getProductWorktreeSnapshot,
  getRunManifest,
  normalizePath,
  readJson,
  sha256,
  walkFiles
};
