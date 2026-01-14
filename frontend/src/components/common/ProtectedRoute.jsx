import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // For demo purposes, allow access if no user (will use default admin)
  if (!profile && !requiredRole) {
    return children;
  }

  // Check role permission
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(profile?.role)) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="squircle-lg glass shadow-premium p-8 max-w-md border-0">
            <div className="text-center">
              <div className="w-16 h-16 squircle bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                You don&apos;t have permission to access this page.
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 squircle bg-primary text-primary-foreground hover-lift font-bold"
              >
                Go Back
              </button>
            </div>
          </Card>
        </div>
      );
    }
  }

  return children;
};
