// Simple bulk email function using Brevo HTTP API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

interface BulkEmailPayload {
  emails: string[]
  subject: string
  content: string
}

// @ts-ignore - Deno global is available in runtime
export const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { emails, subject, content }: BulkEmailPayload = await req.json()
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Emails array is required' }),
        { status: 400, headers: corsHeaders }
      )
    }
    
    if (!subject) {
      return new Response(
        JSON.stringify({ error: 'Subject is required' }),
        { status: 400, headers: corsHeaders }
      )
    }
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid email format: ${invalidEmails.join(', ')}` }),
        { status: 400, headers: corsHeaders }
      )
    }

    // @ts-ignore - Deno global is available in runtime
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY environment variable is required')
    }

    // Send emails using Brevo HTTP API
    const results = []
    for (const email of emails) {
      try {
        // Use provided content if it exists and contains HTML, otherwise use default template
        const htmlContent = content.includes('<') && content.includes('>') ? content : getDefaultBulkEmailTemplate(email, subject, content)
        
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
            htmlContent: htmlContent
          }),
        })

        if (emailResponse.ok) {
          results.push({ email, status: 'success' })
        } else {
          const errorData = await emailResponse.text()
          results.push({ email, status: 'error', error: errorData })
          console.error(`Failed to send to ${email}:`, errorData)
        }
      } catch (error: any) {
        results.push({ email, status: 'error', error: error.message })
        console.error(`Error sending to ${email}:`, error)
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const failureCount = results.length - successCount

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bulk email processed: ${successCount} sent, ${failureCount} failed`,
        total_emails: emails.length,
        successful: successCount,
        failed: failureCount,
        results: results,
        processed_at: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('Error in sendBulkEmail function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
}

// @ts-ignore - Deno global is available in runtime
serve(handler)

function getDefaultBulkEmailTemplate(email: string, subject: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
    }
    .feature-title::after { content: '.'; color: #86100E; }
    
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
        <h1 class="hero-title">${subject}<span class="dot">.</span></h1>
      </div>
      
      <div class="content">
        <div class="sub-headline">Smarter healthcare access.</div>
        <div class="body-text">${content}</div>
        
        <div class="section-divider"></div>
        
        <h2 class="feature-title">What happens next</h2>
        
        <div class="feature-text">
          <p style="margin-bottom: 20px;">iVisit is preparing for launch.</p>
          <p style="margin-bottom: 20px;">You'll receive early access and essential updates only.</p>
          <p style="margin-bottom: 20px;">Availability notifications will follow.</p>
        </div>
      
        <div class="cta-container">
          <a href="https://www.ivisit.ng" class="cta-button">Explore iVisit</a>
        </div>
      </div>
      
      <div class="footer">
        <p class="footer-text">© 2026 iVisit Global. All rights reserved.</p>
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
