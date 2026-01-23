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
        console.log(`[Check User v2] Request for: ${email}`);

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

        // 1. Find User ID
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, role, email')
            .ilike('email', email.trim())

        if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            role = profiles[0].role;
            source = 'profile';
        } else {
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
            const authUser = users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
            if (authUser) {
                userId = authUser.id;
                source = 'auth';
            }
        }

        if (!userId) {
            return new Response(
                JSON.stringify({ exists: false }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Fetch Fresh User Data
        // We explicitly call getUserById to get the latest state.
        // There shouldn't be caching on the admin API unless internal.
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

        let hasPassword = false;

        if (user) {
            // Method A: Check Encrypted Password (if exposed)
            const rawUser = user as any;

            // Log keys to debug explicitly
            console.log(`[Check User] Debug User Keys for ${userId}: ${Object.keys(rawUser)}`);

            // In newer Supabase versions, 'encrypted_password' might be hidden even from admin API
            // Checking for it specifically:
            if (rawUser.encrypted_password && rawUser.encrypted_password.length > 0) {
                console.log(`[Check User] Found encrypted_password field`);
                hasPassword = true;
            }

            // Method B: Check Identities
            // If they JUST set a password, they should have an 'email' identity.
            // We log the identities to see what's happening.
            if (user.identities) {
                console.log(`[Check User] Identities found: ${user.identities.map((i: any) => i.provider).join(', ')}`);

                const emailIdentity = user.identities.find((i: any) => i.provider === 'email');
                if (emailIdentity) {
                    // They have an email identity.
                    // This usually means they have a password.
                    // UNLESS: They are invited and haven't accepted? 
                    // If they just used "Reset Password", their account is confirmed and has a password.
                    hasPassword = true;
                    console.log(`[Check User] Email identity present -> hasPassword = true`);
                }
            }
        }

        // DEBUG: Force false if we suspect logic error in reading the object, but here we trust the logic.
        // If hasPassword is still false, then Supabase isn't reporting the password change yet or Method B is flawed.

        return new Response(
            JSON.stringify({
                exists: true,
                source,
                role,
                hasPassword
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
