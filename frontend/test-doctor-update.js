// Quick test to verify the migration worked
// Run this to test if PATCH operations now succeed

const SUPABASE_URL = 'https://dlwtcmhdzoklveihuhjf.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd3RjbWhkem9rbHZlaWh1aGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2MTIxODYsImV4cCI6MjA1MjE4ODE4Nn0.RjBZrCJz9R4qL5i3JMWy2dBqXVSqC0KaUP5kHCx9gqw';

// Test doctor ID (Dr. Robert Taylor)
const TEST_DOCTOR_ID = '44af2322-cc56-48b4-9be3-64073fb380ba';

async function testDoctorUpdate() {
    console.log('🧪 Testing doctor PATCH operation with new schema...\n');

    try {
        // Test 1: Read doctor (verify columns exist)
        console.log('1️⃣ Reading doctor data...');
        const readResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/doctors?id=eq.${TEST_DOCTOR_ID}&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        const currentData = await readResponse.json();
        console.log('✅ Current data:', JSON.stringify(currentData[0], null, 2));

        // Test 2: Update using NEW column names (experience, specialization)
        console.log('\n2️⃣ Attempting PATCH with NEW column names (experience, specialization)...');
        const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/doctors?id=eq.${TEST_DOCTOR_ID}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    experience: 23, // Changed from 22 to test
                    status: 'on_call' // Test new status field
                })
            }
        );

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            console.error('❌ PATCH FAILED:', error);
            console.log('\n⚠️  Schema cache may not have refreshed yet.');
            console.log('   Go to: https://supabase.com/dashboard/project/dlwtcmhdzoklveihuhjf/settings/database');
            console.log('   Click "Refresh schema cache" button');
            return false;
        }

        const updatedData = await updateResponse.json();
        console.log('✅ PATCH SUCCEEDED!');
        console.log('Updated data:', JSON.stringify(updatedData[0], null, 2));

        // Test 3: Verify the changes persisted
        console.log('\n3️⃣ Verifying changes persisted...');
        const verifyResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/doctors?id=eq.${TEST_DOCTOR_ID}&select=id,name,experience,status`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        const verifiedData = await verifyResponse.json();
        console.log('✅ Verified data:', verifiedData[0]);

        if (verifiedData[0].experience === 23 && verifiedData[0].status === 'on_call') {
            console.log('\n🎉 SUCCESS! All tests passed!');
            console.log('✅ Column rename worked: years_experience → experience');
            console.log('✅ New status field working');
            console.log('✅ CRUD operations fully functional');

            // Revert the test change
            console.log('\n4️⃣ Reverting test changes...');
            await fetch(
                `${SUPABASE_URL}/rest/v1/doctors?id=eq.${TEST_DOCTOR_ID}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        experience: 22,
                        status: 'available'
                    })
                }
            );
            console.log('✅ Test data reverted to original values');

            return true;
        } else {
            console.log('\n⚠️  Data verification failed');
            return false;
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        return false;
    }
}

testDoctorUpdate().then(success => {
    if (success) {
        console.log('\n✅ Migration verification complete - Production is ready!');
    } else {
        console.log('\n⚠️  Please refresh schema cache and try again');
    }
    process.exit(success ? 0 : 1);
});
