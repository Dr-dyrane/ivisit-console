const path = require("node:path");
const { frontendRoot } = require("./environment.cjs");
const { createClient } = require(path.join(frontendRoot, "node_modules", "@supabase", "supabase-js"));

const allowedTables = new Set([
  "health_news", "hospitals", "ambulances", "doctors", "organizations", "profiles",
  "support_tickets", "visits", "emergency_requests", "service_pricing", "room_pricing",
  "insurance_policies", "subscribers"
]);

function readClient() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Read-only database evidence client is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function countAuditRows(table, field, exactValue) {
  if (!allowedTables.has(table)) throw new Error(`Table ${table} is not allowed by the audit evidence helper.`);
  if (!String(exactValue || "").startsWith("AUDIT_")) throw new Error("Audit evidence reads require an AUDIT_ exact value.");
  const { count, error } = await readClient()
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(field, exactValue);
  if (error) throw error;
  return count || 0;
}

module.exports = { countAuditRows };
