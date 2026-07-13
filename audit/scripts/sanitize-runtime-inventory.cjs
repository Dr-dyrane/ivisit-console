const fs = require("node:fs");
const path = require("node:path");
const { resultsRoot } = require("../support/environment.cjs");
const { sanitizeRuntimeAction, scrubActionName } = require("../support/redaction.cjs");
const { atomicWriteJson } = require("../support/integrity.cjs");

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : absolute.endsWith(".json") ? [absolute] : [];
  });
}

function sanitizeActions(actions, route) {
  return (actions || []).map((action, index) => sanitizeRuntimeAction(action, route, index));
}

for (const file of walk(path.join(resultsRoot, "runtime-inventory"))) {
  const inventory = JSON.parse(fs.readFileSync(file, "utf8"));
  inventory.baseActions = sanitizeActions(inventory.baseActions, inventory.requestedRoute);
  inventory.popups = (inventory.popups || []).map((popup) => ({
    triggerName: scrubActionName(popup.triggerName, inventory.requestedRoute),
    actions: sanitizeActions(popup.actions, inventory.requestedRoute)
  }));
  atomicWriteJson(file, inventory);
}

process.stdout.write("Runtime inventory identifiers sanitized.\n");
