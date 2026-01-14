import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthSkeleton } from '../ui/skeleton';
import { motion } from 'framer-motion';

export const ProtectedRoute = ({ children, minRole = 'viewer', allowedRoles = null }) => {
  const { user, profile, loading, hasRole, hasMinRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthSkeleton />;
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
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background overflow-y-auto overflow-x-hidden">
      {/* Premium Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-96 h-96 bg-destructive/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-60 -left-60 w-96 h-96 bg-warning/6 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Unauthorized Card */}
          <div className="squircle-xl glass border-0 p-8 shadow-premium text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-24 h-24 squircle-xl bg-destructive/10 mx-auto mb-6 flex items-center justify-center"
            >
              <span className="text-5xl">🚫</span>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-3xl font-black tracking-tight text-foreground">Access Denied</h1>
              <p className="text-muted-foreground font-semibold text-lg leading-relaxed">
                You don't have permission to access this page.
              </p>
              
              {/* User Info */}
              {profile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 squircle-lg bg-muted/20 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground font-semibold">Your Role:</span>
                    <span className="font-black text-primary text-lg">{profile.role}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-semibold">Email:</span>
                    <span className="font-bold text-foreground text-sm">{profile.email}</span>
                  </div>
                </motion.div>
              )}

              {/* Role Hierarchy Info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-4 squircle-lg bg-primary/5 border border-primary/20"
              >
                <p className="text-xs text-muted-foreground font-semibold mb-3 text-center">Role Hierarchy (Low → High)</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <div className="text-center">
                    <div className="w-8 h-8 squircle bg-muted/50 flex items-center justify-center mb-1">
                      <span className="text-xs font-black">1</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">Viewer</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 squircle bg-info/10 flex items-center justify-center mb-1">
                      <span className="text-xs font-black text-info">2</span>
                    </div>
                    <span className="text-xs font-bold text-info">Provider</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 squircle bg-secondary/10 flex items-center justify-center mb-1">
                      <span className="text-xs font-black text-secondary">3</span>
                    </div>
                    <span className="text-xs font-bold text-secondary">Sponsor</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 squircle bg-primary/10 flex items-center justify-center mb-1">
                      <span className="text-xs font-black text-primary">4</span>
                    </div>
                    <span className="text-xs font-bold text-primary">Admin</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3 pt-4"
            >
              <button
                onClick={() => navigate(-1)}
                className="w-full py-3.5 squircle-lg bg-muted/20 hover:bg-muted/30 font-bold text-sm transition-all hover-lift border border-border/50"
              >
                Go Back
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 squircle-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm shadow-glow transition-all hover-lift"
              >
                Return to Dashboard
              </button>
            </motion.div>
          </div>

          {/* Help Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="squircle-xl glass border-0 p-6 shadow-premium">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 squircle bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">💡</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">Need Access?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Contact your system administrator to request elevated permissions. 
                    Admin users can manage roles and access levels.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
