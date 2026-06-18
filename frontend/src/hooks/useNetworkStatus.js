import { useState, useEffect, useRef } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasCorsIssue, setHasCorsIssue] = useState(false);
  const [lastError, setLastError] = useState(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor for CORS errors - but only wrap fetch once
    if (!window.fetch._wrapped) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          
          // Check for CORS headers
          if (!response.ok && response.status === 0) {
            setHasCorsIssue(true);
            setLastError(new Error('CORS issue detected'));
          } else if (response.status >= 500) {
            setLastError(new Error(`Server error: ${response.status}`));
          } else {
            // Only clear CORS issue on successful requests
            if (hasCorsIssue) {
              setHasCorsIssue(false);
            }
            setLastError(null);
          }
          
          return response;
        } catch (error) {
          if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            setHasCorsIssue(true);
          }
          setLastError(error);
          throw error;
        }
      };
      
      window.fetch._wrapped = true;
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasCorsIssue]);

  const retry = () => {
    retryCountRef.current += 1;
    setHasCorsIssue(false);
    setLastError(null);
  };

  return {
    isOnline,
    hasCorsIssue,
    lastError,
    retry,
    status: hasCorsIssue ? 'cors-error' : isOnline ? 'online' : 'offline'
  };
};
