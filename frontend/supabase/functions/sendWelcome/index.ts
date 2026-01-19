import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WelcomeEmailPayload {
  email: string
}

// @ts-ignore - Deno global is available in runtime
export const handler = async (req: Request, supabaseClient?: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email }: WelcomeEmailPayload = await req.json()
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore - Deno global is available in runtime
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY environment variable is required')
    }

    // Email content
    const subject = 'Welcome to iVisit!'
    const html = getWelcomeEmailTemplate(email)

    // Brevo HTTP API request
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
        to: [{ email }],
        subject,
        htmlContent: html
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('Brevo API error:', errorData)
      throw new Error(`Failed to send email: ${errorData}`)
    }

    // Update subscriber record
    if (!supabaseClient) {
      // @ts-ignore - Deno global is available in runtime
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      // @ts-ignore - Deno global is available in runtime
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    }

    const { error: updateError } = await supabaseClient
      .from('subscribers')
      .update({ 
        new_user: false
      })
      .eq('email', email)

    if (updateError) {
      console.error('Failed to update subscriber:', updateError)
      // Don't throw here - email was sent successfully
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in sendWelcome function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// @ts-ignore - Deno global is available in runtime
serve(handler)

function getWelcomeEmailTemplate(email: string): string {
  const emailDomain = email.split('@')[1]
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to iVisit</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
    .header { background: linear-gradient(135deg, #86100E 0%, #B71C1C 100%); padding: 30px 20px; text-align: center; }
    .logo { height: 60px; margin-bottom: 20px; }
    .title { color: white; margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 20px; max-width: 600px; margin: 0 auto; }
    .feature-box { background: #f8f9fa; border-radius: 12px; padding: 30px; margin: 30px 0; }
    .cta-button { background: #86100E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
    .footer { background: #f8f9fa; padding: 30px 20px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer-text { color: #999; font-size: 14px; margin: 0; }
    .footer-links { color: #999; font-size: 12px; margin-top: 10px; }
    .footer-links a { color: #999; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://www.ivisit.ng/logo.png" alt="iVisit" class="logo">
    <h1 class="title">Welcome to iVisit!</h1>
  </div>
  
  <div class="content">
    <p style="font-size: 18px; color: #333;">Hi there,</p>
    <p style="font-size: 16px; color: #666;">Thanks for subscribing to iVisit! We're excited to have you on board.</p>
    <p style="font-size: 16px; color: #666;">Your email <strong>${email}</strong> has been successfully added to our community.</p>
    
    <div class="feature-box">
      <h2 style="color: #333; margin-bottom: 20px;">What's Next?</h2>
      <ul style="color: #666;">
        <li>🏥 Access to top healthcare providers</li>
        <li>📱 Easy appointment scheduling</li>
        <li>💊 Prescription management</li>
        <li>📊 Personalized health insights</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="https://www.ivisit.ng/dashboard" class="cta-button">Get Started</a>
    </div>
  </div>
  
  <div class="footer">
    <p class="footer-text">© 2026 iVisit. All rights reserved.</p>
    <p class="footer-links">
      <a href="https://www.ivisit.ng/unsubscribe?email=${email}">Unsubscribe</a> | 
      <a href="https://www.ivisit.ng/privacy">Privacy Policy</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}
