# Subscriber Campaigns

Last updated: 2026-05-22.

This guide documents the iVisit Console subscriber email flow used for closed-test reminders and launch communications.

## Email Services

Subscriber emails are sent through Supabase Edge Functions backed by Brevo:

- `supabase/functions/payments/sendWelcome/index.ts`
- `supabase/functions/payments/sendCustomEmail/index.ts`
- `supabase/functions/payments/sendBulkEmail/index.ts`

The existing brand pattern uses:

- Hosted logo: `https://www.ivisit.ng/logo.png`
- Sender: `noreply@ivisit.ng`
- Sender name: `iVisit`
- Unsubscribe endpoint: `https://dlwtcmhdzoklveihuhjf.supabase.co/functions/v1/unsubscribe?email=<email>`

## 1.0.6 Closed-Test Reminder

The reusable campaign template lives at:

- `src/emails/ivisit106Campaign.js`

The direct send script lives at:

- `supabase/scripts/send_ivisit_106_campaign.js`

The template asks testers to:

1. Update or install iVisit `1.0.6`.
2. Keep the app installed during the closed-test window.
3. Test hospital search, location permission, ambulance request simulation, tracking/status, and rating/feedback.
4. Rate the app on Google Play.
5. Reply with feedback and a quick 1-5 rating.

Campaign links:

- Closed test opt-in: `https://play.google.com/apps/testing/com.dyrane.ivisit`
- Play Store listing: `https://play.google.com/store/apps/details?id=com.dyrane.ivisit`
- Feedback: `mailto:support@ivisit.ng`

## Sending

Default behavior is a dry run. It resolves the recipient list and prints what would be sent without contacting the email function:

```bash
node supabase/scripts/send_ivisit_106_campaign.js
```

The script first attempts to read active subscribers from Supabase:

```text
/rest/v1/subscribers?select=id,email,status&status=eq.active
```

If no active subscriber rows are visible, it falls back to:

```text
exports/subscribers_emails.csv
```

To send the campaign, pass the explicit send gate:

```bash
node supabase/scripts/send_ivisit_106_campaign.js --send
```

To retry only specific addresses, set the recipient list first. This is also a dry run unless `--send` is present:

```powershell
$env:IVISIT_CAMPAIGN_EMAILS='person@example.com,second@example.com'
node supabase/scripts/send_ivisit_106_campaign.js
```

Targeted send:

```powershell
$env:IVISIT_CAMPAIGN_EMAILS='person@example.com,second@example.com'
node supabase/scripts/send_ivisit_106_campaign.js --send
```

## 2026-05-22 Send Record

The 1.0.6 reminder was sent to 16 exported subscribers.

- First announcement: 13 sent, 3 initially blocked by Brevo authorized-IP checks, then all 3 succeeded on targeted retry.
- Reminder update/install/rate email: 15 sent, 1 initially blocked by Brevo authorized-IP checks, then succeeded on targeted retry.

When Brevo returns an unrecognized-IP error from the Edge Function, retry only the failed addresses with `IVISIT_CAMPAIGN_EMAILS` so successful recipients do not receive duplicates.

## Console UI Preset

The subscriber modal includes a "Use iVisit 1.0.6 campaign" preset in:

```text
src/components/modals/SubscriptionModal.jsx
```

This preset loads the same subject and HTML content used by the send script.

## Verification Notes

Before sending a campaign:

1. Run `node --check supabase/scripts/send_ivisit_106_campaign.js`.
2. Confirm the Play Store and closed-test links are current.
3. Confirm unsubscribe links include either a real encoded email or `{{email}}` for bulk personalization.
4. Send a targeted test first when changing layout or copy.

Known unrelated blocker:

- `npm run build` currently fails because `src/types/database.ts` appears to contain binary/null bytes (`TS1490: File appears to be binary`). This is unrelated to the campaign script but blocks a full production build until repaired.
