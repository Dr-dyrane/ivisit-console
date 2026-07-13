const fs = require("node:fs");
const path = require("node:path");
const { auditTest, expect, openClientRoute } = require("../support/audit-fixture.cjs");
const { visibleActions, slug } = require("../support/action-inventory.cjs");
const { resultsRoot } = require("../support/environment.cjs");

const authenticatedRoutes = [
  "/", "/map", "/analytics", "/hospitals", "/ambulances", "/doctors", "/visits",
  "/emergencies", "/verification", "/users", "/organizations", "/settings", "/health-news",
  "/support-tickets", "/insurance", "/subscriptions", "/wallet", "/pricing"
];
const publicRoutes = ["/login", "/set-password", "/onboarding", "/onboarding-success", "/unauthorized", "/audit-not-found"];

function writeInventory(projectName, route, payload) {
  const directory = path.join(resultsRoot, "runtime-inventory", projectName);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `${slug(route)}.json`), JSON.stringify(payload, null, 2));
}

auditTest.describe("visible runtime action inventory", () => {
  auditTest.setTimeout(300_000);
  auditTest("inventory mounted routes", async ({ page }, testInfo) => {
    const role = testInfo.project.metadata.auditRole;
    const viewportClass = testInfo.project.metadata.viewportClass;
    const routes = role === "admin" ? authenticatedRoutes : publicRoutes;
    for (const route of routes) {
      await openClientRoute(page, route);
      const observedPath = new URL(page.url()).pathname;
      const observedRoute = observedPath.length > 1 && observedPath.endsWith("/") ? observedPath.slice(0, -1) : observedPath;
      const baseActions = await visibleActions(page, { route, role, viewportClass });
      const menuInventories = [];

      const safeTriggers = page.locator("button[aria-haspopup]:visible, [role='button'][aria-haspopup]:visible");
      const safeTriggerCount = await safeTriggers.count();
      for (let index = 0; index < safeTriggerCount; index += 1) {
        const currentTriggers = page.locator("button[aria-haspopup]:visible, [role='button'][aria-haspopup]:visible");
        if (index >= await currentTriggers.count()) break;
        const trigger = currentTriggers.nth(index);
        const triggerName = (await trigger.getAttribute("aria-label").catch(() => "")) || (await trigger.innerText().catch(() => ""));
        if (!(await trigger.isVisible().catch(() => false))) continue;
        await trigger.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(250);
        menuInventories.push({
          triggerName: String(triggerName || "").trim(),
          actions: await visibleActions(page, { route, role, viewportClass, phase: `popup-${index + 1}` })
        });
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(100);
      }

      writeInventory(testInfo.project.name, route, {
        requestedRoute: route,
        observedRoute,
        role,
        viewportClass,
        capturedAt: new Date().toISOString(),
        baseActions,
        popups: menuInventories
      });

      if (role === "admin" && authenticatedRoutes.includes(route)) {
        expect.soft(observedRoute, `Admin should reach ${route}`).toBe(route);
      }
    }
  });
});

auditTest.describe("unauthenticated protected-route enforcement", () => {
  auditTest("redirect protected routes to login", async ({ page }, testInfo) => {
    auditTest.skip(testInfo.project.metadata.auditRole !== "unauthenticated", "Unauthenticated role only.");
    for (const route of ["/", "/emergencies", "/wallet", "/users"]) {
      await openClientRoute(page, route);
      await expect(page).toHaveURL(/\/login$/);
    }
  });
});
