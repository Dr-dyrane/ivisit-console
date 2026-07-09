import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DynamicAuthSkeleton } from '../components/ui/skeleton';
import { updateProfile as updateProfileService, uploadProfileAvatar } from '../services/profilesService';
import { clearCurrentUserCache, primeCurrentUserCache, updatePassword as updatePasswordService } from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Role hierarchy: admin > org_admin > sponsor > provider > viewer
const ROLE_HIERARCHY = {
  admin: 5,
  org_admin: 4,
  sponsor: 3,
  provider: 2,
  viewer: 1,
};

export const AuthProvider = ({ children, pathname = "/" }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const profileRef = React.useRef(null);
  const loadedProfileUserIdRef = React.useRef(null);

  // Sync ref with state
  const setProfileState = (newProfile) => {
    profileRef.current = newProfile;
    setProfile(newProfile);
  };

  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Ref to track active fetch to prevent loops
  const activeFetchRef = React.useRef(null);

  const fetchProfile = async (userId, email, sessionUser = null) => {
    // Prevent concurrent fetches for same user
    if (
      activeFetchRef.current === userId ||
      profileRef.current?.id === userId ||
      loadedProfileUserIdRef.current === userId
    ) {
      return;
    }

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
    });

    try {
      activeFetchRef.current = userId;
      setAuthError(null);

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error) throw error;

      if (data) {
        loadedProfileUserIdRef.current = userId;
        primeCurrentUserCache(sessionUser || { id: userId, email }, data);
        setProfileState(data);
      } else {
        clearCurrentUserCache();
        loadedProfileUserIdRef.current = null;
        setProfileState(null);
        setAuthError({
          type: 'profile_missing',
          message: 'Your console profile is not ready yet.',
        });
      }
    } catch (error) {
      // Keep degraded auth startup visible through app state, not raw browser diagnostics.
      clearCurrentUserCache();
      loadedProfileUserIdRef.current = null;
      setProfileState(null);
      setAuthError({
        type: 'profile_unavailable',
        message: 'We could not load your console profile.',
      });
    } finally {
      activeFetchRef.current = null;
      setLoading(false);
      setInitializing(false);
    }
  };

  useEffect(() => {
    // Force absolute initialization check
    let mounted = true;

    // Add timeout to prevent hanging on mobile or bad networks
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setInitializing(prev => {
          if (prev) {
            setLoading(false);
            return false;
          }
          return prev;
        });
      }
    }, 8000); // 8 second timeout for robust cold-starts

    // Get initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        clearTimeout(timeoutId);

        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email, session.user);
        } else {
          clearCurrentUserCache();
          setUser(null);
          setAuthError(null);
          loadedProfileUserIdRef.current = null;
          setProfileState(null);
          setLoading(false);
          setInitializing(false);
        }
      } catch (error) {
        if (mounted) {
          setAuthError({
            type: 'session_unavailable',
            message: 'We could not confirm your session.',
          });
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    checkInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // COORDINATION: only fetch if we don't already have the correct profile
      if (currentUser) {
        // Use ref for synchronous check to avoid closure staleness
        if (profileRef.current && profileRef.current.id === currentUser.id) {
          setLoading(false);
          setInitializing(false);
        } else {
          // Need to fetch (ref check inside fetchProfile prevents loops)
          fetchProfile(currentUser.id, currentUser.email, currentUser);
        }
      }

      if (event === 'SIGNED_OUT') {
        clearCurrentUserCache();
        setAuthError(null);
        loadedProfileUserIdRef.current = null;
        setProfileState(null);
        setUser(null);
        setLoading(false);
        setInitializing(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/set-password');
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    try {
      // Attempt to sign out from Supabase server
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Error during Supabase sign out:', error);
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    } finally {
      // Always clear local state regardless of server response
      clearCurrentUserCache();
      setUser(null);
      setAuthError(null);
      loadedProfileUserIdRef.current = null;
      setProfileState(null);
      // Optional: Clear any other local storage items if you have custom ones
      localStorage.removeItem('supabase.auth.token'); // Fallback cleanup
    }
  };

  const hasRole = useCallback((roles) => {
    if (!profile) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  }, [profile]);

  const hasMinRole = useCallback((minRole) => {
    if (!profile) return false;
    const userLevel = ROLE_HIERARCHY[profile.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= requiredLevel;
  }, [profile]);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isSponsor = useCallback(() => hasRole('sponsor'), [hasRole]);
  const isOrgAdmin = useCallback(() => hasRole('org_admin'), [hasRole]);
  const isProvider = useCallback(() => hasRole('provider'), [hasRole]);
  // Persona derivation — no schema change: a driver is a provider whose existing
  // profiles.provider_type is 'driver' (the same signal ambulancesService uses).
  const isDriver = useCallback(() => hasRole('provider') && profile?.provider_type === 'driver', [hasRole, profile]);
  const isViewer = useCallback(() => hasRole('viewer'), [hasRole]);
  const isPatient = useCallback(() => hasRole('patient'), [hasRole]);

  // Check if user is mid-onboarding (has pending status)
  const isOnboarding = useCallback(() => profile?.onboarding_status === 'pending', [profile]);

  // Check if user has skipped onboarding
  const isSkippedOnboarding = useCallback(() => profile?.onboarding_status === 'skipped', [profile]);

  /**
   * Universal Permission Checker
   * @param {string} action - 'view', 'create', 'edit', 'delete'
   * @param {string} resource - 'doctors', 'visits', 'ambulances', 'finance', 'analytics', etc.
   * @returns {boolean}
   */
  const can = useCallback((action, resource) => {
    if (isAdmin()) return true;
    const normalizedResource = resource === 'emergencies' ? 'emergency_requests' : resource;

    // Finance & Analytics access (Privileged)
    if (['finance', 'analytics', 'subscriptions'].includes(normalizedResource)) {
      if (isAdmin() || isOrgAdmin() || isSponsor()) {
        if (isSponsor() && action !== 'view') return false; // Sponsors are read-only for finance
        return true;
      }
      return false;
    }

    // Org Admins can manage their own resources
    if (isOrgAdmin()) {
      const manageable = ['doctors', 'ambulances', 'visits', 'users', 'emergency_requests', 'drivers', 'staff'];
      if (manageable.includes(normalizedResource)) return true;
    }

    // Sponsors can view operational data for transparency
    if (isSponsor()) {
      const viewable = ['emergency_requests', 'hospitals', 'visits'];
      if (action === 'view' && viewable.includes(normalizedResource)) return true;
    }

    // Providers can view and sometimes edit their own stuff
    if (isProvider()) {
      const viewable = [
        'doctors',
        'ambulances',
        'visits',
        'hospitals',
        'emergency_requests',
        'medical_profiles'
      ];
      if (action === 'view' && viewable.includes(normalizedResource)) return true;
    }

    // Viewers are read-only across the system
    if (isViewer()) {
      if (action === 'view') return true;
    }

    return false;
  }, [isAdmin, isOrgAdmin, isProvider, isSponsor, isViewer, profile]);

  const updateProfile = useCallback(async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');
      const data = await updateProfileService(user.id, updates);
      setProfileState(data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user]);

  const uploadAvatar = useCallback(async (file) => {
    try {
      if (!user) throw new Error('No user logged in');
      return await uploadProfileAvatar(user.id, file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }, [user]);

  const updatePassword = useCallback(async (password) => {
    return await updatePasswordService(password);
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    authError,
    orgId: profile?.organization_id || null,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    uploadAvatar,
    updatePassword,
    hasRole,
    hasMinRole,
    isAdmin,
    isSponsor,
    isOrgAdmin,
    isProvider,
    isDriver,
    isViewer,
    isPatient,
    isOnboarding,
    isSkippedOnboarding,
    can,
  }), [
    user,
    profile,
    authError,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    uploadAvatar,
    updatePassword,
    hasRole,
    hasMinRole,
    isAdmin,
    isSponsor,
    isOrgAdmin,
    isProvider,
    isDriver,
    isViewer,
    isPatient,
    isOnboarding,
    isSkippedOnboarding,
    can
  ]);

  // Show skeleton during initial load
  if (initializing) {
    return <DynamicAuthSkeleton pathname={pathname} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
