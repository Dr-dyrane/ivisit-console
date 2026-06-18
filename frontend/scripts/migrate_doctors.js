const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback to .env

// Note: This script assumes SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are available
// in environment variables or hardcoded for the migration session.

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Required environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing.');
    console.error('Please run this script with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate_doctors.js');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateDoctors() {
    console.log('Starting Doctor to User Migration...');

    // 1. Fetch unlinked doctors
    const { data: doctors, error } = await supabase
        .from('doctors')
        .select('*')
        .is('profile_id', null);

    if (error) {
        console.error('Error fetching doctors:', error);
        return;
    }

    console.log(`Found ${doctors.length} unlinked doctors.`);

    for (const doc of doctors) {
        try {
            console.log(`Processing Dr. ${doc.name}...`);

            // Generate email matching the convention or use existing if we had one
            // Since 'doctors' table usually didn't have email in the old schema, we generate one.
            // Format: firstname.lastname.doc@ivisit.bg (sanitized)
            const sanitizedName = doc.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
            const email = `${sanitizedName}.doc@ivisit.bg`;
            const password = 'TempPassword123!'; // Default temp password

            // 2. Create Auth User
            const { data: userData, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    full_name: doc.name,
                    role: 'provider',
                    provider_type: 'doctor',
                    organization_id: doc.hospital_id
                }
            });

            if (createError) {
                console.error(`  Failed to create user for ${doc.name}:`, createError.message);
                continue;
            }

            const userId = userData.user.id;
            console.log(`  Created User: ${userId} (${email})`);

            // 3. Create Profile (If not auto-created by triggers)
            // Check if trigger created it?
            const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', userId).single();

            if (!profileCheck) {
                // Create profile manually if trigger didn't fire
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: userId,
                    email: email,
                    full_name: doc.name,
                    role: 'provider',
                    provider_type: 'doctor',
                    organization_id: doc.hospital_id,
                    image_uri: doc.image
                });
                if (profileError) {
                    console.error(`  Failed to create profile:`, profileError.message);
                    // Cleanup auth user?
                    continue;
                }
                console.log(`  Created Profile.`);
            } else {
                console.log(`  Profile already exists (Trigger). Updating details...`);
                // Update profile with doc details if needed
                await supabase.from('profiles').update({
                    organization_id: doc.hospital_id,
                    provider_type: 'doctor',
                    image_uri: doc.image || undefined
                }).eq('id', userId);
            }

            // 4. Link Doctor Record
            const { error: linkError } = await supabase
                .from('doctors')
                .update({ profile_id: userId })
                .eq('id', doc.id);

            if (linkError) {
                console.error(`  Failed to link doctor record:`, linkError.message);
            } else {
                console.log(`  SUCCESS: Linked Dr. ${doc.name} to User ${userId}`);
            }

        } catch (err) {
            console.error(`  Unexpected error for ${doc.name}:`, err);
        }
    }

    console.log('Migration Complete.');
}

migrateDoctors();
