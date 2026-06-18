/**
 * Custom ESLint Rules for Database Field Validation
 * Add this to your main .eslintrc.js extends array
 */

module.exports = {
  rules: {
    // Custom rule to catch common field name mistakes
    'no-restricted-properties': [
      'error',
      {
        object: 'req',
        properties: {
          'emergency_type': {
            message: 'Use service_type instead of emergency_type (database schema mismatch)'
          },
          'location': {
            message: 'Use patient_location instead of location (database schema mismatch)'
          },
          'profiles': {
            message: 'Use patient_snapshot instead of profiles (database schema mismatch)'
          },
          'scheduled_at': {
            message: 'Use date instead of scheduled_at (database schema mismatch)'
          }
        }
      },
      {
        object: 'visit',
        properties: {
          'user': {
            message: 'Use patient (from profiles join) instead of user'
          },
          'hospital': {
            message: 'Use hospital (from hospitals join) instead of hospital'
          }
        }
      }
    ],

    // Catch undefined field access
    'no-undef': 'error',

    // Warn about potential undefined access
    'no-unused-vars': [
      'error',
      { 
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_'
      }
    ]
  }
};
