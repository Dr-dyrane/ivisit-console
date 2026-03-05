/**
 * Database Schema Validator
 * Validates component data against expected live schema contracts.
 */

const DATABASE_SCHEMA = {
  emergency_requests: {
    id: "string",
    display_id: "string",
    user_id: "string",
    service_type: "string",
    specialty: "string",
    status: "string",
    payment_status: "string",
    total_cost: "number",
    hospital_id: "string",
    hospital_name: "string",
    assigned_doctor_id: "string",
    doctor_assigned_at: "string",
    bed_number: "string",
    ambulance_type: "string",
    ambulance_id: "string",
    pickup_location: "object|string",
    destination_location: "object|string",
    patient_location: "object|string",
    patient_snapshot: "object",
    responder_id: "string",
    responder_name: "string",
    responder_phone: "string",
    responder_vehicle_type: "string",
    responder_vehicle_plate: "string",
    responder_location: "object|string",
    responder_heading: "number",
    created_at: "string",
    updated_at: "string",
    completed_at: "string",
    cancelled_at: "string",
  },
  payments: {
    id: "string",
    display_id: "string",
    user_id: "string",
    organization_id: "string",
    emergency_request_id: "string",
    amount: "number",
    currency: "string",
    payment_method: "string",
    status: "string",
    stripe_payment_intent_id: "string",
    ivisit_fee_amount: "number",
    metadata: "object",
    provider_response: "object",
    processed_at: "string",
    created_at: "string",
    updated_at: "string",
  },
  payment_methods: {
    id: "string",
    user_id: "string",
    organization_id: "string",
    type: "string",
    provider: "string",
    last4: "string",
    brand: "string",
    expiry_month: "number",
    expiry_year: "number",
    is_default: "boolean",
    is_active: "boolean",
    metadata: "object",
    created_at: "string",
    updated_at: "string",
  },
  wallet_ledger: {
    id: "string",
    wallet_id: "string",
    amount: "number",
    transaction_type: "string",
    description: "string",
    reference_id: "string",
    external_reference: "string",
    metadata: "object",
    created_at: "string",
  },
  organization_wallets: {
    id: "string",
    display_id: "string",
    organization_id: "string",
    balance: "number",
    currency: "string",
    created_at: "string",
    updated_at: "string",
  },
  patient_wallets: {
    id: "string",
    display_id: "string",
    user_id: "string",
    balance: "number",
    currency: "string",
    created_at: "string",
    updated_at: "string",
  },
  visits: {
    id: "string",
    user_id: "string",
    hospital_id: "string",
    visit_type: "string",
    status: "string",
    date: "string",
    doctor: "string",
    room_number: "string",
    notes: "string",
    created_at: "string",
  },
};

export function validateDataSchema(tableName, data, componentName) {
  const schema = DATABASE_SCHEMA[tableName];
  if (!schema) {
    console.warn(`No schema found for table: ${tableName}`);
    return true;
  }

  const errors = [];
  const warnings = [];

  Object.keys(schema).forEach((field) => {
    if (data[field] === undefined && !field.includes("_id")) {
      warnings.push(`Missing field: ${field}`);
    }
  });

  Object.keys(data).forEach((field) => {
    if (!schema[field] && !field.startsWith("temp_")) {
      warnings.push(`Unexpected field: ${field} (not in ${tableName} schema)`);
    }
  });

  const commonMismatches = {
    emergency_type: "service_type",
    location: "patient_location",
    payment_method_id: "payment_method",
    ivisit_deduction_amount: "ivisit_fee_amount",
    organization_fee_rate: "metadata",
    profiles: "patient_snapshot",
    hospitals: "hospital",
  };

  Object.keys(commonMismatches).forEach((wrongField) => {
    if (data[wrongField] !== undefined) {
      const correctField = commonMismatches[wrongField];
      errors.push(
        `FIELD MISMATCH: Found "${wrongField}" but should be "${correctField}" in ${componentName}`,
      );
    }
  });

  if (errors.length > 0) {
    console.group(`SCHEMA ERRORS in ${componentName}`);
    errors.forEach((error) => console.error(error));
    console.groupEnd();
    return false;
  }

  if (warnings.length > 0) {
    console.group(`SCHEMA WARNINGS in ${componentName}`);
    warnings.forEach((warning) => console.warn(warning));
    console.groupEnd();
  }

  return true;
}

export function useSchemaValidator() {
  if (process.env.NODE_ENV === "development") {
    return validateDataSchema;
  }
  return () => true;
}

export const FIELD_CHECKS = {
  emergency_requests: {
    emergency_type: "Use service_type instead",
    location: "Use patient_location instead",
    profiles: "Use patient_snapshot instead",
  },
  finance: {
    payment_method_id: "Use payment_method instead",
    ivisit_deduction_amount: "Use ivisit_fee_amount instead",
    organization_fee_rate: "Move into metadata or explicit model mapping",
  },
  visits: {
    user: "Use patient (from profiles join) instead",
    hospital: "Use hospital (from hospitals join) instead",
  },
};
