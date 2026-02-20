import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DynamicAuthSkeleton } from '../ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// Create auth context
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthWrapper = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Enhanced session management
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Auto-logout after inactivity (30 minutes)
  // Enhanced sign out with cleanup
  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if server fails, we proceed to clear local state
      toast.error('Session ended locally');
    } finally {
      setUser(null);
      setProfile(null);
      setSessionTimeout(null);
      setLastActivity(Date.now());
      navigate('/login');
    }
  }, [navigate]);

  // Auto-logout after inactivity (30 minutes)
  useEffect(() => {
    const activityCheck = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      // Auto logout after 30 minutes of inactivity
      if (timeSinceLastActivity > 30 * 60 * 1000 && user) {
        console.log('Auto-logout due to inactivity');
        handleSignOut();
      } else {
        // Update last activity
        setLastActivity(now);
      }
    };

    // Set up activity tracking
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];

    activityEvents.forEach(event => {
      document.addEventListener(event, activityCheck, true);
    });

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, activityCheck);
      });
    };
  }, [user, lastActivity, handleSignOut]);

  // Enhanced session persistence
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
          setSessionRestored(true);
          toast.success('Session restored');
        } else {
          setUser(null);
          setProfile(null);
          setSessionRestored(false);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        toast.error('Failed to initialize session');
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const fetchProfile = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Auto-admin role assignment
        if (email === 'halodyrane@gmail.com' && data.role !== 'admin') {
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);
          data.role = 'admin';
        }
        setProfile(data);
      } else {
        // Create new profile with fallback
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
      setProfile({
        id: userId,
        role: email === 'halodyrane@gmail.com' ? 'admin' : 'viewer',
        username: email?.split('@')[0] || 'User',
        email: email,
      });
    }
  };

  // Enhanced auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        setUser(session?.user ?? null);

        if (session?.user) {
          // PULLBACK NOTE: Enhanced profile fetching with Google OAuth support
          // OLD: Only fetch existing profile
          // NEW: Create profile if doesn't exist (for new Google OAuth users)
          try {
            await fetchProfile(session.user.id, session.user.email);
          } catch (error) {
            // If profile doesn't exist, create one for new OAuth users
            if (error.code === 'PGRST116') {
              console.log('Profile not found, creating new profile for OAuth user');
              const newProfile = {
                id: session.user.id,
                email: session.user.email,
                username: session.user.email?.split('@')[0] || 'User',
                role: 'viewer', // Default role for new users
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
                toast.success('Account created successfully');
              }
            } else {
              throw error;
            }
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
        setInitializing(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Enhanced sign in with better error handling
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        toast.error(error.message || 'Authentication failed');
        throw error;
      }

      setUser(data.user);
      await fetchProfile(data.user.id, data.user.email);
      toast.success('Access granted');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Authentication failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Enhanced sign up with validation
  const signUp = async (email, password, username) => {
    setLoading(true);
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message || 'Registration failed');
        throw error;
      }

      setUser(data.user);
      toast.success('Registration successful');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };



  // Role-based access control
  const ROLE_HIERARCHY = {
    admin: 4,
    sponsor: 3,
    provider: 2,
    viewer: 1,
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

  // Show skeleton during initialization
  if (initializing) {
    return <DynamicAuthSkeleton pathname={location.pathname} />;
  }

  const value = {
    user,
    profile,
    loading,
    sessionRestored,
    signIn,
    signUp,
    signOut: handleSignOut,
    hasRole,
    hasMinRole,
    isAdmin,
    isSponsor,
    isProvider,
    isViewer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

};

export default AuthWrapper;
