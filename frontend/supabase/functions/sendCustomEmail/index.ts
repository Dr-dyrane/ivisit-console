// Simple custom email function using Brevo HTTP API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

interface CustomEmailPayload {
  email: string
  subject: string
  content: string
}

// @ts-ignore
export const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, subject, content }: CustomEmailPayload = await req.json()
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
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
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // @ts-ignore - Deno global is available in runtime
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY environment variable is required')
    }

    // Send email using Brevo HTTP API
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
        htmlContent: content
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('Brevo API error:', errorData)
      throw new Error(`Failed to send email: ${errorData}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Custom email sent to ${email}`,
        processed_at: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('Error in sendCustomEmail function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

// @ts-ignore - Deno global is available in runtime
serve(handler)
