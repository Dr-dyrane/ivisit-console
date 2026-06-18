import { 
  AlertCircle, 
  CheckCircle2, 
  FileCheck, 
  Ambulance, 
  Activity,
  Users,
  Calendar,
  Mail,
  Settings,
  Search,
  Shield
} from 'lucide-react';

/**
 * Get appropriate icon for activity type
 */
export const getActivityIcon = (action) => {
  const iconMap = {
    'emergency_created': AlertCircle,
    'emergency_updated': AlertCircle,
    'emergency_completed': CheckCircle2,
    'provider_verified': FileCheck,
    'provider_registered': Users,
    'user_registered': Users,
    'ambulance_dispatched': Ambulance,
    'ambulance_returned': Ambulance,
    'hospital_added': Activity,
    'visit_scheduled': Calendar,
    'visit_completed': CheckCircle2,
    'support_ticket_created': AlertCircle,
    'support_ticket_resolved': CheckCircle2,
    'subscription_created': Mail,
    'subscription_cancelled': Mail,
    'system_backup': Settings,
    'user_login': Users,
    'user_logout': Users,
    'search_performed': Search,
    'profile_updated': FileCheck,
    'admin_action': Shield
  };

  return iconMap[action] || Activity;
};

/**
 * Get appropriate color for activity type
 */
export const getActivityColor = (action) => {
  const colorMap = {
    'emergency_created': 'text-primary',
    'emergency_updated': 'text-warning',
    'emergency_completed': 'text-success',
    'provider_verified': 'text-success',
    'provider_registered': 'text-info',
    'user_registered': 'text-info',
    'ambulance_dispatched': 'text-warning',
    'ambulance_returned': 'text-success',
    'hospital_added': 'text-info',
    'visit_scheduled': 'text-primary',
    'visit_completed': 'text-success',
    'support_ticket_created': 'text-warning',
    'support_ticket_resolved': 'text-success',
    'subscription_created': 'text-success',
    'subscription_cancelled': 'text-destructive',
    'system_backup': 'text-secondary',
    'user_login': 'text-info',
    'user_logout': 'text-muted-foreground',
    'search_performed': 'text-info',
    'profile_updated': 'text-warning',
    'admin_action': 'text-destructive'
  };

  return colorMap[action] || 'text-muted-foreground';
};

/**
 * Get appropriate background color for activity type
 */
export const getActivityBg = (action) => {
  const bgMap = {
    'emergency_created': 'bg-primary/10',
    'emergency_updated': 'bg-warning/10',
    'emergency_completed': 'bg-success/10',
    'provider_verified': 'bg-success/10',
    'provider_registered': 'bg-info/10',
    'user_registered': 'bg-info/10',
    'ambulance_dispatched': 'bg-warning/10',
    'ambulance_returned': 'bg-success/10',
    'hospital_added': 'bg-info/10',
    'visit_scheduled': 'bg-primary/10',
    'visit_completed': 'bg-success/10',
    'support_ticket_created': 'bg-warning/10',
    'support_ticket_resolved': 'bg-success/10',
    'subscription_created': 'bg-success/10',
    'subscription_cancelled': 'bg-destructive/10',
    'system_backup': 'bg-secondary/10',
    'user_login': 'bg-info/10',
    'user_logout': 'bg-muted/10',
    'search_performed': 'bg-info/10',
    'profile_updated': 'bg-warning/10',
    'admin_action': 'bg-destructive/10'
  };

  return bgMap[action] || 'bg-muted/10';
};

/**
 * Transform activity data for display
 */
export const transformActivityData = (activities) => {
  return activities.map(activity => ({
    id: activity.id,
    type: activity.action,
    msg: activity.description,
    time: activity.time_ago || formatRelativeTime(activity.created_at),
    icon: getActivityIcon(activity.action),
    color: getActivityColor(activity.action),
    bg: getActivityBg(activity.action),
    user: activity.user_name || activity.user_email,
    metadata: activity.metadata || {},
    entity_type: activity.entity_type,
    entity_id: activity.entity_id,
    created_at: activity.created_at
  }));
};

/**
 * Format relative time fallback
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Unknown time';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};
