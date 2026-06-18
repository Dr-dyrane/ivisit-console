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
} from '../services/profilesService';

export function useProfiles() {
  const [state, setState] = useState({
    profiles: [],
    currentProfile: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setProfiles = useCallback((profiles) => {
    setState((prev) => ({ ...prev, profiles }));
  }, []);

  const setCurrentProfile = useCallback((profile) => {
    setState((prev) => ({ ...prev, currentProfile: profile }));
  }, []);

  const fetchProfiles = useCallback(
    async (filter) => {
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
    async (profileId) => {
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
    async (email) => {
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
    async (role) => {
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
    async (type) => {
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
    async (input) => {
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
    async (profileId, input) => {
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
    async (profileId) => {
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
    async (profileId, url) => {
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
    (profileId, callback) => {
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
