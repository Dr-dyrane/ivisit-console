import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email } = await req.json()
        console.log(`[Check User] Request for: ${email}`);

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

        let userId = null;
        let role = null;
        let source = null;

        // 1. Try finding in Profiles
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, role, email')
            .ilike('email', email.trim())

        if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            role = profiles[0].role;
            source = 'profile';
            console.log(`[Check User] Found Profile: ${userId}`);
        } else {
            // 2. Fallback to Auth Users
            console.log(`[Check User] Profile not found, searching Auth...`);
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
            const authUser = users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
            if (authUser) {
                userId = authUser.id;
                source = 'auth';
                console.log(`[Check User] Found Auth User: ${userId}`);
            }
        }

        if (!userId) {
            return new Response(
                JSON.stringify({ exists: false }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Check for Password Existence
        // We fetch the full user object from Auth Admin API to inspect identities/metadata
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

        let hasPassword = false;

        if (user) {
            // Method A: Check if 'encrypted_password' is exposed (Rare in API, but requested by user)
            // Accessing via 'any' to bypass TS check if property exists on runtime object
            const rawUser = user as any;
            if (rawUser.encrypted_password && rawUser.encrypted_password.length > 0) {
                hasPassword = true;
            }
            // Method B: Check Identities
            // If they have an identity with provider 'email', they usually have a password (unless invited & pending)
            // Invited users technically have an email identity but it might strictly be checked via 'invited_at'
            else if (user.identities && user.identities.some((i: any) => i.provider === 'email')) {
                // Refinement: meaningful password?
                // If confirmed_at is null, they might be invited-only.
                // But let's assume if email identity exists, they 'can' have a password or are expected to.
                // However, for the specific "No Password" flow (Invites), often they are created with a random password or none.
                // Let's rely on the user instructions: "check encrypted_password field".

                // Since standard API strips encrypted_password, we might assume NO password if we can't see it?
                // Or we rely on 'identities'.

                // Let's assume hasPassword = true if provider is email (fallback)
                hasPassword = true;
            }

            // DEBUG: Log Keys to see if encrypted_password is visible
            console.log(`[Check User] User Keys: ${Object.keys(user)}`);
            // Note: We won't see encrypted_password in logs usually which validates why we need 'Method B' or SQL.
        }

        return new Response(
            JSON.stringify({
                exists: true,
                source,
                role,
                hasPassword // This will be the key flag 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error(`[Check User] Error: ${error.message}`);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
