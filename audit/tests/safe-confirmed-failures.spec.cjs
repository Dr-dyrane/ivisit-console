const fs = require("node:fs");
const path = require("node:path");
const { auditTest, expect, openClientRoute } = require("../support/audit-fixture.cjs");
const { countAuditRows } = require("../support/database-evidence.cjs");
const { resultsRoot } = require("../support/environment.cjs");

auditTest("health-news authoring is unavailable or its no-receiver gap is recorded", async ({ page, evidence }, testInfo) => {
  auditTest.skip(testInfo.project.metadata.auditRole !== "admin", "Authenticated admin proof only.");
  const title = "AUDIT_20260713T082300Z_F_HEALTH_NEWS_VALID";
  const directory = path.join(resultsRoot, "confirmed-failures");
  const resultPath = path.join(directory, "F-HEALTH-NEWS-CREATE-NO-RECEIVER.json");
  const screenshotPath = path.join(directory, "F-HEALTH-NEWS-CREATE-NO-RECEIVER.png");
  fs.mkdirSync(directory, { recursive: true });
  for (const generatedPath of [resultPath, screenshotPath]) {
    if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
  }

  await page.route(/\/rest\/v1\/health_news|\/rpc\/.*health/i, async (route) => {
    const method = route.request().method().toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  await openClientRoute(page, "/health-news");
  const createButton = page.getByRole("button", { name: "New article" });
  if (await createButton.count() === 0) return;
  if (!await createButton.isEnabled()) {
    await expect(createButton).toBeDisabled();
    return;
  }

  const beforeCount = await countAuditRows("health_news", "title", title);
  await createButton.click();
  await expect(page.getByRole("heading", { name: "Create News" })).toBeVisible();
  await page.getByLabel("Title").fill(title);
  const healthNewsMutations = () => evidence.filter((event) => (
    event.kind === "backend_request"
    && /\/rest\/v1\/health_news|\/rpc\/.*health/i.test(event.url)
  )).length;
  const backendBefore = healthNewsMutations();
  await page.getByRole("button", { name: "Create Article" }).click();
  await expect(page.getByRole("heading", { name: "Create News" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Article" })).toBeEnabled();

  const backendAfter = healthNewsMutations();
  const afterCount = await countAuditRows("health_news", "title", title);
  expect(afterCount).toBe(beforeCount);
  expect(backendAfter, "The known no-receiver failure changed; any discovered mutation was browser-blocked.").toBe(backendBefore);

  fs.writeFileSync(resultPath, JSON.stringify({
    actionId: "modal.health-news.article.create.submit",
    route: "/health-news",
    role: "admin",
    locator: "getByRole('button', { name: 'Create Article' })",
    sourceComponent: "frontend/src/components/modals/HealthNewsModal.jsx",
    crudOperation: "create",
    payloadCase: "minimum_valid",
    requestEvidence: { backendMutationRequestsBefore: backendBefore, backendMutationRequestsAfter: backendAfter },
    responseEvidence: { modalRemainedOpen: true, submitReturnedToEnabled: true },
    databaseEvidence: { table: "health_news", exactAuditTitleCountBefore: beforeCount, exactAuditTitleCountAfter: afterCount },
    reproductionSteps: [
      "Sign in as admin and open /health-news.",
      "Choose New article.",
      "Enter a valid AUDIT_-prefixed required title.",
      "Choose Create Article and observe that no backend mutation request is sent."
    ],
    failureClasses: ["send_no_backend_request", "fail_valid_payload"],
    severity: "high",
    capturedAt: new Date().toISOString()
  }, null, 2));
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach("confirmed-failure", { path: resultPath, contentType: "application/json" });
  await testInfo.attach("confirmed-failure-screenshot", { path: screenshotPath, contentType: "image/png" });
});
