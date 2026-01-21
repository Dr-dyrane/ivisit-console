import React, { createContext, useContext, useState, useEffect } from 'react';
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

// Role hierarchy: admin > sponsor > provider > viewer
const ROLE_HIERARCHY = {
  admin: 4,
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
      setTimeout(() => reject(new Error('Profile fetch timeout')), 3000);
    });

    try {
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Check if this is the admin email and update role if needed
        if (email === 'halodyrane@gmail.com' && data.role !== 'admin') {
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);
          data.role = 'admin';
        }
        setProfile(data);
      } else {
        // Create new profile if doesn't exist
        const role = email === 'halodyrane@gmail.com' ? 'admin' : 'viewer';
        const newProfile = {
          id: userId,
          email: email,
          role: role,
          username: email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          setProfile(newProfile); // Use local profile as fallback
        } else {
          setProfile(createdProfile);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback profile
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
    // Add timeout to prevent hanging on mobile
    const timeoutId = setTimeout(() => {
      setInitializing(prev => {
        if (prev) {
          console.warn('Auth initialization timeout - forcing load state');
          setLoading(false);
          return false;
        }
        return prev;
      });
    }, 5000); // 5 second timeout

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
        setInitializing(false);
      }
    }).catch((error) => {
      clearTimeout(timeoutId);
      console.error('Session fetch error:', error);
      setLoading(false);
      setInitializing(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      // Automatic redirection for invited users setting a password
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/set-password');
      }

      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
        setInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Show skeleton during initial load
  if (initializing) {
    return <DynamicAuthSkeleton pathname={pathname} />;
  }

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

  const hasRole = (roles) => {
    if (!profile) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  };

  const hasMinRole = (minRole) => {
    if (!profile) return false;
    const userLevel = ROLE_HIERARCHY[profile.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= requiredLevel;
  };

  const isAdmin = () => hasRole('admin');
  const isSponsor = () => hasMinRole('sponsor');
  const isOrgAdmin = () => hasRole('org_admin');
  const isProvider = () => hasMinRole('provider') || isOrgAdmin();
  const isViewer = () => hasMinRole('viewer');

  /**
   * Universal Permission Checker
   * @param {string} action - 'view', 'create', 'edit', 'delete'
   * @param {string} resource - 'doctors', 'visits', 'ambulances', etc.
   * @returns {boolean}
   */
  const can = (action, resource) => {
    if (isAdmin()) return true;

    // Org Admins can manage their own resources
    if (isOrgAdmin()) {
      const manageable = ['doctors', 'ambulances', 'visits', 'users', 'emergency_requests'];
      if (manageable.includes(resource)) return true;
    }

    // Providers can view and sometimes edit their own stuff
    if (isProvider()) {
      const viewable = ['doctors', 'ambulances', 'visits', 'hospitals'];
      if (action === 'view' && viewable.includes(resource)) return true;
    }

    return false;
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');
      const data = await updateProfileService(user.id, updates);
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const uploadAvatar = async (file) => {
    try {
      if (!user) throw new Error('No user logged in');
      return await uploadProfileAvatar(user.id, file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const updatePassword = async (password) => {
    return await updatePasswordService(password);
  };

  const value = {
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
    can,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
