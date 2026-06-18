/**
 * Schema Debugger - Development Only
 * Shows data structure and field mismatches in real-time
 */

import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { validateDataSchema, FIELD_CHECKS } from '../../utils/schemaValidator';
import { DB_FIELDS, getCorrectField } from '../../utils/databaseFields';

export const SchemaDebugger = ({ data, tableName, componentName }) => {
  if (process.env.NODE_ENV !== 'development') return null;

  const schema = DB_FIELDS[tableName];
  const errors = [];
  const warnings = [];

  // Check data structure
  if (data && schema) {
    Object.keys(data).forEach(field => {
      if (!schema[field]) {
        const correctField = getCorrectField(field);
        if (correctField !== field) {
          errors.push({ field, issue: 'WRONG_FIELD', correct: correctField });
        } else {
          warnings.push({ field, issue: 'UNKNOWN_FIELD' });
        }
      }
    });

    // Check for missing important fields
    const importantFields = ['id', 'service_type', 'status', 'created_at'];
    importantFields.forEach(field => {
      if (schema[field] && !data[field]) {
        warnings.push({ field, issue: 'MISSING_FIELD' });
      }
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 p-4 border-red-500 bg-red-50 dark:bg-red-900/20">
      <div className="space-y-2">
        <h4 className="font-bold text-red-700 dark:text-red-300">
          🔍 Schema Issues in {componentName}
        </h4>
        
        {errors.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-600">Errors:</p>
            {errors.map((error, i) => (
              <div key={i} className="text-xs bg-red-100 p-2 rounded">
                <code className="text-red-700">
                  "{error.field}" → should be "{error.correct}"
                </code>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-yellow-600">Warnings:</p>
            {warnings.map((warning, i) => (
              <div key={i} className="text-xs bg-yellow-100 p-2 rounded">
                <code className="text-yellow-700">
                  {warning.issue}: {warning.field}
                </code>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-600 mt-2">
          <strong>Data Structure:</strong>
          <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </Card>
  );
};

// Quick field checker component
export const FieldChecker = ({ data, tableName }) => {
  if (process.env.NODE_ENV !== 'development') return null;

  const fieldChecks = FIELD_CHECKS[tableName] || {};
  const issues = [];

  Object.keys(data).forEach(field => {
    if (fieldChecks[field]) {
      issues.push({ field, message: fieldChecks[field] });
    }
  });

  if (issues.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="p-3 border-orange-500 bg-orange-50">
        <div className="space-y-1">
          <p className="text-sm font-bold text-orange-700">🚨 Field Issues:</p>
          {issues.map((issue, i) => (
            <div key={i} className="text-xs text-orange-600">
              {issue.message}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
