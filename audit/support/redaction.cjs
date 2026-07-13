const SENSITIVE_KEY = /(authorization|apikey|token|password|secret|email|phone|address|patient|medical|clinical|notes?|description)/i;
const SENSITIVE_RUNTIME_ROUTE = /^\/(ambulances|doctors|emergencies|health-news|hospitals|insurance|map|organizations|pricing|subscriptions|support-tickets|users|verification|visits|wallet)(?:\/|$)/;
const GENERIC_CONTROL_NAME = /^(?:skip to content|search|filters?|filter [a-z ]+|refresh|retry|reset|apply|cancel|close|close [a-z ]+|go back|today|live map|statistics|analytics|settings|help|details|edit|save|continue|previous(?: page)?|next(?: page)?|select all|clear selection|delete selected|open notifications|open quick actions panel|sidebar layout settings|toggle theme|toggle [a-z ]+ group|user settings|payments?|requests?|visits?|hospitals?|ambulances?|staff|users?|organizations?|pricing|insurance|subscriptions?|support|health news|all|on|off|7 days|30 days|90 days|add (?:unit|staff|hospital|organization|user|rule|article|request|ticket|policy|subscription|price|facility|doctor|ambulance)|new (?:request|user|article|ticket|rule|policy)|create (?:request|user|article|ticket|rule|policy))$/i;
const GENERIC_METRIC_NAME = /^[A-Za-z][A-Za-z /-]{0,30}:\s*[-+]?\d[\d,.]*(?:%|\s*(?:min|hours?|days?))?$/i;

function scrubText(value) {
  return String(value ?? "")
    .replace(/\bmailto:\s*[^\s"'<>]+/gi, "[REDACTED_MAIL_URI]")
    .replace(/\btel:\s*(?:\+?[\d(). -]{7,}\d|\[REDACTED_PHONE\])/gi, "[REDACTED_TEL_URI]")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/\b(phone|telephone|mobile|tel)\s*:\s*\+?[\d\s().-]{7,}\d\b/gi, "$1: [REDACTED_PHONE]")
    .replace(/\+\d{8,15}\b/g, "[REDACTED_PHONE]")
    .replace(/\b(address|location)\s*:\s*[^\r\n]+/gi, "$1: [REDACTED_LOCATION]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[REDACTED_UUID]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]");
}

function scrubValue(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => scrubValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      scrubValue(childValue, childKey)
    ]));
  }
  return typeof value === "string" ? scrubText(value) : value;
}

function safeRequestUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const queryKeys = [...new Set([...url.searchParams.keys()])].sort();
    return `${url.origin}${url.pathname}${queryKeys.length ? `?${queryKeys.map((key) => `${key}=[REDACTED]`).join("&")}` : ""}`;
  } catch {
    return scrubText(rawUrl);
  }
}

function safePostData(request) {
  const raw = request.postData();
  if (!raw) return null;
  try {
    return scrubValue(JSON.parse(raw));
  } catch {
    return scrubText(raw).slice(0, 4000);
  }
}

function scrubActionName(value, route = "") {
  const name = scrubText(value).replace(/\s+/g, " ").trim();
  const locationLabel = name.match(/^(Address|Location):/i);
  if (locationLabel) return `${locationLabel[1]}: [REDACTED_LOCATION]`;
  const match = name.match(/^(Open|View|Edit|Delete|Approve|Reject|Verify|Assign|Retry|Resolve|Select)\s+(.+)$/i);
  if (/\[REDACTED_(?:EMAIL|PHONE|UUID|JWT)\]/.test(name)) {
    return match ? `${match[1]} [REDACTED_RECORD]` : "[REDACTED_RECORD]";
  }
  const allowed = /^(notifications?|account menu|quick actions panel|request statistics|statistics|filters?|navigation|menu|search|details|full details|full incident log|map|settings|latest link|today|console|payment|payments|selected|all)$/i;
  if (match && allowed.test(match[2])) return name;
  if (!SENSITIVE_RUNTIME_ROUTE.test(route)) return name;
  if (match) return `${match[1]} [REDACTED_RECORD]`;
  if (GENERIC_CONTROL_NAME.test(name)) return name;
  if (GENERIC_METRIC_NAME.test(name)) {
    return name.replace(/[-+]?\d[\d,.]*/g, "[REDACTED_COUNT]");
  }
  return "[REDACTED_RECORD]";
}

function sanitizeRuntimeAction(action, route, index = 0) {
  const cleanAction = scrubValue(action || {});
  const name = scrubActionName(cleanAction.name, route);
  const role = cleanAction.controlRole || cleanAction.role || cleanAction.tag || "button";
  const redactedRecord = name.includes("[REDACTED_RECORD]");
  const safeNameKey = redactedRecord
    ? `record.${index + 1}`
    : name.replace(/[^a-zA-Z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").toLowerCase() || `action.${index + 1}`;
  return {
    ...cleanAction,
    name,
    actionId: `runtime.${cleanAction.actorRole || cleanAction.role}.${cleanAction.viewportClass}.${route.replace(/[^a-zA-Z0-9]+/g, ".") || "root"}.${cleanAction.phase}.${role}.${safeNameKey}.${index + 1}`,
    locator: redactedRecord
      ? `getByRole(${JSON.stringify(role)}).nth(${index})`
      : scrubText(cleanAction.locator)
  };
}

module.exports = {
  sanitizeRuntimeAction,
  scrubText,
  scrubValue,
  scrubActionName,
  safeRequestUrl,
  safePostData
};
