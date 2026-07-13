const fs = require("node:fs");
const path = require("node:path");
const { auditTest, expect, openClientRoute } = require("../support/audit-fixture.cjs");
const { resultsRoot } = require("../support/environment.cjs");
const { scrubText } = require("../support/redaction.cjs");

auditTest("focused authenticated route smoke", async ({ page }, testInfo) => {
  auditTest.skip(testInfo.project.metadata.auditRole !== "admin", "Authenticated admin smoke only.");
  const route = process.env.AUDIT_ROUTE || "/emergencies";
  await openClientRoute(page, route);
  const bodyText = scrubText(await page.locator("body").innerText()).slice(0, 4000);
  const refreshOnly = await page.getByRole("button", { name: "Refresh" }).count() === 1
    && await page.locator("button:visible, a[href]:visible").count() <= 2;
  const evidencePath = path.join(resultsRoot, `focused-smoke-${testInfo.project.name}-${route.replace(/[^a-zA-Z0-9]+/g, "-") || "root"}.json`);
  fs.writeFileSync(evidencePath, JSON.stringify({
    capturedAt: new Date().toISOString(),
    route,
    observedPath: new URL(page.url()).pathname,
    refreshOnly,
    bodyText
  }, null, 2));
  await testInfo.attach("focused-route-state", { path: evidencePath, contentType: "application/json" });
  expect(refreshOnly, "Authenticated route must not collapse to the generic Refresh-only error state.").toBe(false);
});
