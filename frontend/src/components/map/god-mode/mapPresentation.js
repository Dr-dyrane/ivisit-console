export const ACTIVE_AMBULANCE_STATUSES = new Set(['in_progress', 'accepted', 'arrived']);

export const DRIVER_STATUS_COPY = {
  accepted: {
    loading: 'Marking on way...',
    success: 'On way saved',
    error: 'Could not mark on way',
  },
  arrived: {
    loading: 'Marking arrived...',
    success: 'Arrived saved',
    error: 'Could not mark arrived',
  },
  completed: {
    loading: 'Closing request...',
    success: 'Request closed',
    error: 'Could not close request',
  },
};

export const statusLabel = (value, fallback = '') => {
  const text = String(value || fallback).replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'critical': return 'hsl(var(--destructive))';
    case 'high': return 'hsl(38 92% 50%)';
    case 'medium': return 'hsl(199 89% 48%)';
    case 'low': return 'hsl(160 84% 39%)';
    default: return 'hsl(var(--muted-foreground))';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'available': return 'hsl(160 84% 39%)';
    case 'busy': return 'hsl(38 92% 50%)';
    case 'en_route':
    case 'on_route': return 'hsl(199 89% 48%)';
    case 'maintenance': return 'hsl(var(--destructive))';
    default: return 'hsl(var(--muted-foreground))';
  }
};

export const getRoutePrimaryColor = (isDark) => (isDark ? '#B83432' : '#86100E');
