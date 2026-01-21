
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Subscriber {
    id: string
    email: string
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Init Supabase Admin Client (Service Role)
        // We need service_role to read/update all subscribers regardless of ownership
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 2. Fetch pending subscribers (Limit 20 to avoid timeouts, it runs often)
        // We look for welcome_email_sent = false OR null
        const { data: subscribers, error: fetchError } = await supabase
            .from('subscribers')
            .select('id, email')
            .or('welcome_email_sent.is.false,welcome_email_sent.is.null')
            .limit(20)

        if (fetchError) throw fetchError

        if (!subscribers || subscribers.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No pending subscribers found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Found ${subscribers.length} pending subscribers...`)

        const brevoApiKey = Deno.env.get('BREVO_API_KEY')
        if (!brevoApiKey) throw new Error('BREVO_API_KEY is missing')

        const results = []

        // 3. Process each subscriber
        for (const sub of subscribers) {
            try {
                if (!sub.email) continue

                // Send Email via Brevo
                const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': brevoApiKey,
                    },
                    body: JSON.stringify({
                        sender: {
                            email: 'noreply@ivisit.ng',
                            name: 'iVisit'
                        },
                        to: [{ email: sub.email }],
                        subject: 'Welcome to iVisit!',
                        htmlContent: getWelcomeEmailTemplate(sub.email)
                    }),
                })

                if (!emailResponse.ok) {
                    const errText = await emailResponse.text()
                    console.error(`Failed to email ${sub.email}: ${errText}`)
                    results.push({ email: sub.email, status: 'failed', error: errText })
                    continue
                }

                // 4. Update Database (Mark as sent)
                const { error: updateError } = await supabase
                    .from('subscribers')
                    .update({
                        welcome_email_sent: true,
                        welcome_email_sent_at: new Date().toISOString(),
                        status: 'active'
                    })
                    .eq('id', sub.id)

                if (updateError) {
                    console.error(`Failed to update DB for ${sub.email}:`, updateError)
                    results.push({ email: sub.email, status: 'email_sent_but_db_failed' })
                } else {
                    results.push({ email: sub.email, status: 'success' })
                }

            } catch (err: any) {
                console.error(`Error processing ${sub.email}:`, err)
                results.push({ email: sub.email, status: 'error', message: err.message })
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Worker error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Reused Template (Same as sendWelcome)
function getWelcomeEmailTemplate(email: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smarter healthcare access.</title>
  <style>
    body { 
      margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; 
      line-height: 1.5; background-color: #ffffff; color: #1d1d1f;
    }
    .container { max-width: 640px; margin: 0 auto; padding: 0 20px; }
    .header { padding: 90px 0 60px 0; text-align: center; }
    .logo-text { font-size: 26px; font-weight: 700; color: #1d1d1f; }
    .logo-text .dot { color: #86100E; }
    .hero-title { font-size: 56px; font-weight: 700; margin-bottom: 12px; }
    .hero-banner { background: linear-gradient(135deg, #86100E 0%, #B71C1C 100%); color: white; padding: 60px 40px; border-radius: 16px; margin-bottom: 60px; text-align: center; }
    .cta-button { background-color: #86100E; color: white !important; padding: 18px 40px; text-decoration: none; border-radius: 980px; font-weight: 600; display: inline-block; }
    .footer { padding: 40px 0 60px 0; border-top: 1px solid #d2d2d7; font-size: 12px; color: #86868b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">iVisit<span class="dot">.</span></div>
      <h1 class="hero-title">Welcome to iVisit<span class="dot">.</span></h1>
    </div>
    <div class="hero-banner">
      <h2 style="margin:0; font-size:32px;">Skip the wait. Get care now.</h2>
    </div>
    <div style="text-align: center; margin-bottom: 60px; font-size: 19px;">
      Thanks for joining iVisit! Your email <strong>${email}</strong> has been successfully added to our early access list.
    </div>
    <div style="text-align: center; margin-bottom: 100px;">
      <a href="https://www.ivisit.ng" class="cta-button">Get Started</a>
    </div>
    <div class="footer">
      <p> 2026 iVisit Global. All rights reserved.</p>
      <p><a href="https://www.ivisit.ng/privacy" style="color:#1d1d1f; text-decoration:none;">Privacy</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
