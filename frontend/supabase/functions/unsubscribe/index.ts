// Unsubscribe Edge Function using Brevo HTTP API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

interface UnsubscribePayload {
  email?: string
}

// @ts-ignore
export const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Handle both GET (from email link) and POST (from API)
    let email: string | null | undefined
    
    if (req.method === 'GET') {
      const url = new URL(req.url)
      email = url.searchParams.get('email')
    } else {
      const { email: emailFromBody }: UnsubscribePayload = await req.json()
      email = emailFromBody
    }
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Update subscriber record to mark as unsubscribed
    // @ts-ignore - Deno global is available in runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore - Deno global is available in runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseClient = createClient(supabaseUrl!, supabaseServiceKey!)

    const { data: subscriber, error: fetchError } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('email', email)
      .single()

    if (fetchError || !subscriber) {
      // Return success even if not found (to prevent enumeration)
      return getUnsubscribeResponse(email!, 'not_found')
    }

    // Update subscriber to unsubscribed status
    const { error: updateError } = await supabaseClient
      .from('subscribers')
      .update({ 
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        new_user: false
      })
      .eq('email', email)

    if (updateError) {
      console.error('Failed to update subscriber:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to process unsubscribe request' }),
        { status: 500, headers: corsHeaders }
      )
    }

    return getUnsubscribeResponse(email!, 'success')

  } catch (error: any) {
    console.error('Error in unsubscribe function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

function getUnsubscribeResponse(email: string, status: 'success' | 'not_found'): Response {
  const html = getUnsubscribePage(email, status)
  
  if (status === 'not_found') {
    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })
  }

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/html' }
  })
}

function getUnsubscribePage(email: string, status: 'success' | 'not_found'): string {
  const isSuccess = status === 'success'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSuccess ? 'Successfully Unsubscribed' : 'Unsubscribe'}</title>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      background: #f8f9fa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { 
      max-width: 500px; 
      margin: 40px 20px; 
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #86100E 0%, #B71C1C 100%); 
      padding: 40px 30px; 
      text-align: center; 
      color: white;
    }
    .logo { 
      height: 50px; 
      margin-bottom: 15px;
      filter: brightness(0) invert(1);
    }
    .title { 
      margin: 0; 
      font-size: 24px; 
      font-weight: 700;
    }
    .content { 
      padding: 40px 30px; 
      text-align: center;
    }
    .icon { 
      font-size: 48px; 
      margin-bottom: 20px;
    }
    .success-icon { color: #28a745; }
    .error-icon { color: #dc3545; }
    .message { 
      font-size: 18px; 
      color: #333; 
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .email { 
      background: #f8f9fa; 
      padding: 12px 16px; 
      border-radius: 8px; 
      font-family: monospace; 
      font-size: 14px;
      margin: 20px 0;
      border: 1px solid #e9ecef;
    }
    .actions { 
      margin-top: 30px; 
    }
    .btn { 
      display: inline-block; 
      padding: 12px 24px; 
      background: #86100E; 
      color: white; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 600;
      margin: 0 8px;
      transition: all 0.2s ease;
    }
    .btn:hover { 
      background: #6a0d0b; 
      transform: translateY(-1px);
    }
    .btn-secondary { 
      background: #6c757d; 
    }
    .btn-secondary:hover { 
      background: #5a6268; 
    }
    .footer { 
      padding: 20px 30px; 
      text-align: center; 
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      font-size: 14px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.ivisit.ng/logo.png" alt="iVisit" class="logo">
      <h1 class="title">${isSuccess ? 'Successfully Unsubscribed' : 'Unsubscribe'}</h1>
    </div>
    
    <div class="content">
      ${isSuccess ? 
        `<div class="icon success-icon">✓</div>
         <div class="message">
           You have been successfully unsubscribed from iView emails.
         </div>
         <div class="email">${email}</div>
         <div class="actions">
           <a href="https://www.ivisit.ng" class="btn">Visit Website</a>
           <a href="https://www.ivisit.ng/dashboard" class="btn btn-secondary">Dashboard</a>
         </div>` :
        `<div class="icon error-icon">✕</div>
         <div class="message">
           We couldn't find your email address in our system.
         </div>
         <div class="email">${email}</div>
         <div class="actions">
           <a href="https://www.ivisit.ng" class="btn">Visit Website</a>
           <a href="mailto:support@ivisit.ng" class="btn btn-secondary">Contact Support</a>
         </div>`
      }
    </div>
    
    <div class="footer">
      <p>© 2026 iVisit. All rights reserved.</p>
      <p>Need help? Contact us at <a href="mailto:support@ivisit.ng">support@ivisit.ng</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// @ts-ignore - Deno global is available in runtime
serve(handler)
