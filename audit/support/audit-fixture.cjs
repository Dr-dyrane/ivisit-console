const fs = require("node:fs");
const { test: base, expect } = require("@playwright/test");
const { scrubText, safePostData, safeRequestUrl } = require("./redaction.cjs");

const auditTest = base.extend({
  evidence: [async ({ page }, use, testInfo) => {
    const events = [];
    const push = (kind, evidence) => events.push({
      at: new Date().toISOString(),
      kind,
      ...evidence
    });

    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        push("console", { level: message.type(), text: scrubText(message.text()).slice(0, 4000) });
      }
    });
    page.on("pageerror", (error) => push("pageerror", {
      name: error.name,
      message: scrubText(error.message).slice(0, 4000),
      stack: scrubText(error.stack || "").slice(0, 8000)
    }));
    page.on("requestfailed", (request) => push("requestfailed", {
      method: request.method(),
      url: safeRequestUrl(request.url()),
      failure: scrubText(request.failure()?.errorText || "unknown")
    }));
    page.on("response", (response) => {
      if (response.status() >= 400) {
        push("http_error", {
          method: response.request().method(),
          status: response.status(),
          statusText: scrubText(response.statusText()),
          url: safeRequestUrl(response.url())
        });
      }
    });
    page.on("request", (request) => {
      const method = request.method().toUpperCase();
      const url = request.url();
      const isBackend = /supabase\.(co|in)|\/rest\/v1\/|\/rpc\/|\/functions\/v1\/|\/auth\/v1\//i.test(url);
      if (isBackend && !["GET", "HEAD", "OPTIONS"].includes(method)) {
        push("backend_request", {
          method,
          url: safeRequestUrl(url),
          resourceType: request.resourceType(),
          payload: safePostData(request)
        });
      }
    });

    await use(events);

    const outputPath = testInfo.outputPath("telemetry.json");
    fs.writeFileSync(outputPath, JSON.stringify({
      testId: testInfo.testId,
      title: testInfo.title,
      project: testInfo.project.name,
      role: testInfo.project.metadata.auditRole,
      status: testInfo.status,
      events
    }, null, 2));
    await testInfo.attach("audit-telemetry", { path: outputPath, contentType: "application/json" });
  }, { auto: true }]
});

async function openClientRoute(page, route) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  if (new URL(page.url()).searchParams.has("__asset_refresh")) {
    await page.waitForTimeout(1_000);
    await page.goto(route, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2_000);
}

module.exports = { auditTest, expect, openClientRoute };
