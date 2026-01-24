/**
 * Database Field Reference
 * Quick reference for correct field names to prevent mismatches
 */

export const DB_FIELDS = {
  // Emergency Requests Table
  emergency_requests: {
    // ✅ CORRECT fields
    id: 'id',
    user_id: 'user_id',
    service_type: 'service_type', // ❌ NOT emergency_type
    priority: 'priority',
    status: 'status',
    patient_location: 'patient_location', // ❌ NOT location
    hospital_id: 'hospital_id',
    hospital_name: 'hospital_name',
    ambulance_id: 'ambulance_id',
    responder_id: 'responder_id',
    responder_name: 'responder_name',
    responder_phone: 'responder_phone',
    responder_vehicle_type: 'responder_vehicle_type',
    responder_vehicle_plate: 'responder_vehicle_plate',
    patient_snapshot: 'patient_snapshot', // ❌ NOT profiles
    shared_data_snapshot: 'shared_data_snapshot',
    estimated_arrival: 'estimated_arrival',
    created_at: 'created_at',
    updated_at: 'updated_at',
    completed_at: 'completed_at',
    
    // ❌ COMMON MISTAKES - DO NOT USE:
    // emergency_type → use service_type instead
    // location → use patient_location instead
    // profiles → use patient_snapshot instead
  },

  // Visits Table
  visits: {
    // ✅ CORRECT fields
    id: 'id',
    user_id: 'user_id',
    hospital_id: 'hospital_id',
    visit_type: 'visit_type',
    status: 'status',
    date: 'date', // ❌ NOT scheduled_at
    doctor: 'doctor',
    room_number: 'room_number',
    cost: 'cost',
    estimated_duration: 'estimated_duration',
    insurance_covered: 'insurance_covered',
    preparation: 'preparation',
    notes: 'notes',
    reason: 'reason',
    created_at: 'created_at',
    
    // ❌ COMMON MISTAKES - DO NOT USE:
    // scheduled_at → use date instead
    // user → use patient (from profiles join) instead
    // hospital → use hospital (from hospitals join) instead
  },

  // Profiles Table
  profiles: {
    // ✅ CORRECT fields
    id: 'id',
    username: 'username',
    email: 'email',
    full_name: 'full_name',
    phone: 'phone',
    avatar_url: 'avatar_url',
    role: 'role',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },

  // Hospitals Table
  hospitals: {
    // ✅ CORRECT fields
    id: 'id',
    name: 'name',
    address: 'address',
    phone: 'phone',
    coordinates: 'coordinates',
    available_beds: 'available_beds',
    total_beds: 'total_beds',
    created_at: 'created_at',
  }
};

// Quick field mapping for common mistakes
export const FIELD_CORRECTIONS = {
  // Emergency requests
  'emergency_type': 'service_type',
  'location': 'patient_location',
  'profiles': 'patient_snapshot',
  'scheduled_at': 'date',
  
  // Visits
  'user': 'patient',
  'hospital': 'hospital',
};

// Helper function to get correct field name
export function getCorrectField(wrongField) {
  return FIELD_CORRECTIONS[wrongField] || wrongField;
}

// Helper to check if field is correct
export function isCorrectField(tableName, field) {
  return DB_FIELDS[tableName]?.hasOwnProperty(field) || false;
}
