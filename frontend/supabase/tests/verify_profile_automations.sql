
-- 1. Create a simulated new user
INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud
) VALUES (
    'test-user-001',
    'test_new_user@ivisit.com',
    '{\
full_name\: \Test
User\, \avatar_url\: \https://example.com/avatar.png\}',
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
);

-- 2. Verify Profile Exists with Meta Data
SELECT id, full_name, avatar_url, image_uri, role FROM public.profiles WHERE id = 'test-user-001';

-- 3. Verify Wallet Exists
SELECT id, balance FROM public.patient_wallets WHERE user_id = 'test-user-001';

-- 4. Verify Preferences Exist
SELECT user_id, notification_sounds_enabled FROM public.preferences WHERE user_id = 'test-user-001';

-- 5. Cleanup (Uncomment to keep data)
-- DELETE FROM auth.users WHERE id = 'test-user-001';

