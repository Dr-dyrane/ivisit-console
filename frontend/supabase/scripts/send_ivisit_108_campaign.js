#!/usr/bin/env node
/**
 * Send the iVisit 1.0.8 release campaign to active subscribers.
 *
 * Modeled on send_ivisit_106_campaign.js (same edge function, recipient
 * resolution, and dry-run/--send gate). Email design follows the current
 * borderless less-is-more canon: no left-accent callouts, soft surfaces,
 * a single CTA.
 *
 * HOLD RULE: do not --send until the 1.0.8 rollout is LIVE on Google Play.
 *
 * Usage:
 *   node supabase/scripts/send_ivisit_108_campaign.js              # dry run
 *   node supabase/scripts/send_ivisit_108_campaign.js --send       # send
 *
 * Optional:
 *   IVISIT_CAMPAIGN_EMAILS='person@example.com'   # explicit recipients (test)
 *   IVISIT_CAMPAIGN_CONFIRM=send
 *
 * Subject A/B alternates (pick one, edit SUBJECT):
 *   curiosity:  "Your next visit works differently"
 *   timeliness: "iVisit 1.0.8 is here - update when ready"
 *   benefit:    "Book a visit. Track it. Done."
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const SUPABASE_HOST = "dlwtcmhdzoklveihuhjf.supabase.co";
const ANON_KEY = "sb_publishable_KZBb509YWMrTkPbtuE-0yg_vWIfnxl8";
const SUBJECT = "Your visit, start to finish";
const args = new Set(process.argv.slice(2));
const shouldSend =
  args.has("--send") || String(process.env.IVISIT_CAMPAIGN_CONFIRM || "").toLowerCase() === "send";

if (args.has("--help") || args.has("-h")) {
  console.log([
    "Usage:",
    "  node supabase/scripts/send_ivisit_108_campaign.js              # dry run",
    "  node supabase/scripts/send_ivisit_108_campaign.js --send       # send to resolved recipients",
    "",
    "Optional:",
    "  IVISIT_CAMPAIGN_EMAILS='person@example.com,second@example.com'",
    "  IVISIT_CAMPAIGN_CONFIRM=send",
  ].join("\n"));
  process.exit(0);
}

function getCampaignHtml(email = "") {
  const encodedEmail = encodeURIComponent(email);
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.dyrane.ivisit";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${SUBJECT}</title>
  </head>
  <body style="margin:0;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Scheduled visits. Smoother emergencies. A calmer map.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr><td align="center" style="padding:0 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">

          <tr><td align="center" style="padding:64px 0 0;">
            <div style="font-size:21px;font-weight:800;letter-spacing:-0.03em;color:#111111;">iVisit<span style="color:#86100e;">.</span></div>
          </td></tr>

          <tr><td align="center" style="padding:72px 0 0;">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.22em;color:#86100e;">1.0.8</div>
            <h1 style="margin:20px 0 0;font-size:46px;line-height:1.06;letter-spacing:-0.045em;font-weight:800;color:#111111;">Your visit,<br>start to finish.</h1>
            <p style="margin:22px 0 0;font-size:18px;line-height:1.5;letter-spacing:-0.01em;color:#6e6e73;">Book care. Track it live. Done.</p>
          </td></tr>

          <tr><td align="center" style="padding:56px 0 0;">
            <img src="https://${SUPABASE_HOST}/storage/v1/object/public/images/screenshots/ivisit-explore-nobg.png" width="360" alt="The iVisit map" style="width:100%;max-width:360px;height:auto;display:block;border:0;">
          </td></tr>

          <tr><td align="center" style="padding:72px 0 0;">
            <div style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#111111;">Scheduled visits</div>
            <div style="margin-top:6px;font-size:15px;line-height:1.5;color:#6e6e73;">Book ahead. Reschedule in a tap.</div>
          </td></tr>

          <tr><td align="center" style="padding:44px 0 0;">
            <div style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#111111;">Emergencies that finish</div>
            <div style="margin-top:6px;font-size:15px;line-height:1.5;color:#6e6e73;">Arrival to rating. One flow.</div>
          </td></tr>

          <tr><td align="center" style="padding:44px 0 0;">
            <div style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#111111;">A calmer map</div>
            <div style="margin-top:6px;font-size:15px;line-height:1.5;color:#6e6e73;">Every pin at its proper size.</div>
          </td></tr>

          <tr><td align="center" style="padding:88px 0 0;">
            <a href="${playStoreUrl}" style="display:inline-block;background:#86100e;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:-0.01em;padding:16px 38px;border-radius:999px;">Get the update</a>
            <div style="margin-top:16px;font-size:13px;color:#a1a1a6;">Free on Google Play</div>
          </td></tr>

          <tr><td align="center" style="padding:96px 0 56px;">
            <div style="font-size:12px;line-height:1.8;color:#a1a1a6;">
              The iVisit team<br>
              You subscribed to iVisit updates.
              <a href="https://${SUPABASE_HOST}/functions/v1/unsubscribe?email=${encodedEmail}" style="color:#86100e;text-decoration:none;font-weight:600;">Unsubscribe</a>
            </div>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function requestJson({ method = "GET", path: reqPath, body }) {
  const payload = body ? JSON.stringify(body) : null;
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
  };
  if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: SUPABASE_HOST, port: 443, path: reqPath, method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = data;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch (_) {}
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
            return;
          }
          reject(new Error(`HTTP ${res.statusCode}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`));
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sendCampaignEmails(emails, { dryRun }) {
  console.log(`${dryRun ? "[DRY RUN] Would send" : "Sending"} "${SUBJECT}" to ${emails.length} recipient(s):`);
  for (const email of emails) console.log(`  - ${email}`);
  if (dryRun) {
    console.log("\nDry run complete. Re-run with --send to deliver.");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const email of emails) {
    try {
      await requestJson({
        method: "POST",
        path: "/functions/v1/sendCustomEmail",
        body: { email, subject: SUBJECT, content: getCampaignHtml(email) },
      });
      sent += 1;
      console.log(`  sent: ${email}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAILED: ${email} -> ${error.message}`);
    }
  }
  console.log(`\nDone. sent=${sent} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

async function main() {
  const explicitEmails = String(process.env.IVISIT_CAMPAIGN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  if (explicitEmails.length > 0) {
    await sendCampaignEmails([...new Set(explicitEmails)], { dryRun: !shouldSend });
    return;
  }

  const subscribers = await requestJson({
    path: "/rest/v1/subscribers?select=id,email,status&status=eq.active",
  });
  let emails = [...new Set((subscribers || []).map((sub) => sub.email).filter(Boolean))];

  if (emails.length === 0) {
    const csvPath = path.resolve(__dirname, "../../exports/subscribers_emails.csv");
    const csv = fs.readFileSync(csvPath, "utf8");
    emails = [
      ...new Set(
        csv
          .split(/\r?\n/)
          .map((line) => line.trim().toLowerCase())
          .filter((line) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line))
      ),
    ];
  }

  if (emails.length === 0) throw new Error("No active subscriber emails found.");
  await sendCampaignEmails(emails, { dryRun: !shouldSend });
}

main().catch((error) => {
  console.error(`Campaign failed: ${error.message}`);
  process.exit(1);
});
