const assert = require("node:assert/strict");
const test = require("node:test");
const { scrubActionName, scrubText } = require("./redaction.cjs");

test("scrubText removes operational contact and location labels", () => {
  assert.equal(scrubText("Phone: +2348143328418"), "Phone: [REDACTED_PHONE]");
  assert.equal(
    scrubText("Address: 12 Example Road, Port Harcourt"),
    "Address: [REDACTED_LOCATION]"
  );
  assert.equal(scrubText("person@example.com"), "[REDACTED_EMAIL]");
});

test("scrubText removes contact URI schemes with their values", () => {
  assert.equal(scrubText("mailto:operator@example.com"), "[REDACTED_MAIL_URI]");
  assert.equal(scrubText("mailto:[REDACTED_EMAIL]"), "[REDACTED_MAIL_URI]");
  assert.equal(scrubText("tel:+2348012345678"), "[REDACTED_TEL_URI]");
  assert.equal(scrubText("tel: [REDACTED_PHONE]"), "[REDACTED_TEL_URI]");
});

test("scrubActionName preserves commands while hiding record identity", () => {
  assert.equal(scrubActionName("View Example Hospital", "/hospitals"), "View [REDACTED_RECORD]");
  assert.equal(scrubActionName("View statistics", "/hospitals"), "View statistics");
  assert.equal(scrubActionName("Filter ambulances", "/ambulances"), "Filter ambulances");
  assert.equal(scrubActionName("Fleet: 344", "/ambulances"), "Fleet: [REDACTED_COUNT]");
  assert.equal(
    scrubActionName("D-AMB-6 BLS Ready Example Hospital Jul 4, 10:56 AM", "/ambulances"),
    "[REDACTED_RECORD]"
  );
  assert.equal(
    scrubActionName("Location: 2X42+X43 Airport Road", "/emergencies"),
    "Location: [REDACTED_LOCATION]"
  );
});
