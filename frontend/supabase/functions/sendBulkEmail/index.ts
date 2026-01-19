// Simple bulk email function without external dependencies
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

    // Log the bulk email request for now (you can implement actual email sending later)
    console.log('Bulk email request:', {
      emails,
      subject,
      content,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bulk email processed for ${emails.length} recipients`,
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
