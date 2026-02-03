/**
 * @fileoverview Onboarding Service - Backend integration for organization registration
 * 
 * @description
 * Handles all backend operations for the onboarding flow:
 * - Organization creation in 'hospitals' table
 * - Admin user creation via Supabase Auth
 * - Profile creation with org_admin role
 * - Document upload to Supabase Storage
 * - Admin functions for verification queue
 * 
 * @database_requirements
 * - Table: hospitals (with fields for organization_type, verification_status, etc.)
 * - Table: profiles (with fields for role, organization_id)
 * - Storage bucket: documents
 * 
 * @environment
 * - REACT_APP_SUPABASE_URL: Supabase project URL
 * 
 * @rollback
 * To revert: git checkout HEAD~1 -- src/services/onboardingService.js
 * 
 * @author iVisit Console Team
 * @version 1.0.0
 * @since 2026-02-02
 */

import { supabase } from "../lib/supabase";

/**
 * Supabase project URL from environment
 * @constant {string}
 */
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;

/**
 * Onboarding service object with all registration functions
 * @namespace onboardingService
 */
export const onboardingService = {
    /**
     * Step 2: Create admin account and set onboarding_status = 'pending'
     * If user already has a session (e.g., page refresh), skip creation.
     * 
     * @param {Object} formData - Admin account form data
     * @returns {Object} - { success: boolean, user: object, skipped: boolean }
     */
    createAdminAccount: async (formData) => {
        try {
            // Check if user is already authenticated (e.g., refreshed during onboarding)
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log('[Onboarding] User already authenticated, skipping account creation');
                return {
                    success: true,
                    user: session.user,
                    skipped: true,
                    message: 'Already authenticated'
                };
            }

            // Sign up the admin user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.adminEmail,
                password: formData.adminPassword,
                options: {
                    data: {
                        full_name: formData.adminFullName,
                    }
                }
            });

            if (authError) {
                console.error('Admin user creation failed:', authError);
                // Handle common Supabase auth errors gracefully
                const errorMessages = {
                    'User already registered': 'This email is already registered. Please use a different email or try logging in.',
                    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
                    'Unable to validate email address': 'Please enter a valid email address.',
                    'Signup is disabled': 'Registration is temporarily unavailable. Please try again later.',
                    'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes and try again.',
                    'over_email_send_rate_limit': 'Too many attempts. Please wait a few minutes and try again.',
                };
                const userMessage = errorMessages[authError.message] ||
                    errorMessages[authError.code] ||
                    `Account creation failed: ${authError.message}`;
                throw new Error(userMessage);
            }

            // Wait for profile trigger to create profile
            await new Promise(resolve => setTimeout(resolve, 500));

            // Set onboarding_status = 'pending' to enable hospital creation via RLS
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.adminFullName,
                        onboarding_status: 'pending',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    console.error('Profile update failed:', profileError);
                    // Don't throw - user is created, profile can be fixed later
                }
            }

            return {
                success: true,
                user: authData.user,
                skipped: false,
                message: 'Admin account created successfully'
            };

        } catch (error) {
            console.error('Admin account creation failed:', error);
            // Re-throw with user-friendly message if not already formatted
            if (error.message?.includes('fetch') || error.message?.includes('network')) {
                throw new Error('Network error. Please check your connection and try again.');
            }
            throw error;
        }
    },

    /**
     * Step 5: Submit complete onboarding - creates organization and links to user
     * User must be authenticated and have onboarding_status = 'pending'
     * 
     * @param {Object} formData - Complete onboarding form data
     * @returns {Object} - { success: boolean, organization: object }
     */
    submitOnboarding: async (formData) => {
        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                throw new Error('User must be authenticated to submit onboarding');
            }

            // Build full address from components
            const fullAddress = [
                formData.address,
                formData.city,
                formData.state
            ].filter(Boolean).join(', ');

            // Step 1: Create organization record in hospitals table
            const orgData = {
                name: formData.organizationName,
                address: fullAddress,
                phone: formData.phone,
                type: formData.organizationType || 'standard',
                specialties: formData.specialties || [],
                service_types: formData.serviceTypes || [],
                features: formData.features || [],
                available_beds: formData.bedCapacity || 0,
                ambulances_count: formData.fleetSize || 0,
                latitude: formData.location?.lat || null,
                longitude: formData.location?.lng || null,
                verification_status: 'pending',
                verified: false,
                status: 'available',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { data: organization, error: orgError } = await supabase
                .from('hospitals')
                .insert(orgData)
                .select()
                .single();

            if (orgError) {
                console.error('Organization creation failed:', orgError);
                throw new Error('Failed to create organization: ' + orgError.message);
            }

            // Step 2: Update profile with org_admin role and link to organization
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    role: 'org_admin',
                    organization_id: organization.id,
                    onboarding_status: 'complete', // Mark onboarding done
                    updated_at: new Date().toISOString(),
                })
                .eq('id', session.user.id);

            if (profileError) {
                console.error('Profile update failed:', profileError);
                // Don't delete hospital - admin can fix profile later
            }

            // Step 3: Upload verification documents (if any)
            if (formData.documents?.length > 0) {
                for (const doc of formData.documents) {
                    if (doc.file) {
                        const filePath = `organizations/${organization.id}/verification/${doc.name}`;
                        const { error: uploadError } = await supabase.storage
                            .from('documents')
                            .upload(filePath, doc.file);

                        if (uploadError) {
                            console.error('Document upload failed:', uploadError);
                        }
                    }
                }
            }

            // Step 4: Fetch display IDs
            const { getDisplayId } = await import('./displayIdService');
            const orgDisplayId = await getDisplayId(organization.id);
            const userDisplayId = await getDisplayId(session.user.id);

            return {
                success: true,
                organization: {
                    ...organization,
                    display_id: orgDisplayId
                },
                user: {
                    ...session.user,
                    display_id: userDisplayId
                },
                message: 'Registration submitted successfully'
            };

        } catch (error) {
            console.error('Onboarding submission failed:', error);
            throw error;
        }
    },

    /**
     * Check if email is already registered
     */
    checkEmailAvailability: async (email) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (error && error.code === 'PGRST116') {
                // No rows returned - email is available
                return { available: true };
            }

            return { available: false, message: 'Email already registered' };
        } catch (error) {
            console.error('Email check failed:', error);
            return { available: true }; // Assume available on error
        }
    },

    /**
     * Search hospitals by name for autocomplete
     * Returns matching hospitals with claim status
     * NOTE: Requires authenticated session (called after admin account step)
     * 
     * @important SCHEMA: Only these columns exist in hospitals table:
     * id, name, address, phone, rating, type, image, specialties, service_types,
     * features, emergency_level, available_beds, ambulances_count, wait_time,
     * price_range, latitude, longitude, verified, status, created_at, updated_at
     * 
     * @param {string} query - Search query (min 2 characters)
     * @returns {Promise<Array>} Matching hospitals with claim status
     */
    searchHospitalsByName: async (query) => {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            // ONLY query columns that exist in the schema!
            const { data, error } = await supabase
                .from('hospitals')
                .select('id, name, address, phone, latitude, longitude, specialties, verified, type, status')
                .ilike('name', `%${query}%`)
                .order('name')
                .limit(8);

            if (error) {
                console.error('Hospital search failed:', error);
                return [];
            }

            // Enrich with display IDs
            const { getDisplayIds } = await import('./displayIdService');
            const displayIds = await getDisplayIds(data.map(h => h.id));

            // Add claim status based on 'verified' boolean (only column that exists)
            // verified=true means hospital is claimed and verified
            // verified=false could be unclaimed OR pending (can't distinguish without more columns)
            return (data || []).map(hospital => ({
                ...hospital,
                display_id: displayIds.get(hospital.id) || null,
                // Parse city/state from address if needed (format: "street, city, state")
                city: hospital.address?.split(', ')[1] || '',
                state: hospital.address?.split(', ')[2] || '',
                // Claim status based on verified boolean only
                isClaimed: hospital.verified === true,
                isGoogleImported: false, // Can't determine without google_place_id column
                claimStatus: hospital.verified ? 'verified' : 'unclaimed',
            }));
        } catch (error) {
            console.error('Hospital search error:', error);
            return [];
        }
    },

    /**
     * Check detailed claim status of a specific hospital
     * Used when user selects a hospital from suggestions
     * 
     * @important SCHEMA: Only 'verified' boolean exists, no 'verification_status' column
     * - verified=true: Hospital is claimed and verified → BLOCK
     * - verified=false: Hospital is available → CAN CLAIM
     * 
     * @param {string} hospitalId - Hospital ID to check
     * @returns {Promise<Object>} Claim status details
     */
    checkHospitalClaimStatus: async (hospitalId) => {
        try {
            // Only query columns that exist!
            const { data: hospital, error } = await supabase
                .from('hospitals')
                .select('id, name, verified, status')
                .eq('id', hospitalId)
                .single();

            if (error) {
                console.error('Hospital claim check failed:', error);
                return { canClaim: false, error: 'Hospital not found' };
            }

            // Only 'verified' boolean exists - use it to determine claim status
            // verified=true means hospital is already claimed by a verified organization
            if (hospital.verified === true) {
                return {
                    canClaim: false,
                    reason: 'verified',
                    message: `${hospital.name} is already registered and verified.`,
                    hospital,
                };
            }

            // Hospital can be claimed (verified=false means unclaimed or never claimed)
            return {
                canClaim: true,
                reason: 'unclaimed',
                message: 'This hospital is available for registration.',
                hospital,
            };
        } catch (error) {
            console.error('Hospital claim check error:', error);
            return { canClaim: false, error: error.message };
        }
    },

    /**
     * Admin: Get pending organization registrations
     */
    getPendingOrganizations: async () => {
        try {
            const { data, error } = await supabase
                .from('hospitals')
                .select('*')
                .eq('verification_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to fetch pending organizations:', error);
            throw error;
        }
    },

    /**
     * Admin: Approve an organization
     */
    approveOrganization: async (organizationId) => {
        try {
            const { error } = await supabase
                .from('hospitals')
                .update({
                    verification_status: 'verified',
                    verified_at: new Date().toISOString()
                })
                .eq('id', organizationId);

            if (error) throw error;

            // Also update the org admin's profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ verification_status: 'verified' })
                .eq('organization_id', organizationId)
                .eq('role', 'org_admin');

            if (profileError) {
                console.error('Profile verification update failed:', profileError);
            }

            return { success: true };
        } catch (error) {
            console.error('Organization approval failed:', error);
            throw error;
        }
    },

    /**
     * Admin: Reject an organization
     */
    rejectOrganization: async (organizationId, reason) => {
        try {
            const { error } = await supabase
                .from('hospitals')
                .update({
                    verification_status: 'rejected',
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString()
                })
                .eq('id', organizationId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Organization rejection failed:', error);
            throw error;
        }
    },

    /**
     * Get organization verification status
     */
    getVerificationStatus: async (organizationId) => {
        try {
            const { data, error } = await supabase
                .from('hospitals')
                .select('verification_status, rejection_reason, verified_at, rejected_at')
                .eq('id', organizationId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to fetch verification status:', error);
            throw error;
        }
    }
};

export default onboardingService;
