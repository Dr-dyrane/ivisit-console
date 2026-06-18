import { toast } from 'sonner';

/**
 * Standardized error handling utility for consistent user feedback
 * Extracts meaningful error messages and provides user-friendly feedback
 */

export const handleError = (error, fallbackMessage = 'An error occurred') => {
  console.error('Error details:', error);
  
  // Extract the most relevant error message
  let errorMessage = fallbackMessage;
  
  if (error?.message) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.error?.message) {
    errorMessage = error.error.message;
  } else if (error?.data?.error?.message) {
    errorMessage = error.data.error.message;
  }
  
  // Clean up common Supabase/auth error messages
  errorMessage = errorMessage
    .replace(/^AuthApiError:\s*/i, '')
    .replace(/^FunctionsFetchError:\s*/i, '')
    .replace(/^PostgrestError:\s*/i, '')
    .trim();
  
  toast.error(errorMessage);
  return errorMessage;
};

export const handleAsyncError = async (asyncFn, fallbackMessage = 'Operation failed') => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error, fallbackMessage);
    throw error; // Re-throw for caller to handle if needed
  }
};

// Specific error handlers for common operations
export const handleAuthError = (error, action = 'authenticate') => {
  const fallbackMap = {
    'authenticate': 'Authentication failed',
    'reset': 'Password reset failed',
    'signup': 'Account creation failed',
    'update': 'Profile update failed'
  };
  
  return handleError(error, fallbackMap[action] || 'Authentication error');
};

export const handleApiError = (error, action = 'process') => {
  const fallbackMap = {
    'delete': 'Failed to delete item',
    'create': 'Failed to create item',
    'update': 'Failed to update item',
    'fetch': 'Failed to load data',
    'submit': 'Failed to submit'
  };
  
  return handleError(error, fallbackMap[action] || 'Operation failed');
};

export const handleNetworkError = (error) => {
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    toast.error('Network error. Please check your connection.');
    return 'Network error. Please check your connection.';
  }
  
  return handleError(error, 'Connection error');
};
