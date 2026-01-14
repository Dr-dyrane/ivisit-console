import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute = ({ children, minRole = 'viewer', allowedRoles = null }) => {
  const { user, profile, loading, hasRole, hasMinRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 squircle bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground font-semibold">Loading...</p>
        </div>
      </div>
    );
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
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 squircle bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-2xl font-black mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to access this page.
        </p>
        {profile && (
          <p className="text-sm text-muted-foreground">
            Your role: <span className="font-bold text-primary">{profile.role}</span>
          </p>
        )}
      </div>
    </div>
  );
};
