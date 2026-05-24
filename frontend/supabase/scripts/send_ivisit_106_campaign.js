#!/usr/bin/env node
/**
 * Send the iVisit 1.0.6 closed-test campaign to active subscribers.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const SUPABASE_HOST = "dlwtcmhdzoklveihuhjf.supabase.co";
const ANON_KEY = "sb_publishable_KZBb509YWMrTkPbtuE-0yg_vWIfnxl8";
const SUBJECT = "Please update iVisit 1.0.6 and rate your test";
const args = new Set(process.argv.slice(2));
const shouldSend =
  args.has("--send") || String(process.env.IVISIT_CAMPAIGN_CONFIRM || "").toLowerCase() === "send";

if (args.has("--help") || args.has("-h")) {
  console.log([
    "Usage:",
    "  node supabase/scripts/send_ivisit_106_campaign.js              # dry run",
    "  node supabase/scripts/send_ivisit_106_campaign.js --send       # send to resolved recipients",
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
  const closedTestUrl = "https://play.google.com/apps/testing/com.dyrane.ivisit";
  const feedbackBase =
    "mailto:support@ivisit.ng?subject=iVisit%201.0.6%20closed%20test%20feedback";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${SUBJECT}</title>
  </head>
  <body style="margin:0;background:#f6f7f8;color:#17201d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Update or install iVisit 1.0.6, test the emergency flows, and rate your experience on Google Play.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f8;">
      <tr><td align="center" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(23,32,29,0.10);">
          <tr><td style="background:#0f1c18;padding:34px 30px 30px;color:#ffffff;text-align:center;">
            <img src="https://www.ivisit.ng/logo.png" alt="iVisit" style="height:36px;width:auto;margin:0 auto 14px;display:block;">
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.04em;color:#ffffff;margin-bottom:18px;">iVisit<span style="color:#ffcbc7;">.</span></div>
            <div style="font-size:15px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#ffcbc7;">Closed test reminder</div>
            <h1 style="margin:14px 0 10px;font-size:38px;line-height:1.05;letter-spacing:-0.03em;">Please update and rate iVisit.</h1>
            <p style="margin:0;font-size:17px;line-height:1.55;color:#d7e1dc;">Version 1.0.6 is ready for your Google Play closed test feedback.</p>
          </td></tr>
          <tr><td style="padding:30px;">
            <p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#27342f;">Thank you for helping test iVisit. Please <strong>install or update to version 1.0.6</strong>, keep the app installed during testing, try the core emergency flows, and leave a quick rating after your test.</p>
            <div style="margin:24px 0;">
              <div style="padding:16px 18px;background:#f7f2f1;border-left:4px solid #86100e;border-radius:14px;font-size:15px;line-height:1.5;color:#26312d;margin-bottom:10px;"><strong>Update or install</strong><br>Open the Google Play test link and make sure you are on iVisit 1.0.6.</div>
              <div style="padding:16px 18px;background:#f3f8f6;border-left:4px solid #1f8f68;border-radius:14px;font-size:15px;line-height:1.5;color:#26312d;margin-bottom:10px;"><strong>Test real interactions</strong><br>Try hospital search, location permission, ambulance request simulation, and tracking/status.</div>
              <div style="padding:16px 18px;background:#f4f6fb;border-left:4px solid #315b9f;border-radius:14px;font-size:15px;line-height:1.5;color:#26312d;"><strong>Rate and respond</strong><br>Rate iVisit on Google Play, then reply with anything that felt unclear or broken.</div>
            </div>
            <div style="padding:20px;border-radius:18px;background:#101c18;color:#ffffff;margin:26px 0;">
              <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#8de0bf;">Quick rating</div>
              <p style="margin:8px 0 16px;font-size:15px;line-height:1.55;color:#dfe9e4;">Tap a score after you test. A short note is enough.</p>
              <a href="${feedbackBase}%20-%201%20star&body=Rating%3A%201%2F5%0AWhat%20happened%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">1</a>
              <a href="${feedbackBase}%20-%202%20stars&body=Rating%3A%202%2F5%0AWhat%20happened%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">2</a>
              <a href="${feedbackBase}%20-%203%20stars&body=Rating%3A%203%2F5%0AWhat%20happened%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">3</a>
              <a href="${feedbackBase}%20-%204%20stars&body=Rating%3A%204%2F5%0AWhat%20worked%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">4</a>
              <a href="${feedbackBase}%20-%205%20stars&body=Rating%3A%205%2F5%0AWhat%20worked%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">5</a>
            </div>
            <a href="${closedTestUrl}" style="display:inline-block;background:#86100e;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:15px 22px;border-radius:999px;margin:0 8px 10px 0;">Update / install</a>
            <a href="${playStoreUrl}" style="display:inline-block;background:#edf1ef;color:#17201d;text-decoration:none;font-weight:800;font-size:15px;padding:15px 22px;border-radius:999px;margin-bottom:10px;">Rate on Play Store</a>
          </td></tr>
          <tr><td style="padding:22px 30px 30px;background:#fbfbfb;border-top:1px solid #eef0ef;color:#68736f;font-size:12px;line-height:1.55;">
            Reply to this email with feedback, or use this quick link:
            <a href="${feedbackBase}&body=Rating%3A%20%0AWhat%20I%20tested%3A%20%0AWhat%20felt%20unclear%3A%20" style="color:#86100e;text-decoration:none;font-weight:700;">send test feedback</a>.<br>
            You are receiving this because you subscribed to iVisit updates or joined the iVisit testing list.<br>
            <a href="https://${SUPABASE_HOST}/functions/v1/unsubscribe?email=${encodedEmail}" style="color:#86100e;text-decoration:none;font-weight:700;">Unsubscribe</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function requestJson({ method = "GET", path, body }) {
  const payload = body ? JSON.stringify(body) : null;
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
  };

  if (payload) {
    headers["Content-Length"] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: SUPABASE_HOST, port: 443, path, method, headers },
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

  if (emails.length === 0) {
    throw new Error("No active subscriber emails found.");
  }

  await sendCampaignEmails(emails, { dryRun: !shouldSend });
}

async function sendCampaignEmails(emails, { dryRun = true } = {}) {
  if (dryRun) {
    console.log(JSON.stringify({
      mode: "dry-run",
      requested: emails.length,
      subject: SUBJECT,
      recipients: emails,
      nextStep: "Re-run with --send or IVISIT_CAMPAIGN_CONFIRM=send to send this campaign.",
    }, null, 2));
    return;
  }

  const results = [];

  for (const email of emails) {
    try {
      const response = await requestJson({
        method: "POST",
        path: "/functions/v1/sendCustomEmail",
        body: {
          email,
          subject: SUBJECT,
          content: getCampaignHtml(email),
        },
      });
      results.push({ email, status: "success", response });
    } catch (error) {
      results.push({ email, status: "error", error: error.message });
    }
  }

  const sent = results.filter((result) => result.status === "success").length;
  const failed = results.length - sent;
  console.log(JSON.stringify({ requested: emails.length, sent, failed, results }, null, 2));

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
