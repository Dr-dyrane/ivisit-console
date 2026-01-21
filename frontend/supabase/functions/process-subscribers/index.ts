
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
    /* Apple-Inspired Design System with iVisit Color Integration */
    body { 
      margin: 0; 
      padding: 0; 
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif; 
      line-height: 1.5; 
      background-color: #ffffff; 
      color: #1d1d1f;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper { background-color: #ffffff; width: 100%; }
    .container { max-width: 640px; margin: 0 auto; padding: 0 20px; }
    
    /* The Reveal Header */
    .header { padding: 90px 0 60px 0; text-align: center; }
    .logo-container { margin-bottom: 50px; }
    .logo-text { font-size: 26px; font-weight: 700; letter-spacing: -1.4px; color: #1d1d1f; }
    .logo-text .dot { color: #86100E; }
    .logo-img { height: 32px; width: auto; }
    
    .hero-title { 
      color: #1d1d1f; 
      margin: 0; 
      font-size: 56px; 
      font-weight: 700; 
      line-height: 1.07143; 
      letter-spacing: -0.015em; 
      text-align: center;
      margin-bottom: 12px;
    }
    .hero-title .dot { color: #86100E; }
    
    .sub-headline {
      font-size: 24px;
      line-height: 1.2;
      font-weight: 600;
      letter-spacing: .009em;
      color: #86868b;
      margin-bottom: 60px;
      text-align: center;
    }
    
    .content { text-align: center; max-width: 480px; margin: 0 auto; }
    .hero-banner {
      background: linear-gradient(135deg, #86100E 0%, #B71C1C 100%);
      color: white;
      padding: 60px 40px;
      border-radius: 16px;
      margin-bottom: 60px;
      text-align: center;
    }
    .banner-title {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 20px 0;
      letter-spacing: -0.02em;
    }
    .banner-subtitle {
      font-size: 18px;
      opacity: 0.9;
      margin: 0;
      font-weight: 500;
    }
    .body-text { 
      font-size: 19px; 
      line-height: 1.5; 
      font-weight: 400; 
      letter-spacing: .012em; 
      color: #1d1d1f; 
      margin-bottom: 80px;
    }
    
    /* Minimalist Sections */
    .section-divider {
      height: 1px;
      background-color: #f2f2f7;
      width: 100%;
      margin: 80px 0;
    }
    
    .feature-title { 
      color: #1d1d1f; 
      margin: 0 0 30px 0; 
      font-size: 21px; 
      font-weight: 700; 
      letter-spacing: 0.011em; 
      feature-title::after { content: '.'; color: #86100E; }
    }
    
    .feature-text { 
      color: #86868b; 
      font-size: 17px; 
      line-height: 1.5; 
      font-weight: 400; 
      letter-spacing: -0.01em;
    }
    
    .cta-container { text-align: center; margin: 80px 0 100px 0; }
    .cta-button { 
      background-color: #86100E; 
      color: white !important; 
      padding: 18px 40px; 
      text-decoration: none; 
      border-radius: 980px; 
      font-size: 17px;
      line-height: 1.1;
      font-weight: 600; 
      letter-spacing: -0.01em;
      display: inline-block; 
      box-shadow: 0 10px 20px -5px #86100E33;
      transition: all 0.2s ease;
    }
    .cta-button:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    
    .footer { padding: 40px 0 60px 0; text-align: left; border-top: 1px solid #d2d2d7; }
    .footer-text { color: #86868b; font-size: 12px; line-height: 1.4; font-weight: 400; margin-bottom: 12px; }
    .footer-links { color: #86868b; font-size: 12px; margin-top: 15px; }
    .footer-links a { color: #1d1d1f; text-decoration: none; margin-right: 15px; font-weight: 600; }
    .footer-links a:hover { color: #86100E; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <img src="https://www.ivisit.ng/logo.png" alt="iVisit" class="logo-img">
          <div class="logo-text" style="margin-top: 15px;">iVisit<span class="dot">.</span></div>
        </div>
        <h1 class="hero-title">Welcome to iVisit<span class="dot">.</span></h1>
      </div>
      
      <div class="content">
        <div class="hero-banner">
          <div class="banner-content">
            <h2 class="banner-title">Skip the wait. Get care now.</h2>
            <p class="banner-subtitle">Real-time healthcare access when you need it most</p>
          </div>
        </div>
        
        <div class="sub-headline">Smarter healthcare access.</div>
        <div class="body-text">Thanks for joining iVisit! Your email <strong>${email}</strong> has been successfully added to our early access list.<br><br>iVisit is a real-time, map-based platform for urgent care access. It shows what's available nearby and helps you act immediately.<br><br>Each request becomes a visit — tracked from start to resolution.</div>
        
        <div class="section-divider"></div>
        
        <h2 class="feature-title">What happens next</h2>
        
        <div class="feature-text">
          <p style="margin-bottom: 20px;">iVisit is preparing for launch.</p>
          <p style="margin-bottom: 20px;">You'll receive early access and essential updates only.</p>
          <p style="margin-bottom: 20px;">Availability notifications will follow.</p>
        </div>
      
        <div class="cta-container">
          <a href="https://www.ivisit.ng" class="cta-button">Get Started</a>
        </div>
      </div>
      
      <div class="footer">
        <p class="footer-text"> 2026 iVisit Global. All rights reserved.</p>
        <p class="footer-text">You are receiving this because you subscribed to early access updates for iVisit. Healthcare access, redesigned for speed and clarity.</p>
        <div class="footer-links">
          <a href="https://dlwtcmhdzoklveihuhjf.supabase.co/functions/v1/unsubscribe?email=${email}">Unsubscribe</a>
          <a href="https://www.ivisit.ng/privacy">Privacy Policy</a>
          <a href="https://www.ivisit.ng/support">Support</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
