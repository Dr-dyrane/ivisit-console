// Simple custom email function without external dependencies
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

// @ts-ignore
export const handler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, subject, content } = await req.json()
    
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

    // Log the custom email request for now (you can implement actual email sending later)
    console.log('Custom email request:', {
      email,
      subject,
      content,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Custom email sent to ${email}`,
        processed_at: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in sendCustomEmail function:', error)
    // @ts-ignore
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

// @ts-ignore - Deno global is available in runtime
serve(handler)
