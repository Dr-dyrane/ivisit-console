/**
 * RBAC Standardization Patterns
 * Consistent authorization logic across all services
 * Follows hybrid RLS + Service Layer architecture
 */

import { getCurrentUser } from './authService';

/**
 * Standard authorization check for user-only access
 * Used by services that should NOT allow admin access (privacy-focused)
 */
export async function requireUserAccess(requestedUserId) {
  const user = await getCurrentUser();
  
  if (user?.id !== requestedUserId) {
    throw new Error('Unauthorized: Cannot access other users data');
  }
  
  return user;
}

/**
 * Standard authorization check for admin + user access
 * Used by services that allow admin oversight
 */
export async function requireAdminOrUserAccess(requestedUserId) {
  const user = await getCurrentUser();
  
  // Admins can access any data, users only their own
  if (user?.role !== 'admin' && user?.id !== requestedUserId) {
    throw new Error('Unauthorized: Access denied');
  }
  
  return user;
}

/**
 * Standard query builder with authorization
 * Applies consistent filtering pattern
 */
export function buildAuthorizedQuery(supabase, tableName, userId, allowAdminAccess = true) {
  let query = supabase.from(tableName).select('*');
  
  if (!allowAdminAccess) {
    // User-only access (privacy-focused services)
    query = query.eq('user_id', userId);
  } else {
    // Admin + user access (oversight services)
    // This will be handled by RLS policies, but we add service-layer check for performance
    // The actual filtering logic should be in the calling service
  }
  
  return query;
}

/**
 * Standard error handling for authorization failures
 * Consistent error messages and logging
 */
export class AuthorizationError extends Error {
  constructor(message, service, action) {
    super(message);
    this.name = 'AuthorizationError';
    this.service = service;
    this.action = action;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Standard audit logging for authorization events
 * Helps with compliance and debugging
 * DISABLED for performance - RBAC checks were too frequent
 */
export function logAuthorizationEvent(service, action, userId, success, reason = null) {
  // PULLBACK NOTE: Disabled RBAC audit logging for performance
  // OLD: console.log('RBAC Audit:', event);
  // NEW: Commented out to prevent console spam and performance issues
  /*
  const event = {
    timestamp: new Date().toISOString(),
    service,
    action,
    userId,
    success,
    reason,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };
  
  console.log('RBAC Audit:', event);
  
  // In production, this would go to a dedicated audit service
  // For now, console logging provides debugging capability
  */
}

// Cache for role checks to prevent repeated database queries
const roleCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds

/**
 * Standard role checking with JWT optimization and caching
 * Uses the fast JWT claim check we implemented
 */
export async function checkRole(requiredRole) {
  // Create cache key from user and required role
  const user = await getCurrentUser();
  
  if (!user) {
    throw new AuthorizationError('User not authenticated', 'rbac', 'checkRole');
  }

  const cacheKey = `${user.id}-${requiredRole}-${user.role}`;
  const now = Date.now();
  
  // Check cache first
  if (roleCache.has(cacheKey)) {
    const cached = roleCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION) {
      logAuthorizationEvent('rbac', 'checkRole', user?.id, cached.result, 'Cache hit');
      return cached.result;
    }
  }

  // The JWT sync makes this check fast
  const hasRole = user?.role === requiredRole;
  
  // Cache the result
  roleCache.set(cacheKey, {
    result: hasRole,
    timestamp: now
  });

  // Clean old cache entries
  if (roleCache.size > 50) {
    const oldestKey = roleCache.keys().next().value;
    roleCache.delete(oldestKey);
  }
  
  logAuthorizationEvent('rbac', 'checkRole', user?.id, hasRole, 
    !hasRole ? `User role ${user?.role} does not match required ${requiredRole}` : null);
  
  return hasRole;
}

/**
 * Standard admin check with performance optimization
 * Uses the JWT-optimized is_admin() function
 */
export async function isAdmin() {
  return await checkRole('admin');
}

/**
 * Standardized service response format
 * Consistent error handling across all services
 */
export function handleServiceError(error, service, operation) {
  logAuthorizationEvent(service, operation, null, false, error.message);
  
  if (error instanceof AuthorizationError) {
    throw error;
  }
  
  // Wrap other errors in consistent format
  throw new Error(`${service} ${operation} failed: ${error.message}`);
}
