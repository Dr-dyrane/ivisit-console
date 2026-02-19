import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

interface InviteUserPayload {
    email: string
    role: string
    metadata?: any
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase admin client for internal operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Optional: Check if caller is admin (if Authorization header provided)
        const authHeader = req.headers.get('Authorization')
        let user = null
        
        if (authHeader) {
            const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(
                authHeader.replace('Bearer ', '')
            )
            
            if (!authError && authUser) {
                user = authUser
                // Check if user.role === 'admin' in profiles
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                
                if (profile?.role !== 'admin') {
                    return new Response(
                        JSON.stringify({ error: 'Admin access required' }),
                        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }
                console.log(`Admin user ${user.email} inviting user`)
            }
        } else {
            console.warn("invite-user invoked without authentication - proceeding anyway")
        }

        const { email, role, metadata }: InviteUserPayload = await req.json()

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Generate Invite Link
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
                redirectTo: 'https://www.ivisit.ng/set-password', // Production URL
                data: {
                    role: role || 'viewer',
                    ...metadata
                }
            }
        })

        if (inviteError) {
            console.error('Invite link generation error:', inviteError)
            throw inviteError
        }

        if (!inviteData?.properties?.action_link) {
            console.error('Invalid invite data:', inviteData)
            throw new Error('Failed to generate invite link')
        }

        const { action_link } = inviteData.properties

        // For now, just return success without sending email to test
        return new Response(
            JSON.stringify({ 
                success: true, 
                message: 'User invited successfully',
                invite_link: action_link
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

        /*
        // 3. Send Email via Brevo (reusing logic from sendCustomEmail)
        // @ts-ignore
        const brevoApiKey = Deno.env.get('BREVO_API_KEY')
        if (!brevoApiKey) throw new Error('BREVO_API_KEY Missing')

        const htmlContent = getInviteTemplate(email, action_link)

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
                subject: `You're invited to join iVisit!`,
                htmlContent: htmlContent
            }),
        })

        if (!emailResponse.ok) {
            const errorData = await emailResponse.text()
            console.error('Brevo API error:', errorData)
            throw new Error(`Failed to send invite email: ${errorData}`)
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Invite sent successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        */

    } catch (error: any) {
        console.error('Invite Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

function getInviteTemplate(email: string, link: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    /* Apple-Inspired Design System with iVisit Brand Integration */
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, Arial, sans-serif; background-color: #f5f5f7; margin: 0; padding: 40px; }
    
    .card { background: white; max-width: 600px; margin: 0 auto; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); overflow: hidden; }
    
    .header { padding: 40px 40px 20px 40px; text-align: center; }
    .logo-img { height: 32px; width: auto; margin-bottom: 12px; }
    .logo-text { font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px; }
    .logo-text .dot { color: #86100E; } /* iVisit Red */
    
    .content { padding: 40px; text-align: center; color: #1d1d1f; }
    h1 { font-size: 32px; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; color: #1d1d1f; }
    h1 .dot { color: #86100E; }
    
    p { font-size: 17px; line-height: 1.6; color: #86868b; margin-bottom: 30px; }
    strong { color: #1d1d1f; font-weight: 600; }
    
    .btn { 
        display: inline-block; 
        background: #86100E; 
        color: white; 
        padding: 16px 40px; 
        border-radius: 99px; 
        text-decoration: none; 
        font-weight: 600; 
        font-size: 17px; 
        transition: transform 0.2s, background-color 0.2s; 
    }
    .btn:hover { transform: scale(1.02); background: #9e1310; }
    
    .footer { padding: 30px 40px; background-color: #fafafa; text-align: center; font-size: 12px; color: #86868b; border-top: 1px solid #f0f0f0; }
    .footer p { margin: 5px 0; font-size: 12px; }
    .footer-links { margin-top: 15px; }
    .footer-links a { color: #515154; text-decoration: none; margin: 0 10px; font-weight: 600; }
    .footer-links a:hover { color: #86100E; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="https://www.ivisit.ng/logo.png" alt="iVisit" class="logo-img">
      <div class="logo-text">iVisit<span class="dot">.</span></div>
    </div>
    
    <div class="content">
      <h1>You've been invited<span class="dot">.</span></h1>
      <p>An administrator has invited <strong>${email}</strong> to access the iVisit Console.<br>Click below to securely set up your credentials.</p>
      <a href="${link}" class="btn">Accept Invitation</a>
    </div>
    
    <div class="footer">
      <p>© 2026 iVisit Global. All rights reserved.</p>
      <p>Secure administrative access invitation.</p>
      <div class="footer-links">
        <a href="https://www.ivisit.ng/privacy">Privacy Policy</a>
        <a href="https://www.ivisit.ng/support">Support</a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
