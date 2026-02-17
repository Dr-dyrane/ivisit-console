/**
 * Emergency Request Constants
 * Centralized enums and configurations for emergency requests
 * Based on actual mobile app implementation
 */

// Service Types - Based on mobile app useRequestFlow.js
export const EMERGENCY_SERVICE_TYPES = {
  AMBULANCE: 'ambulance',  // From mobile app serviceType: "ambulance"
  BED: 'bed',            // From mobile app serviceType: "bed"
  CRITICAL_CARE: 'critical_care',
  EMERGENCY_ROOM: 'emergency_room',
  CONSULTATION: 'consultation'
};

// Service Type Display Names
export const SERVICE_TYPE_DISPLAY = {
  [EMERGENCY_SERVICE_TYPES.AMBULANCE]: 'Ambulance',
  [EMERGENCY_SERVICE_TYPES.BED]: 'Bed Booking',
  [EMERGENCY_SERVICE_TYPES.CRITICAL_CARE]: 'Critical Care',
  [EMERGENCY_SERVICE_TYPES.EMERGENCY_ROOM]: 'Emergency Room',
  [EMERGENCY_SERVICE_TYPES.CONSULTATION]: 'Consultation'
};

// Status Enums - Based on database schema
export const EMERGENCY_STATUS = {
  PENDING: 'pending',
  PENDING_APPROVAL: 'pending_approval',
  IN_PROGRESS: 'in_progress',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Status Display Names
export const STATUS_DISPLAY = {
  [EMERGENCY_STATUS.PENDING]: 'Pending',
  [EMERGENCY_STATUS.PENDING_APPROVAL]: 'Approval Needed',
  [EMERGENCY_STATUS.IN_PROGRESS]: 'In Progress',
  [EMERGENCY_STATUS.ACCEPTED]: 'Accepted',
  [EMERGENCY_STATUS.COMPLETED]: 'Completed',
  [EMERGENCY_STATUS.CANCELLED]: 'Cancelled'
};

// KPI Filter Types - Updated to match mobile app service types
export const KPI_FILTERS = {
  ALL: 'all',
  AMBULANCE: 'ambulance', // Maps to ambulance service type
  BED: 'bed',           // Maps to bed service type
  CRITICAL: 'critical', // Maps to critical_care service type
  EMERGENCY: 'emergency', // Maps to emergency_room service type
  PENDING: 'pending', // Maps to pending status
  IN_PROGRESS: 'inProgress' // Maps to in_progress status
};

// Service Type Colors (Apple Design System)
export const SERVICE_TYPE_COLORS = {
  [EMERGENCY_SERVICE_TYPES.AMBULANCE]: 'hsl(var(--primary))',      // Blue for ambulance
  [EMERGENCY_SERVICE_TYPES.BED]: 'hsl(var(--warning))',            // Yellow for bed booking
  [EMERGENCY_SERVICE_TYPES.CRITICAL_CARE]: 'hsl(var(--destructive))', // Red for critical
  [EMERGENCY_SERVICE_TYPES.EMERGENCY_ROOM]: 'hsl(var(--destructive))', // Red for ER
  [EMERGENCY_SERVICE_TYPES.CONSULTATION]: 'hsl(var(--success))'       // Green for consultation
};

// Status Colors
export const STATUS_COLORS = {
  [EMERGENCY_STATUS.PENDING]: 'hsl(var(--warning))',
  [EMERGENCY_STATUS.IN_PROGRESS]: 'hsl(var(--info))',
  [EMERGENCY_STATUS.ACCEPTED]: 'hsl(var(--primary))',
  [EMERGENCY_STATUS.COMPLETED]: 'hsl(var(--success))',
  [EMERGENCY_STATUS.CANCELLED]: 'hsl(var(--destructive))'
};

// Badge Classes for Service Types
export const SERVICE_TYPE_BADGES = {
  [EMERGENCY_SERVICE_TYPES.AMBULANCE]: 'bg-primary/20 text-primary',
  [EMERGENCY_SERVICE_TYPES.BED]: 'bg-warning/20 text-warning',
  [EMERGENCY_SERVICE_TYPES.CRITICAL_CARE]: 'bg-destructive/20 text-destructive',
  [EMERGENCY_SERVICE_TYPES.EMERGENCY_ROOM]: 'bg-destructive/20 text-destructive',
  [EMERGENCY_SERVICE_TYPES.CONSULTATION]: 'bg-success/20 text-success'
};

// Badge Classes for Status
export const STATUS_BADGES = {
  [EMERGENCY_STATUS.PENDING]: 'bg-warning/20 text-warning',
  [EMERGENCY_STATUS.PENDING_APPROVAL]: 'bg-orange-500/20 text-orange-500',
  [EMERGENCY_STATUS.IN_PROGRESS]: 'bg-info/20 text-info',
  [EMERGENCY_STATUS.ACCEPTED]: 'bg-blue-500/20 text-blue-500',
  [EMERGENCY_STATUS.COMPLETED]: 'bg-success/20 text-success',
  [EMERGENCY_STATUS.CANCELLED]: 'bg-destructive/20 text-destructive'
};

// Helper Functions
export const getServiceTypeDisplay = (serviceType) => {
  return SERVICE_TYPE_DISPLAY[serviceType] || 'Unknown';
};

export const getStatusDisplay = (status) => {
  return STATUS_DISPLAY[status] || 'Unknown';
};

export const getServiceTypeColor = (serviceType) => {
  return SERVICE_TYPE_COLORS[serviceType] || 'hsl(var(--muted-foreground))';
};

export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || 'hsl(var(--muted-foreground))';
};

export const getServiceTypeBadge = (serviceType) => {
  return SERVICE_TYPE_BADGES[serviceType] || 'bg-muted/20 text-muted-foreground';
};

export const getStatusBadge = (status) => {
  return STATUS_BADGES[status] || 'bg-muted/20 text-muted-foreground';
};
