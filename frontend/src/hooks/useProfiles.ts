/**
 * useProfiles Hook
 * Manages profiles data and operations using profilesService
 */

import { useState, useCallback } from 'react';
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  getProfileByEmail,
  getProfilesByRole,
  getProvidersByType,
  verifyProfileBVN,
  updateProfileAvatar,
  subscribeToProfile,
  ProfileFilter,
  CreateProfileInput,
  UpdateProfileInput,
} from '../services/profilesService';
import { Profile } from '../types/index';

interface UseProfilesState {
  profiles: Profile[];
  currentProfile: Profile | null;
  loading: boolean;
  error: string | null;
}

interface UseProfilesReturn extends UseProfilesState {
  fetchProfiles: (filter?: ProfileFilter) => Promise<void>;
  fetchProfile: (profileId: string) => Promise<Profile | null>;
  fetchProfileByEmail: (email: string) => Promise<Profile | null>;
  fetchProfilesByRole: (role: string) => Promise<void>;
  fetchProvidersByType: (type: string) => Promise<void>;
  addProfile: (input: CreateProfileInput) => Promise<Profile | null>;
  editProfile: (profileId: string, input: UpdateProfileInput) => Promise<Profile | null>;
  setCurrentProfile: (profile: Profile | null) => void;
  verifyBVN: (profileId: string) => Promise<Profile | null>;
  updateAvatar: (profileId: string, url: string) => Promise<Profile | null>;
  subscribe: (profileId: string, callback: (profile: Profile) => void) => (() => void) | null;
}

export function useProfiles(): UseProfilesReturn {
  const [state, setState] = useState<UseProfilesState>({
    profiles: [],
    currentProfile: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setProfiles = useCallback((profiles: Profile[]) => {
    setState((prev) => ({ ...prev, profiles }));
  }, []);

  const setCurrentProfile = useCallback((profile: Profile | null) => {
    setState((prev) => ({ ...prev, currentProfile: profile }));
  }, []);

  const fetchProfiles = useCallback(
    async (filter?: ProfileFilter) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProfiles(filter);
        setProfiles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setProfiles]
  );

  const fetchProfile = useCallback(
    async (profileId: string): Promise<Profile | null> => {
      try {
        setError(null);
        const profile = await getProfile(profileId);
        if (profile) {
          setCurrentProfile(profile);
        }
        return profile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        return null;
      }
    },
    [setError, setCurrentProfile]
  );

  const fetchProfileByEmail = useCallback(
    async (email: string): Promise<Profile | null> => {
      try {
        setError(null);
        const profile = await getProfileByEmail(email);
        if (profile) {
          setCurrentProfile(profile);
        }
        return profile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        return null;
      }
    },
    [setError, setCurrentProfile]
  );

  const fetchProfilesByRole = useCallback(
    async (role: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProfilesByRole(role);
        setProfiles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profiles by role');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setProfiles]
  );

  const fetchProvidersByType = useCallback(
    async (type: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProvidersByType(type);
        setProfiles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch providers');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setProfiles]
  );

  const addProfile = useCallback(
    async (input: CreateProfileInput): Promise<Profile | null> => {
      try {
        setError(null);
        const profile = await createProfile(input);
        setProfiles((prev) => [profile, ...prev]);
        return profile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create profile');
        return null;
      }
    },
    [setError, setProfiles]
  );

  const editProfile = useCallback(
    async (profileId: string, input: UpdateProfileInput): Promise<Profile | null> => {
      try {
        setError(null);
        const profile = await updateProfile(profileId, input);
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? profile : p)));
        if (state.currentProfile?.id === profileId) {
          setCurrentProfile(profile);
        }
        return profile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update profile');
        return null;
      }
    },
    [setError, setProfiles, state.currentProfile]
  );

  const verifyBVN = useCallback(
    async (profileId: string): Promise<Profile | null> => {
      try {
        setError(null);
        const profile = await verifyProfileBVN(profileId);
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? profile : p)));
        if (state.currentProfile?.id === profileId) {
          setCurrentProfile(profile);
        }
        return profile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify BVN');
        return null;
      }
    },
    [setError, setProfiles, state.currentProfile]
  );

  const updateAvatar = useCallback(
    async (profileId: string, url: string): Promise<Profile | null> => {
      try {
        setError(null);
        const profile = await updateProfileAvatar(profileId, url);
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? profile : p)));
        if (state.currentProfile?.id === profileId) {
          setCurrentProfile(profile);
        }
        return profile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update avatar');
        return null;
      }
    },
    [setError, setProfiles, state.currentProfile]
  );

  const subscribe = useCallback(
    (profileId: string, callback: (profile: Profile) => void): (() => void) | null => {
      try {
        return subscribeToProfile(profileId, callback);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe');
        return null;
      }
    },
    [setError]
  );

  return {
    ...state,
    fetchProfiles,
    fetchProfile,
    fetchProfileByEmail,
    fetchProfilesByRole,
    fetchProvidersByType,
    addProfile,
    editProfile,
    setCurrentProfile,
    verifyBVN,
    updateAvatar,
    subscribe,
  };
}
