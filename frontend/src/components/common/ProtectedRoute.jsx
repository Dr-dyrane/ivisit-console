import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { DynamicAuthSkeleton } from '../ui/skeleton';
import { motion } from 'framer-motion';

export const ProtectedRoute = ({ children, minRole = 'viewer', allowedRoles = null }) => {
  const { user, profile, loading, hasRole, hasMinRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <DynamicAuthSkeleton pathname={location.pathname} />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permissions
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (minRole && !hasMinRole(minRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export const UnauthorizedPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-destructive/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-warning/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="squircle-2xl glass-strong shadow-2xl p-8 text-center border-0 overflow-hidden relative">
          {/* Decorative Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-destructive/50 via-warning/50 to-destructive/50" />
          
          {/* Icon */}
          <div className="w-24 h-24 squircle-xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <span className="text-5xl drop-shadow-md">⛔</span>
            </motion.div>
          </div>

          <h1 className="text-3xl font-black tracking-tighter mb-2">Access Restricted</h1>
          <p className="text-muted-foreground font-medium mb-8">
            Your clearance level ({profile?.role || 'Guest'}) does not grant access to this secure area.
          </p>

          {/* User Badge */}
          {profile && (
            <div className="squircle-lg bg-muted/30 p-4 mb-8 flex items-center justify-between border border-white/5">
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Identity</p>
                <p className="font-bold text-sm truncate max-w-[150px]">{profile.email}</p>
              </div>
              <div className={`px-3 py-1 squircle-sm text-xs font-black uppercase tracking-wide ${
                profile.role === 'admin' ? 'bg-primary/20 text-primary' :
                profile.role === 'provider' ? 'bg-info/20 text-info' :
                'bg-muted text-muted-foreground'
              }`}>
                {profile.role}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full h-12 squircle-lg bg-muted/50 hover:bg-muted text-foreground font-bold transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full h-12 squircle-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
