import { useCallback } from 'react';
import {
  discardUnpersistedProfileAvatar,
  updateProfile as updateProfileService,
  uploadProfileAvatar,
} from '../../services/profilesService';
import { updatePassword as updatePasswordService } from '../../services/authService';

export const useAuthProfileActions = ({ user, setProfileState }) => {
  const updateProfile = useCallback(async (updates) => {
    if (!user) throw new Error('No user logged in');
    const data = await updateProfileService(user.id, updates);
    setProfileState(data);
    return data;
  }, [setProfileState, user]);

  const uploadAvatar = useCallback(async (file) => {
    if (!user) throw new Error('No user logged in');
    return uploadProfileAvatar(user.id, file);
  }, [user]);

  const discardAvatarUpload = useCallback(async (upload) => {
    if (!user) throw new Error('No user logged in');
    return discardUnpersistedProfileAvatar(user.id, upload);
  }, [user]);

  const updatePassword = useCallback(
    async (password) => updatePasswordService(password),
    [],
  );

  return { updateProfile, uploadAvatar, discardAvatarUpload, updatePassword };
};
