import { supabase } from '../../lib/supabase';
import { withRetry } from '../supabaseHelpers';
import { PROFILE_AVATAR_BUCKET, PROFILE_TABLE_NAME } from './constants';

export async function uploadProfileAvatar(userId, file) {
  let uploadedPath = null;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_AVATAR_BUCKET)
      .upload(filePath, file);

    if (uploadError) throw uploadError;
    uploadedPath = filePath;

    const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);

    if (!data?.publicUrl) throw new Error('Avatar URL is unavailable after upload');

    return {
      bucket: PROFILE_AVATAR_BUCKET,
      path: filePath,
      publicUrl: data.publicUrl,
    };
  } catch (error) {
    if (uploadedPath) {
      try {
        await withRetry(async () => {
          const result = await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([uploadedPath]);
          if (result.error) throw result.error;
          return result;
        });
      } catch (cleanupError) {
        console.error('Error cleaning up incomplete avatar upload:', cleanupError);
      }
    }
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

export async function discardUnpersistedProfileAvatar(userId, upload) {
  const uploadPath = upload?.path;
  const publicUrl = upload?.publicUrl;
  const ownsPath = typeof uploadPath === 'string' && uploadPath.startsWith(`${userId}/`);

  if (!userId || upload?.bucket !== PROFILE_AVATAR_BUCKET || !ownsPath || !publicUrl) {
    throw new Error('Avatar cleanup scope is invalid');
  }

  const { data: currentProfile } = await withRetry(async () => {
    const result = await supabase
      .from(PROFILE_TABLE_NAME)
      .select('image_uri, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) throw new Error('Profile avatar state is unavailable');
    return result;
  });

  if ([currentProfile.image_uri, currentProfile.avatar_url].includes(publicUrl)) {
    return { removed: false, reason: 'persisted' };
  }

  await withRetry(async () => {
    const result = await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([uploadPath]);
    if (result.error) throw result.error;
    return result;
  });

  return { removed: true, reason: 'unpersisted' };
}
