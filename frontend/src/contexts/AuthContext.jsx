import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DynamicAuthSkeleton } from '../components/ui/skeleton';
import { updateProfile as updateProfileService, uploadProfileAvatar } from '../services/profilesService';
import { updatePassword as updatePasswordService } from '../services/authService';

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
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const fetchProfile = async (userId, email) => {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
    });

    try {
      console.log(`[AuthContext] Fetching profile for ${email}...`);

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        console.log('[AuthContext] Profile found:', data.role);
        // Check if this is the admin email and update role if needed
        if (email === 'halodyrane@gmail.com' && data.role !== 'admin') {
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);
          data.role = 'admin';
        }

        // NEW: Enrich with display ID
        try {
          const { getDisplayId } = await import('../services/displayIdService');
          const display_id = await getDisplayId(data.id);
          setProfile({ ...data, display_id });
        } catch (idError) {
          console.warn('[AuthContext] Display ID enrichment failed:', idError);
          setProfile(data);
        }
      } else {
        // Create new profile if doesn't exist (Fallback for slow DB triggers)
        console.log('[AuthContext] Profile not found, attempting creation...');
        const role = email === 'halodyrane@gmail.com' ? 'admin' : 'viewer';
        const newProfile = {
          id: userId,
          email: email,
          role: role,
          username: email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          onboarding_status: 'pending'
        };

        // Use UPSERT to avoid duplicate key errors if the trigger just finished
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .upsert([newProfile], { onConflict: 'id' })
          .select()
          .single();

        if (createError) {
          console.error('[AuthContext] Error creating profile:', createError);
          // If upsert failed, try one last fetch just in case the trigger finally caught up
          const { data: finalProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (finalProfile) {
            setProfile(finalProfile);
          } else {
            console.warn('[AuthContext] Falling back to local profile object');
            setProfile(newProfile); // Use local profile as fallback
          }
        } else {
          console.log('[AuthContext] Profile successfully created/synced');
          // NEW: Enrich with display ID
          try {
            const { getDisplayId } = await import('../services/displayIdService');
            const display_id = await getDisplayId(createdProfile.id);
            setProfile({ ...createdProfile, display_id });
          } catch (idError) {
            setProfile(createdProfile);
          }
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error in profile flow:', error);
      // Fallback profile to prevent app from breaking
      setProfile({
        id: userId,
        role: email === 'halodyrane@gmail.com' ? 'admin' : 'viewer',
        username: email?.split('@')[0] || 'User',
        email: email,
      });
    } finally {
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
            console.warn('[AuthContext] Initialization timeout - forcing load state');
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
          console.log('[AuthContext] Initial session found for:', session.user.email);
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          console.log('[AuthContext] No initial session');
          setUser(null);
          setProfile(null);
          setLoading(false);
          setInitializing(false);
        }
      } catch (error) {
        console.error('[AuthContext] Session fetch error:', error);
        if (mounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    checkInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('[AuthContext] Auth State Change:', event);

      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || (event === 'INITIAL_SESSION' && session?.user)) {
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
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
      setUser(null);
      setProfile(null);
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

    // Finance & Analytics access (Privileged)
    if (['finance', 'analytics', 'subscriptions'].includes(resource)) {
      if (isAdmin() || isOrgAdmin() || isSponsor()) {
        if (isSponsor() && action !== 'view') return false; // Sponsors are read-only for finance
        return true;
      }
      return false;
    }

    // Org Admins can manage their own resources
    if (isOrgAdmin()) {
      const manageable = ['doctors', 'ambulances', 'visits', 'users', 'emergency_requests', 'drivers', 'staff'];
      if (manageable.includes(resource)) return true;
    }

    // Sponsors can view operational data for transparency
    if (isSponsor()) {
      const viewable = ['emergency_requests', 'hospitals', 'visits'];
      if (action === 'view' && viewable.includes(resource)) return true;
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
      if (action === 'view' && viewable.includes(resource)) return true;

      // Dispatchers (special provider type) have more operational control
      if (profile?.provider_type === 'dispatcher' || profile?.role === 'dispatcher') {
        const dispatchable = ['ambulances', 'emergency_requests', 'drivers'];
        if (dispatchable.includes(resource)) return true;
      }
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
      setProfile(data);
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
    isViewer,
    isPatient,
    isOnboarding,
    isSkippedOnboarding,
    can,
  }), [
    user,
    profile,
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
