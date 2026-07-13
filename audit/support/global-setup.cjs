const fs = require("node:fs");
const path = require("node:path");
const { auditRoot, baseURL, frontendRoot, resultsRoot } = require("./environment.cjs");
const { scrubText } = require("./redaction.cjs");
const { createClient } = require(path.join(frontendRoot, "node_modules", "@supabase", "supabase-js"));

const blankState = { cookies: [], origins: [] };

async function globalSetup() {
  const authDir = path.join(auditRoot, ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  fs.mkdirSync(resultsRoot, { recursive: true });
  fs.writeFileSync(path.join(authDir, "unauthenticated.json"), JSON.stringify(blankState, null, 2));

  const availabilityPath = path.join(resultsRoot, "role-state-availability.json");
  const priorAvailability = (() => {
    try { return JSON.parse(fs.readFileSync(availabilityPath, "utf8")); } catch { return null; }
  })();
  const availability = {
    generatedAt: new Date().toISOString(),
    baseURL,
    roles: {
      unauthenticated: { available: true, storageState: ".auth/unauthenticated.json" },
      admin: priorAvailability?.roles?.admin || { available: false, storageStates: [".auth/admin-desktop.json", ".auth/admin-mobile.json"], reason: null },
      org_admin: { available: false, reason: "No approved proof credentials; Auth user creation is forbidden." },
      provider: { available: false, reason: "No approved proof credentials; Auth user creation is forbidden." },
      sponsor: { available: false, reason: "No approved proof credentials; Auth user creation is forbidden." },
      viewer: { available: false, reason: "No approved proof credentials; Auth user creation is forbidden." }
    }
  };
  const stateTarget = process.env.AUDIT_STATE_TARGET || "admin-desktop";
  if (stateTarget === "unauthenticated") {
    fs.writeFileSync(availabilityPath, JSON.stringify(availability, null, 2));
    return;
  }

  const email = process.env.IVISIT_TEST_ADMIN_EMAIL;
  const password = process.env.IVISIT_TEST_ADMIN_PASSWORD;
  if (!email || !password) {
    availability.roles.admin.reason = "IVISIT_TEST_ADMIN_EMAIL or IVISIT_TEST_ADMIN_PASSWORD is unavailable.";
    fs.writeFileSync(path.join(authDir, "admin-desktop.json"), JSON.stringify(blankState, null, 2));
    fs.writeFileSync(path.join(authDir, "admin-mobile.json"), JSON.stringify(blankState, null, 2));
    fs.writeFileSync(path.join(resultsRoot, "role-state-availability.json"), JSON.stringify(availability, null, 2));
    return;
  }

  const authFailures = [];
  for (const stateName of [stateTarget]) {
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) throw new Error("Supabase URL or anon key is unavailable.");
      const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data?.session || !data?.user) throw new Error("Credential sign-in did not return a session.");
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError || profile?.role !== "admin") throw new Error("Proof account did not resolve to the admin role.");

      const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
      const storageState = {
        cookies: [],
        origins: [{
          origin: new URL(baseURL).origin,
          localStorage: [{
            name: `sb-${projectRef}-auth-token`,
            value: JSON.stringify(data.session)
          }]
        }]
      };
      fs.writeFileSync(path.join(authDir, `${stateName}.json`), JSON.stringify(storageState, null, 2));
    } catch (error) {
      authFailures.push(scrubText(`${stateName} failed: ${error.name || "Error"}; ${error.message || "authentication error"}`));
      fs.writeFileSync(path.join(authDir, `${stateName}.json`), JSON.stringify(blankState, null, 2));
    }
  }
  availability.roles.admin.available = authFailures.length === 0;
  availability.roles.admin.reason = authFailures.length ? `Admin storage-state setup failed: ${authFailures.join(" | ")}` : null;

  fs.writeFileSync(availabilityPath, JSON.stringify(availability, null, 2));
}

module.exports = globalSetup;
