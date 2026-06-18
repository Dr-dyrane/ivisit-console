/**
 * Avatar utility functions for consistent avatar handling across the app
 * Provides fallback logic for profile.avatar_url -> auth.user.avatar_url -> generated avatar
 */

// Cache for avatar URLs to prevent excessive API calls
const avatarUrlCache = new Map();
const avatarFallbackCache = new Map();
const failedUrls = new Set(); // Track failed URLs to prevent repeated attempts

/**
 * Get avatar URL with proper fallback chain and caching
 * @param {Object} profile - User profile object
 * @param {Object} user - Auth user object (optional)
 * @returns {string} Avatar URL
 */
export const getAvatarUrl = (profile, user = null) => {
  // Create cache key from profile/user data
  const cacheKey = JSON.stringify({
    profileId: profile?.id,
    profileAvatar: profile?.avatar_url,
    profileImage: profile?.image_uri,
    userId: user?.id,
    userAvatar: user?.avatar_url
  });

  // Return cached URL if available
  if (avatarUrlCache.has(cacheKey)) {
    return avatarUrlCache.get(cacheKey);
  }

  let url;

  // Handle case where only one object is passed
  if (!user && profile && !profile.avatar_url && profile.user?.avatar_url) {
    // profile contains auth user data
    url = profile.user.avatar_url;
  } else if (profile?.avatar_url || profile?.image_uri) {
    // Try profile.avatar_url or profile.image_uri
    url = profile.avatar_url || profile.image_uri;
    
    // Skip Google avatars that have previously failed (rate limiting)
    if (url.includes('googleusercontent.com') && failedUrls.has(url)) {
      // Fall back to generated avatar
      const seed = profile?.id || user?.id || Math.random().toString(36).substr(2, 9);
      url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    }
  } else if (user?.avatar_url) {
    // Fall back to auth.user.avatar_url
    url = user.avatar_url;
  } else {
    // Generate unique avatar using ID
    const seed = profile?.id || user?.id || Math.random().toString(36).substr(2, 9);
    url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }

  // Cache the result
  avatarUrlCache.set(cacheKey, url);
  
  // Limit cache size to prevent memory leaks
  if (avatarUrlCache.size > 100) {
    const firstKey = avatarUrlCache.keys().next().value;
    avatarUrlCache.delete(firstKey);
  }

  return url;
};

/**
 * Mark avatar URL as failed (for rate limiting handling)
 * @param {string} url - Failed avatar URL
 */
export const markAvatarUrlAsFailed = (url) => {
  if (url && url.includes('googleusercontent.com')) {
    failedUrls.add(url);
    // Remove from cache to force fallback on next call
    for (const [key, cachedUrl] of avatarUrlCache.entries()) {
      if (cachedUrl === url) {
        avatarUrlCache.delete(key);
        break;
      }
    }
  }
};

/**
 * Clear failed URL cache (for testing or manual retry)
 */
export const clearFailedAvatarUrls = () => {
  failedUrls.clear();
};

/**
 * Get avatar fallback text (initials) with caching
 * @param {Object} profile - User profile object
 * @param {Object} user - Auth user object (optional)
 * @returns {string} Initials for fallback
 */
export const getAvatarFallback = (profile, user = null) => {
  // Create cache key from profile/user data
  const cacheKey = JSON.stringify({
    profileUsername: profile?.username,
    profileEmail: profile?.email,
    userEmail: user?.email
  });

  // Return cached fallback if available
  if (avatarFallbackCache.has(cacheKey)) {
    return avatarFallbackCache.get(cacheKey);
  }

  let fallback;

  // Handle case where only one object is passed
  if (!user && profile && !profile.username && profile.user?.email) {
    // profile contains auth user data
    fallback = profile.user.email[0].toUpperCase();
  } else if (profile?.username?.[0]) {
    // Try profile username first
    fallback = profile.username[0].toUpperCase();
  } else if (user?.email?.[0]) {
    // Fall back to auth user email
    fallback = user.email[0].toUpperCase();
  } else if (profile?.email?.[0]) {
    // Try profile email
    fallback = profile.email[0].toUpperCase();
  } else {
    // Default fallback
    fallback = 'U';
  }

  // Cache the result
  avatarFallbackCache.set(cacheKey, fallback);
  
  // Limit cache size to prevent memory leaks
  if (avatarFallbackCache.size > 100) {
    const firstKey = avatarFallbackCache.keys().next().value;
    avatarFallbackCache.delete(firstKey);
  }

  return fallback;
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
