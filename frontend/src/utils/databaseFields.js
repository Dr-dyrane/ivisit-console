/**
 * Database Field Reference
 * Quick reference for correct field names to prevent mismatches.
 */

export const DB_FIELDS = {
  emergency_requests: {
    id: "id",
    display_id: "display_id",
    user_id: "user_id",
    service_type: "service_type",
    specialty: "specialty",
    status: "status",
    payment_status: "payment_status",
    total_cost: "total_cost",
    hospital_id: "hospital_id",
    hospital_name: "hospital_name",
    assigned_doctor_id: "assigned_doctor_id",
    doctor_assigned_at: "doctor_assigned_at",
    bed_number: "bed_number",
    ambulance_type: "ambulance_type",
    ambulance_id: "ambulance_id",
    pickup_location: "pickup_location",
    destination_location: "destination_location",
    patient_location: "patient_location",
    patient_snapshot: "patient_snapshot",
    responder_id: "responder_id",
    responder_name: "responder_name",
    responder_phone: "responder_phone",
    responder_vehicle_type: "responder_vehicle_type",
    responder_vehicle_plate: "responder_vehicle_plate",
    responder_location: "responder_location",
    responder_heading: "responder_heading",
    created_at: "created_at",
    updated_at: "updated_at",
    completed_at: "completed_at",
    cancelled_at: "cancelled_at",
  },

  visits: {
    id: "id",
    user_id: "user_id",
    hospital_id: "hospital_id",
    visit_type: "visit_type",
    status: "status",
    date: "date",
    doctor: "doctor",
    room_number: "room_number",
    cost: "cost",
    estimated_duration: "estimated_duration",
    insurance_covered: "insurance_covered",
    preparation: "preparation",
    notes: "notes",
    reason: "reason",
    created_at: "created_at",
  },

  payments: {
    id: "id",
    display_id: "display_id",
    user_id: "user_id",
    organization_id: "organization_id",
    emergency_request_id: "emergency_request_id",
    amount: "amount",
    currency: "currency",
    payment_method: "payment_method",
    status: "status",
    stripe_payment_intent_id: "stripe_payment_intent_id",
    ivisit_fee_amount: "ivisit_fee_amount",
    metadata: "metadata",
    provider_response: "provider_response",
    processed_at: "processed_at",
    created_at: "created_at",
    updated_at: "updated_at",
  },

  payment_methods: {
    id: "id",
    user_id: "user_id",
    organization_id: "organization_id",
    type: "type",
    provider: "provider",
    last4: "last4",
    brand: "brand",
    expiry_month: "expiry_month",
    expiry_year: "expiry_year",
    is_default: "is_default",
    is_active: "is_active",
    metadata: "metadata",
    created_at: "created_at",
    updated_at: "updated_at",
  },

  wallet_ledger: {
    id: "id",
    wallet_id: "wallet_id",
    amount: "amount",
    transaction_type: "transaction_type",
    description: "description",
    reference_id: "reference_id",
    external_reference: "external_reference",
    metadata: "metadata",
    created_at: "created_at",
  },

  organization_wallets: {
    id: "id",
    display_id: "display_id",
    organization_id: "organization_id",
    balance: "balance",
    currency: "currency",
    created_at: "created_at",
    updated_at: "updated_at",
  },

  patient_wallets: {
    id: "id",
    display_id: "display_id",
    user_id: "user_id",
    balance: "balance",
    currency: "currency",
    created_at: "created_at",
    updated_at: "updated_at",
  },

  profiles: {
    id: "id",
    username: "username",
    email: "email",
    full_name: "full_name",
    phone: "phone",
    avatar_url: "avatar_url",
    role: "role",
    created_at: "created_at",
    updated_at: "updated_at",
  },

  hospitals: {
    id: "id",
    name: "name",
    address: "address",
    phone: "phone",
    coordinates: "coordinates",
    available_beds: "available_beds",
    total_beds: "total_beds",
    created_at: "created_at",
  },
};

export const FIELD_CORRECTIONS = {
  emergency_type: "service_type",
  location: "patient_location",
  profiles: "patient_snapshot",
  scheduled_at: "date",
  payment_method_id: "payment_method",
  ivisit_deduction_amount: "ivisit_fee_amount",
  organization_fee_rate: "metadata",
};

export function getCorrectField(wrongField) {
  return FIELD_CORRECTIONS[wrongField] || wrongField;
}

export function isCorrectField(tableName, field) {
  return Object.prototype.hasOwnProperty.call(DB_FIELDS[tableName] || {}, field);
}
