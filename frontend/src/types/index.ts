import { Point } from 'geojson';

export type UserRole = 'patient' | 'provider' | 'admin';
export type ProviderType = 'hospital' | 'ambulance_service' | 'doctor' | 'driver' | 'paramedic';

export interface Profile {
  id: string;
  email: string;
  phone?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  image_uri?: string;
  role?: UserRole;
  provider_type?: ProviderType;
  bvn_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Preferences {
  user_id: string;
  demo_mode_enabled: boolean;
  notifications_enabled: boolean;
  appointment_reminders: boolean;
  emergency_updates: boolean;
  privacy_share_medical_profile: boolean;
  privacy_share_emergency_contacts: boolean;
  view_preferences?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface MedicalProfile {
  user_id: string;
  blood_type?: string;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  organ_donor?: boolean;
  insurance_provider?: string;
  insurance_policy_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  created_at: string;
  updated_at: string;
}

export interface InsurancePolicy {
  id: string;
  user_id: string;
  provider_name: string;
  policy_number?: string;
  group_number?: string;
  policy_holder_name?: string;
  coverage_type?: string;
  start_date?: string;
  end_date?: string;
  front_image_url?: string;
  back_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  user_id: string;
  hospital_id?: string;
  hospital?: string;
  doctor?: string;
  doctor_image?: string;
  specialty?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: 'upcoming' | 'completed' | 'cancelled' | 'no-show';
  image?: string;
  address?: string;
  phone?: string;
  notes?: string;
  room_number?: string;
  estimated_duration?: string;
  preparation?: string[];
  cost?: string;
  insurance_covered?: boolean;
  summary?: string;
  prescriptions?: string[];
  next_visit?: string;
  request_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type?: string;
  title?: string;
  message?: string;
  read: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_type?: string;
  action_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  type?: 'premium' | 'standard';
  image?: string;
  specialties?: string[];
  service_types?: string[];
  features?: string[];
  emergency_level?: string;
  available_beds?: number;
  ambulances_count?: number;
  wait_time?: string;
  price_range?: string;
  latitude?: number;
  longitude?: number;
  verified?: boolean;
  status?: 'available' | 'busy' | 'full';
  created_at: string;
  updated_at: string;
}

export interface Ambulance {
  id: string;
  type?: 'basic' | 'advanced' | 'critical' | 'neonatal';
  call_sign?: string;
  status?: 'available' | 'en_route' | 'on_scene' | 'returning';
  location?: Point;
  eta?: string;
  crew?: string[];
  hospital?: string;
  vehicle_number?: string;
  last_maintenance?: string;
  rating?: number;
  current_call?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital_id?: string;
  image?: string;
  rating?: number;
  reviews_count?: number;
  years_experience?: number;
  about?: string;
  consultation_fee?: string;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyRequest {
  id: string;
  request_id?: string;
  user_id: string;
  service_type: 'ambulance' | 'bed';
  hospital_id?: string;
  hospital_name?: string;
  specialty?: string;
  ambulance_type?: string;
  ambulance_id?: string;
  bed_number?: string;
  bed_type?: string;
  bed_count?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  estimated_arrival?: string;
  pickup_location?: Point;
  destination_location?: Point;
  patient_snapshot?: Record<string, any>;
  shared_data_snapshot?: Record<string, any>;
  responder_id?: string;
  responder_name?: string;
  responder_phone?: string;
  responder_vehicle_type?: string;
  responder_vehicle_plate?: string;
  responder_location?: Point;
  responder_heading?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface SupportTicket {
  id: string;
  user_id?: string;
  subject: string;
  message: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SupportFAQ {
  id: number;
  question: string;
  answer: string;
  category?: string;
  rank?: number;
  created_at: string;
}

export interface HealthNews {
  id: string;
  title: string;
  source: string;
  time: string;
  icon: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  result_count?: number;
  created_at: string;
}

export interface SearchSelection {
  id: string;
  user_id?: string;
  query: string;
  result_type: string;
  result_id: string;
  source?: string;
  created_at: string;
}

export interface SearchEvent {
  id: string;
  query?: string;
  source?: string;
  selected_key?: string;
  extra?: Record<string, any>;
  created_at: string;
}

export interface TrendingTopic {
  id: string;
  query: string;
  category: string;
  rank: number;
  created_at: string;
  updated_at: string;
}

export interface Subscriber {
  id?: string;
  email?: string;
  created_at?: string;
}
