import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthSkeleton } from '../components/ui/skeleton';

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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const fetchProfile = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
        setInitializing(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
        setInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show skeleton during initial load
  if (initializing) {
    return <AuthSkeleton />;
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
  const isProvider = () => hasMinRole('provider');
  const isViewer = () => hasMinRole('viewer');

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasMinRole,
    isAdmin,
    isSponsor,
    isProvider,
    isViewer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
