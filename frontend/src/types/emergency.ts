/**
 * Emergency Request Types
 * Database: emergency_requests table
 * 
 * Represents emergency medical request/ambulance dispatch records
 */

/**
 * PostGIS Point type - Geographic coordinates
 * Stored as USER-DEFINED type in Supabase
 * Contains: latitude, longitude
 */
export interface GeoPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number]; // GeoJSON standard
}

/**
 * Patient medical snapshot at time of request
 * Captured for historical record of patient state during emergency
 */
export interface PatientSnapshot {
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  emergency_contact?: string;
  medical_notes?: string;
}

/**
 * Emergency Request Status
 */
export enum EmergencyStatus {
  PENDING_APPROVAL = 'pending_approval',
  PAYMENT_DECLINED = 'payment_declined',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending_approval', // legacy alias
  ACCEPTED = 'accepted',
  ARRIVED = 'arrived',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Service/Specialty types for emergency
 */
export enum ServiceType {
  AMBULANCE = 'ambulance',
  CONSULTATION = 'consultation',
  EMERGENCY_ROOM = 'emergency_room',
  CRITICAL_CARE = 'critical_care',
}

/**
 * Ambulance types
 */
export enum AmbulanceType {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  CRITICAL_CARE = 'critical_care',
}

/**
 * Bed types in hospitals
 */
export enum BedType {
  ICU = 'icu',
  STANDARD = 'standard',
  ISOLATION = 'isolation',
  PEDIATRIC = 'pediatric',
}

/**
 * Complete Emergency Request Record
 * Mirrors live emergency_requests columns.
 */
export interface EmergencyRequest {
  // Identifiers
  id: string;
  user_id?: string; // UUID of requesting user
  
  // Service Details
  service_type: ServiceType | string;
  specialty?: string; // Medical specialty requested
  
  // Hospital Information
  hospital_id?: string;
  hospital_name?: string;
  assigned_doctor_id?: string;
  doctor_assigned_at?: string;
  
  // Bed Information
  bed_number?: string;
  
  // Ambulance Information
  ambulance_type?: AmbulanceType | string;
  ambulance_id?: string;
  
  // Status & Timestamps
  status: EmergencyStatus | string;
  created_at: string; // ISO timestamp - when request was made
  updated_at: string; // ISO timestamp - last update
  completed_at?: string | null; // ISO timestamp - when completed
  cancelled_at?: string | null; // ISO timestamp - when cancelled
  
  // Location Data (PostGIS geometry types)
  pickup_location?: GeoPoint | null; // Where to pick up patient
  destination_location?: GeoPoint | null; // Hospital/destination
  patient_location?: GeoPoint | null; // Current patient location
  responder_location?: GeoPoint | null; // Ambulance current location
  responder_heading?: number | null; // Ambulance heading (0-360)
  
  // Medical Data
  patient_snapshot?: PatientSnapshot | null; // Patient medical info snapshot
  payment_status?: string | null;
  
  // Responder Information
  responder_id?: string; // UUID of responder/ambulance driver
  responder_name?: string;
  responder_phone?: string;
  responder_vehicle_type?: string;
  responder_vehicle_plate?: string;
}

/**
 * Emergency Request - Creation Input
 * Fields needed to create a new emergency request
 */
export interface CreateEmergencyRequestInput {
  user_id: string;
  service_type: ServiceType | string;
  specialty?: string;
  pickup_location: GeoPoint;
  destination_location?: GeoPoint;
  hospital_id?: string;
  hospital_name?: string;
  patient_snapshot?: PatientSnapshot;
}

/**
 * Emergency Request - Update Input
 * Fields that can be updated after creation
 */
export interface UpdateEmergencyRequestInput {
  status?: EmergencyStatus | string;
  ambulance_id?: string;
  assigned_doctor_id?: string;
  doctor_assigned_at?: string;
  responder_id?: string;
  responder_name?: string;
  responder_phone?: string;
  responder_vehicle_type?: string;
  responder_vehicle_plate?: string;
  responder_location?: GeoPoint;
  responder_heading?: number;
  patient_location?: GeoPoint;
  destination_location?: GeoPoint;
  payment_status?: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

/**
 * Emergency Request - List/Filter Options
 */
export interface EmergencyRequestFilter {
  status?: EmergencyStatus | string;
  user_id?: string;
  hospital_id?: string;
  ambulance_id?: string;
  service_type?: ServiceType | string;
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  limit?: number;
  offset?: number;
}

/**
 * Emergency Request Statistics
 */
export interface EmergencyStats {
  total_requests: number;
  active_requests: number; // pending_approval | in_progress | accepted | arrived
  pending_requests: number; // pending_approval
  completed_today: number;
  cancelled_today: number;
  avg_response_time_seconds: number;
  success_rate: number; // percentage
}

/**
 * Emergency Request with computed fields
 * For display/UI purposes
 */
export interface EmergencyRequestDisplay extends EmergencyRequest {
  // Computed fields
  distance_to_destination?: number; // meters
  time_elapsed?: number; // seconds
  response_time?: number; // seconds (created to accepted)
  is_overdue?: boolean;
  priority_level?: 'critical' | 'high' | 'medium' | 'low';
  patient_name?: string; // From profiles.username
}

/**
 * Emergency Request Timeline Event
 * For activity/status history
 */
export interface EmergencyRequestEvent {
  id: string;
  request_id: string;
  event_type: 'created' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'updated';
  description: string;
  created_by?: string; // User ID
  created_at: string; // ISO timestamp
  metadata?: Record<string, any>;
}
