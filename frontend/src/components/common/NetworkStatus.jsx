import React from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkStatus = () => {
  const { isOnline, hasCorsIssue } = useNetworkStatus();

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (hasCorsIssue) return 'Connection Issues';
    return 'Online';
  };

  const getWifiIcon = () => {
    if (!isOnline) {
      // WiFi with X - no internet - use error color
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="wifi-offline">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
          <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />
        </svg>
      );
    }

    if (hasCorsIssue) {
      // WiFi with ! - issues - use warning color
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="wifi-warning">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
          <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    }

    // Full WiFi signal - all bars - use success/primary color
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="wifi-online">
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    );
  };

  return (
    <div className="group relative">
      {getWifiIcon()}
      {/* Apple-style tooltip - matches existing IslandNavigation tooltips */}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs font-semibold rounded-button opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm z-50">
        {getStatusText()}
      </div>
    </div>
  );
};

// Add lively CSS styles with theme colors
const style = document.createElement('style');
style.textContent = `
  .wifi-online {
    color: hsl(var(--primary));
    filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.4));
    animation: wifi-pulse 2s infinite ease-in-out;
  }
  
  .wifi-warning {
    color: hsl(var(--warning));
    filter: drop-shadow(0 0 3px hsl(var(--warning) / 0.3));
    animation: wifi-blink 3s infinite;
  }
  
  .wifi-offline {
    color: hsl(var(--destructive));
    opacity: 0.6;
    animation: wifi-fade 4s infinite ease-in-out;
  }
  
  @keyframes wifi-pulse {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
      filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.4));
    }
    25% { 
      opacity: 0.9; 
      transform: scale(1.05);
      filter: drop-shadow(0 0 6px hsl(var(--primary) / 0.6));
    }
    50% { 
      opacity: 0.8; 
      transform: scale(1.02);
      filter: drop-shadow(0 0 3px hsl(var(--primary) / 0.3));
    }
    75% { 
      opacity: 0.95; 
      transform: scale(1.03);
      filter: drop-shadow(0 0 5px hsl(var(--primary) / 0.5));
    }
  }
  
  @keyframes wifi-blink {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; filter: drop-shadow(0 0 5px hsl(var(--warning) / 0.5)); }
  }
  
  @keyframes wifi-fade {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.4; }
  }
`;
document.head.appendChild(style);
