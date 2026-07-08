/**
 * Route Guard Component
 * Comprehensive route protection using navigation config
 * Prevents manual URL bypassing of navigation restrictions
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { getRouteProtection, checkRouteAccess } from '../../config/routes';
import { getAccessibleNav } from '../../config/navigation';

/**
 * Route Guard that protects routes based on navigation config
 * Use this in App.jsx to wrap all protected routes
 */
export const RouteGuard = ({ children }) => {
  const { user, profile, can } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  // Get route protection configuration
  const routeConfig = getRouteProtection(currentPath);

  // Public routes - no protection needed
  if (routeConfig.public) {
    return children;
  }

  // User not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check access using navigation config (primary protection)
  const hasNavigationAccess = checkRouteAccess(currentPath, profile, can);

  if (!hasNavigationAccess) {
    console.log(`[RouteGuard] Navigation access denied for ${profile?.role} to ${currentPath}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Additional protection using ProtectedRoute component
  return (
    <ProtectedRoute
      minRole={routeConfig.minRole}
      resource={routeConfig.resource}
      path={currentPath}
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * Higher-order component for protecting specific routes
 * Usage: <ProtectedRouteComponent path="/visits" component={VisitsPage} />
 */
export const ProtectedRouteComponent = ({
  path,
  component: Component,
  minRole,
  resource,
  ...props
}) => {
  const routeConfig = getRouteProtection(path);

  return (
    <RouteGuard>
      <ProtectedRoute
        minRole={minRole || routeConfig.minRole}
        resource={resource || routeConfig.resource}
        path={path}
      >
        <Component {...props} />
      </ProtectedRoute>
    </RouteGuard>
  );
};

/**
 * Hook to check if current user can access a route
 * Useful for conditional rendering in components
 */
export const useRouteAccess = (path) => {
  const { profile, can } = useAuth();

  return {
    canAccess: checkRouteAccess(path, profile, can),
    routeConfig: getRouteProtection(path),
    requiresAuth: !getRouteProtection(path).public
  };
};

/**
 * Component for conditional route-based rendering
 * Usage: 
 * <RouteAccess path="/visits">
 *   <VisitsLink />
 * </RouteAccess>
 */
export const RouteAccess = ({ path, children, fallback = null }) => {
  const { canAccess } = useRouteAccess(path);

  return canAccess ? children : fallback;
};

/**
 * Debug component to show route access information
 * Remove in production
 */
export const RouteAccessDebug = () => {
  const { profile, can } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const accessibleNav = getAccessibleNav(profile, can);
  const hasAccess = checkRouteAccess(currentPath, profile, can);
  const routeConfig = getRouteProtection(currentPath);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-inner text-xs max-w-sm z-50">
      <div className="font-bold mb-2">Route Access Debug</div>
      <div>Path: {currentPath}</div>
      <div>Role: {profile?.role}</div>
      <div>Access: {hasAccess ? '✅' : '❌'}</div>
      <div>Min Role: {routeConfig.minRole || 'none'}</div>
      <div>Resource: {routeConfig.resource || 'none'}</div>
      <div className="mt-2 opacity-75">
        Accessible Nav Items: {accessibleNav.main?.length || 0} main,
        {accessibleNav.ops?.items?.length || 0} ops,
        {accessibleNav.mgmt?.items?.length || 0} mgmt,
        {accessibleNav.finance?.items?.length || 0} finance
      </div>
    </div>
  );
};

export default RouteGuard;
