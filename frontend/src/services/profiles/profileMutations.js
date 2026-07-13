import { supabase } from '../../lib/supabase';
import { withAudit } from '../supabaseHelpers';
import { PROFILE_TABLE_NAME, SELF_EDITABLE_FIELDS } from './constants';
import {
  buildProfileCreatePayload,
  buildProfileUpdatePayload,
  normalizeRestrictedProfileField,
  toAdminProfilePayload,
} from './normalization';
import { getProfile } from './profileReads';

export async function createProfile(input) {
  try {
    const payload = buildProfileCreatePayload(input);

    const data = await withAudit(
      'profile.create',
      'profile',
      async () => {
        const result = await supabase
          .from(PROFILE_TABLE_NAME)
          .insert([payload])
          .select()
          .single();

        if (result.error) throw result.error;
        return result.data;
      },
      { role: payload.role }
    );

    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
}

export async function updateProfile(profileId, input) {
  try {
    if (input.email !== undefined) {
      const requestedEmail = String(input.email || '').trim().toLowerCase();
      const { data: targetIdentity, error: identityError } = await supabase
        .from(PROFILE_TABLE_NAME)
        .select('email')
        .eq('id', profileId)
        .maybeSingle();
      if (identityError) throw identityError;
      if (
        !targetIdentity ||
        requestedEmail !== String(targetIdentity.email || '').trim().toLowerCase()
      ) {
        throw new Error('Email changes use account security.');
      }
    }

    const payload = buildProfileUpdatePayload(input);
    payload.updated_at = new Date().toISOString();

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    const isSelfUpdate = currentUser?.id === profileId;
    const restrictedSelfFields = Object.keys(payload).filter(
      (field) => !SELF_EDITABLE_FIELDS.has(field)
    );
    let hasRestrictedSelfFields = restrictedSelfFields.length > 0;

    if (isSelfUpdate && hasRestrictedSelfFields) {
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from(PROFILE_TABLE_NAME)
        .select('role, organization_id, provider_type, bvn_verified')
        .eq('id', profileId)
        .single();
      if (currentProfileError) throw currentProfileError;

      const changedRestrictedFields = restrictedSelfFields.filter(
        (field) =>
          normalizeRestrictedProfileField(field, payload[field]) !==
          normalizeRestrictedProfileField(field, currentProfile[field])
      );

      restrictedSelfFields
        .filter((field) => !changedRestrictedFields.includes(field))
        .forEach((field) => delete payload[field]);

      if (changedRestrictedFields.length > 0 && currentProfile.role !== 'admin') {
        throw new Error('Access settings require another administrator.');
      }
      hasRestrictedSelfFields = changedRestrictedFields.length > 0;
    }

    return await withAudit(
      'profile.update',
      'profile',
      async () => {
        if (isSelfUpdate && !hasRestrictedSelfFields) {
          const { data, error } = await supabase
            .from(PROFILE_TABLE_NAME)
            .update(payload)
            .eq('id', profileId)
            .select()
            .single();

          if (error) throw error;
          return data;
        }

        const { data, error } = await supabase.rpc('update_profile_by_admin', {
          target_user_id: profileId,
          profile_data: toAdminProfilePayload(payload),
        });

        if (error) throw error;
        return data;
      },
      { entityId: profileId, self: isSelfUpdate }
    );
  } catch (error) {
    console.error(`Error updating profile ${profileId}:`, error);
    throw error;
  }
}

export async function verifyProfileBVN(profileId) {
  try {
    await withAudit(
      'profile.verify_bvn',
      'profile',
      async () => {
        const { error } = await supabase.rpc('update_profile_by_admin', {
          target_user_id: profileId,
          profile_data: { bvn_verified: true },
        });

        if (error) throw error;
        return { id: profileId };
      },
      { entityId: profileId }
    );

    return await getProfile(profileId);
  } catch (error) {
    console.error(`Error verifying profile BVN ${profileId}:`, error);
    throw error;
  }
}

export async function updateProfileAvatar(profileId, avatarUrl) {
  try {
    const data = await withAudit(
      'profile.update_avatar',
      'profile',
      async () => {
        const result = await supabase
          .from(PROFILE_TABLE_NAME)
          .update({
            image_uri: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profileId)
          .select()
          .single();

        if (result.error) throw result.error;
        return result.data;
      },
      { entityId: profileId }
    );

    return data;
  } catch (error) {
    console.error(`Error updating profile avatar ${profileId}:`, error);
    throw error;
  }
}
