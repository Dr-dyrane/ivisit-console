const { scrubActionName } = require("./redaction.cjs");

function slug(value) {
  return String(value || "unnamed")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80) || "unnamed";
}

async function visibleActions(page, { route, role, viewportClass, phase = "base" }) {
  const entries = await page.locator([
    "button",
    "a[href]",
    "[role='button']",
    "[role='link']",
    "[role='menuitem']",
    "[role='tab']",
    "[role='switch']",
    "[role='checkbox']",
    "input[type='submit']",
    "input[type='button']",
    "summary"
  ].join(",")).evaluateAll((elements) => elements.filter((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }).map((element, index) => {
    const tag = element.tagName.toLowerCase();
    const explicitRole = element.getAttribute("role");
    const implicitRole = tag === "a" ? "link" : (tag === "button" || tag === "summary" || element.type === "submit" || element.type === "button") ? "button" : null;
    const roleName = explicitRole || implicitRole || tag;
    const labelledBy = element.getAttribute("aria-labelledby");
    const labelledText = labelledBy
      ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ")
      : "";
    const name = [
      element.getAttribute("aria-label"),
      labelledText,
      element.getAttribute("title"),
      element.getAttribute("value"),
      element.innerText,
      element.textContent,
      element.querySelector("img[alt]")?.getAttribute("alt")
    ].find((value) => value && value.trim())?.trim().replace(/\s+/g, " ") || "";
    const rect = element.getBoundingClientRect();
    return {
      domIndex: index,
      tag,
      role: roleName,
      name,
      href: element.getAttribute("href"),
      type: element.getAttribute("type"),
      disabled: Boolean(element.disabled) || element.getAttribute("aria-disabled") === "true",
      ariaHaspopup: element.getAttribute("aria-haspopup"),
      ariaExpanded: element.getAttribute("aria-expanded"),
      dataState: element.getAttribute("data-state"),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }));

  return entries.map((entry, index) => {
    const safeName = scrubActionName(entry.name, route);
    return {
    actionId: `runtime.${role}.${viewportClass}.${slug(route)}.${phase}.${slug(entry.role)}.${slug(safeName)}.${index + 1}`,
    route,
    observedRoute: new URL(page.url()).pathname,
    actorRole: role,
    viewportClass,
    phase,
    locator: safeName ? (safeName.includes("[REDACTED_RECORD]") ? `getByRole(${JSON.stringify(entry.role)}, { name: /^${safeName.split(" ")[0]} / }).nth(${index})` : `getByRole(${JSON.stringify(entry.role)}, { name: ${JSON.stringify(safeName)} })`) : `${entry.tag}:nth(${entry.domIndex})`,
    ...entry,
    name: safeName,
    controlRole: entry.role,
    role
  };
  });
}

module.exports = { visibleActions, slug };
