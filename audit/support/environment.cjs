const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const repositoryRoot = path.resolve(__dirname, "..", "..");
const frontendRoot = path.join(repositoryRoot, "frontend");

for (const filename of [".env", ".env.local"]) {
  const envPath = path.join(frontendRoot, filename);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true, quiet: true });
  }
}

module.exports = {
  repositoryRoot,
  frontendRoot,
  auditRoot: path.join(repositoryRoot, "audit"),
  resultsRoot: path.join(repositoryRoot, "audit", "results"),
  baseURL: process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000"
};
