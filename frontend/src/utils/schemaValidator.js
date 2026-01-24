/**
 * Database Schema Validator
 * Validates component data against expected database schema
 */

// Expected database schema based on your tables
const DATABASE_SCHEMA = {
  emergency_requests: {
    id: 'string',
    user_id: 'string', 
    service_type: 'string', // NOT emergency_type
    priority: 'string',
    status: 'string',
    patient_location: 'object|string', // NOT location
    hospital_id: 'string',
    hospital_name: 'string',
    ambulance_id: 'string',
    responder_name: 'string',
    responder_phone: 'string',
    patient_snapshot: 'object',
    created_at: 'string',
    updated_at: 'string'
  },
  visits: {
    id: 'string',
    user_id: 'string',
    hospital_id: 'string',
    visit_type: 'string',
    status: 'string',
    date: 'string',
    doctor: 'string',
    room_number: 'string',
    notes: 'string',
    created_at: 'string'
  },
  profiles: {
    id: 'string',
    username: 'string',
    email: 'string',
    full_name: 'string',
    phone: 'string',
    avatar_url: 'string'
  }
};

/**
 * Validate component data against schema
 * @param {string} tableName - Database table name
 * @param {object} data - Data to validate
 * @param {string} componentName - Component name for error reporting
 */
export function validateDataSchema(tableName, data, componentName) {
  const schema = DATABASE_SCHEMA[tableName];
  if (!schema) {
    console.warn(`⚠️ No schema found for table: ${tableName}`);
    return true;
  }

  const errors = [];
  const warnings = [];

  // Check for missing required fields
  Object.keys(schema).forEach(field => {
    if (data[field] === undefined && !field.includes('_id')) {
      warnings.push(`Missing field: ${field}`);
    }
  });

  // Check for fields that don't exist in schema
  Object.keys(data).forEach(field => {
    if (!schema[field] && !field.startsWith('temp_')) {
      warnings.push(`Unexpected field: ${field} (not in ${tableName} schema)`);
    }
  });

  // Check for common field name mismatches
  const commonMismatches = {
    'emergency_type': 'service_type',
    'location': 'patient_location',
    'profiles': 'patient', // For visits
    'hospitals': 'hospital' // For visits
  };

  Object.keys(commonMismatches).forEach(wrongField => {
    if (data[wrongField] !== undefined) {
      const correctField = commonMismatches[wrongField];
      errors.push(`❌ FIELD MISMATCH: Found "${wrongField}" but should be "${correctField}" in ${componentName}`);
    }
  });

  // Report results
  if (errors.length > 0) {
    console.group(`🚨 SCHEMA ERRORS in ${componentName}`);
    errors.forEach(error => console.error(error));
    console.groupEnd();
    return false;
  }

  if (warnings.length > 0) {
    console.group(`⚠️ SCHEMA WARNINGS in ${componentName}`);
    warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }

  return errors.length === 0;
}

/**
 * Development-only schema validation hook
 */
export function useSchemaValidator() {
  if (process.env.NODE_ENV === 'development') {
    return validateDataSchema;
  }
  return () => true; // No validation in production
}

/**
 * Quick field checker for common issues
 */
export const FIELD_CHECKS = {
  emergency_requests: {
    'emergency_type': '❌ Use service_type instead',
    'location': '❌ Use patient_location instead', 
    'profiles': '❌ Use patient_snapshot instead',
    'emergency_type': '❌ Use service_type instead'
  },
  visits: {
    'user': '❌ Use patient (from profiles join) instead',
    'hospital': '❌ Use hospital (from hospitals join) instead'
  }
};
