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
