/**
 * Profiles service compatibility facade.
 *
 * Keep application imports on this path while profile ownership remains split
 * into focused read, command, storage, and realtime modules.
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { withRetry } from './supabaseHelpers';
import {
  EMERGENCY_PATIENT_OPTION_LIMIT,
  PROFILE_TABLE_NAME,
} from './profiles/constants';

export {
  getProfile,
  getProfileByEmail,
  getProfiles,
  getProfilesByRole,
  getProvidersByType,
  getUserStatistics,
  searchUsers,
} from './profiles/profileReads';
export { getUsersPage } from './profiles/usersPageRead';
export {
  createProfile,
  updateProfile,
  updateProfileAvatar,
  verifyProfileBVN,
} from './profiles/profileMutations';
export {
  discardUnpersistedProfileAvatar,
  uploadProfileAvatar,
} from './profiles/avatarStorage';
export { subscribeToProfile } from './profiles/profileRealtime';

/**
 * Return the bounded patient identity projection used by the emergency request
 * form. This remains in the facade while the Requests work pack owns its source
 * contract; the public query, scope, and error behavior are unchanged.
 */
export async function getEmergencyPatientOptions() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !['admin', 'org_admin'].includes(currentUser.role)) {
    throw new Error('Patient lookup is unavailable for this account.');
  }
  if (currentUser.role === 'org_admin' && !currentUser.organization_id) {
    throw new Error('Your organization scope is not available.');
  }

  const { data, error, count } = await withRetry(async () => {
    let query = supabase
      .from(PROFILE_TABLE_NAME)
      .select('id, username, full_name, phone, avatar_url', { count: 'exact' })
      .eq('role', 'patient')
      .order('username', { ascending: true })
      .limit(EMERGENCY_PATIENT_OPTION_LIMIT);

    if (currentUser.role === 'org_admin') {
      query = query.eq('organization_id', currentUser.organization_id);
    }

    const result = await query;
    if (result.error) throw result.error;
    return result;
  });
  if (error) throw error;

  const options = data || [];
  return {
    data: options,
    count: Number.isFinite(count) ? count : options.length,
    isPartial: Number.isFinite(count) && count > options.length,
    limit: EMERGENCY_PATIENT_OPTION_LIMIT,
  };
}
