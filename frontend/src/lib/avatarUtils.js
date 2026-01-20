/**
 * Avatar utility functions for consistent avatar handling across the app
 * Provides fallback logic for profile.avatar_url -> auth.user.avatar_url -> generated avatar
 */

/**
 * Get avatar URL with proper fallback chain
 * @param {Object} profile - User profile object
 * @param {Object} user - Auth user object (optional)
 * @returns {string} Avatar URL
 */
export const getAvatarUrl = (profile, user = null) => {
  // Handle case where only one object is passed
  if (!user && profile && !profile.avatar_url && profile.user?.avatar_url) {
    // profile contains auth user data
    return profile.user.avatar_url;
  }

  // Try profile.avatar_url or profile.image_uri
  if (profile?.avatar_url || profile?.image_uri) {
    return profile.avatar_url || profile.image_uri;
  }

  // Fall back to auth.user.avatar_url
  if (user?.avatar_url) {
    return user.avatar_url;
  }

  // Generate unique avatar using ID
  const seed = profile?.id || user?.id || Math.random().toString(36).substr(2, 9);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

/**
 * Get avatar fallback text (initials)
 * @param {Object} profile - User profile object
 * @param {Object} user - Auth user object (optional)
 * @returns {string} Initials for fallback
 */
export const getAvatarFallback = (profile, user = null) => {
  // Handle case where only one object is passed
  if (!user && profile && !profile.username && profile.user?.email) {
    // profile contains auth user data
    return profile.user.email[0].toUpperCase();
  }

  // Try profile username first
  if (profile?.username?.[0]) {
    return profile.username[0].toUpperCase();
  }

  // Fall back to auth user email
  if (user?.email?.[0]) {
    return user.email[0].toUpperCase();
  }

  // Try profile email
  if (profile?.email?.[0]) {
    return profile.email[0].toUpperCase();
  }

  // Default fallback
  return 'U';
};

/**
 * Get avatar display name
 * @param {Object} profile - User profile object
 * @param {Object} user - Auth user object
 * @returns {string} Display name
 */
export const getAvatarDisplayName = (profile, user) => {
  return profile?.username || user?.user_metadata?.username || user?.email || 'User';
};
