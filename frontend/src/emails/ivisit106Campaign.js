export const IVISIT_106_CAMPAIGN_SUBJECT = "Please update iVisit 1.0.6 and rate your test";

export const IVISIT_106_CAMPAIGN_TEXT = [
  "iVisit 1.0.6 is now available for closed testing.",
  "",
  "Please install or update to the latest version, keep the app installed, test the core emergency flows, and send us a quick rating.",
  "",
  "Test hospital search, location permission, ambulance request simulation, tracking/status, and the final rating step.",
  "",
  "After testing, rate iVisit on Google Play and reply with what worked, what felt unclear, and a simple 1-5 rating.",
].join("\n");

export function getIvisit106CampaignHtml({ email = "" } = {}) {
  const encodedEmail = email ? encodeURIComponent(email) : "{{email}}";
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.dyrane.ivisit";
  const closedTestUrl = "https://play.google.com/apps/testing/com.dyrane.ivisit";
  const feedbackBase =
    "mailto:support@ivisit.ng?subject=iVisit%201.0.6%20closed%20test%20feedback";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${IVISIT_106_CAMPAIGN_SUBJECT}</title>
  </head>
  <body style="margin:0;background:#f6f7f8;color:#17201d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Update or install iVisit 1.0.6, test the emergency flows, and rate your experience on Google Play.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f8;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(23,32,29,0.10);">
            <tr>
              <td style="background:#0f1c18;padding:34px 30px 30px;color:#ffffff;text-align:center;">
                <img src="https://www.ivisit.ng/logo.png" alt="iVisit" style="height:36px;width:auto;margin:0 auto 14px;display:block;">
                <div style="font-size:22px;font-weight:800;letter-spacing:-0.04em;color:#ffffff;margin-bottom:18px;">iVisit<span style="color:#ffcbc7;">.</span></div>
                <div style="font-size:15px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#ffcbc7;">Closed test reminder</div>
                <h1 style="margin:14px 0 10px;font-size:38px;line-height:1.05;letter-spacing:-0.03em;">Please update and rate iVisit.</h1>
                <p style="margin:0;font-size:17px;line-height:1.55;color:#d7e1dc;">Version 1.0.6 is ready for your Google Play closed test feedback.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#27342f;">Thank you for helping test iVisit. Please <strong>install or update to version 1.0.6</strong>, keep the app installed during testing, try the core emergency flows, and leave a quick rating after your test.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-collapse:separate;border-spacing:0 10px;">
                  <tr>
                    <td style="padding:16px 18px;background:#f7f2f1;border-left:4px solid #86100e;border-radius:14px;font-size:15px;line-height:1.5;color:#26312d;"><strong>Update or install</strong><br>Open the Google Play test link and make sure you are on iVisit 1.0.6.</td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px;background:#f3f8f6;border-left:4px solid #1f8f68;border-radius:14px;font-size:15px;line-height:1.5;color:#26312d;"><strong>Test real interactions</strong><br>Try hospital search, location permission, ambulance request simulation, and tracking/status.</td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px;background:#f4f6fb;border-left:4px solid #315b9f;border-radius:14px;font-size:15px;line-height:1.5;color:#26312d;"><strong>Rate and respond</strong><br>Rate iVisit on Google Play, then reply with anything that felt unclear or broken.</td>
                  </tr>
                </table>

                <div style="padding:20px;border-radius:18px;background:#101c18;color:#ffffff;margin:26px 0;">
                  <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#8de0bf;">Quick rating</div>
                  <p style="margin:8px 0 16px;font-size:15px;line-height:1.55;color:#dfe9e4;">Tap a score after you test. A short note is enough.</p>
                  <div>
                    <a href="${feedbackBase}%20-%201%20star&body=Rating%3A%201%2F5%0AWhat%20happened%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">1</a>
                    <a href="${feedbackBase}%20-%202%20stars&body=Rating%3A%202%2F5%0AWhat%20happened%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">2</a>
                    <a href="${feedbackBase}%20-%203%20stars&body=Rating%3A%203%2F5%0AWhat%20happened%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">3</a>
                    <a href="${feedbackBase}%20-%204%20stars&body=Rating%3A%204%2F5%0AWhat%20worked%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">4</a>
                    <a href="${feedbackBase}%20-%205%20stars&body=Rating%3A%205%2F5%0AWhat%20worked%3A%20" style="display:inline-block;margin:0 6px 8px 0;padding:10px 12px;border-radius:999px;background:#ffffff;color:#101c18;text-decoration:none;font-weight:800;">5</a>
                  </div>
                </div>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 6px;">
                  <tr>
                    <td>
                      <a href="${closedTestUrl}" style="display:inline-block;background:#86100e;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:15px 22px;border-radius:999px;">Update / install</a>
                    </td>
                    <td style="width:10px;"></td>
                    <td>
                      <a href="${playStoreUrl}" style="display:inline-block;background:#edf1ef;color:#17201d;text-decoration:none;font-weight:800;font-size:15px;padding:15px 22px;border-radius:999px;">Rate on Play Store</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px 30px;background:#fbfbfb;border-top:1px solid #eef0ef;color:#68736f;font-size:12px;line-height:1.55;">
                Reply to this email with feedback, or use this quick link:
                <a href="${feedbackBase}&body=Rating%3A%20%0AWhat%20I%20tested%3A%20%0AWhat%20felt%20unclear%3A%20" style="color:#86100e;text-decoration:none;font-weight:700;">send test feedback</a>.
                <br>
                You are receiving this because you subscribed to iVisit updates or joined the iVisit testing list.
                <br>
                <a href="https://dlwtcmhdzoklveihuhjf.supabase.co/functions/v1/unsubscribe?email=${encodedEmail}" style="color:#86100e;text-decoration:none;font-weight:700;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
