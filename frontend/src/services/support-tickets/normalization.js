import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from './constants';

const SUPPORT_TICKET_ENUM_VALUES = {
  category: new Set(SUPPORT_TICKET_CATEGORIES),
  priority: new Set(SUPPORT_TICKET_PRIORITIES),
  status: new Set(SUPPORT_TICKET_STATUSES),
};

const normalizeFilterList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const text = String(value || '').trim();
  return text ? [text] : [];
};

export const normalizeSupportTicketEnum = (field, value, fallback) => {
  const allowedValues = SUPPORT_TICKET_ENUM_VALUES[field];
  const candidate = value === null || value === undefined || String(value).trim() === ''
    ? fallback
    : value;
  const normalized = String(candidate ?? '').trim().toLowerCase();

  if (!allowedValues?.has(normalized)) {
    throw new Error(`Unsupported support ticket ${field}: ${normalized || 'empty'}`);
  }

  return normalized;
};

export const normalizeSupportTicketFilterList = (field, value) => (
  normalizeFilterList(value).map((entry) => normalizeSupportTicketEnum(field, entry))
);

export const sanitizeSupportTicketSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[%_,]/g, ' ')
  .replace(/\s+/g, ' ');

export const normalizeSupportTicketRow = (row = {}) => ({
  ...row,
  id: row.id,
  user_id: row.user_id || null,
  organization_id: row.organization_id || null,
  subject: String(row.subject || 'Support request').trim() || 'Support request',
  message: String(row.message || '').trim(),
  category: row.category || 'general',
  priority: row.priority || 'normal',
  status: row.status || 'open',
  assigned_to: row.assigned_to || null,
  customer_name: row.customer_name || row.requester_name || null,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

export function pickAllowedSupportTicketFields(input, allowedFields) {
  const payload = {};
  if (!input || typeof input !== 'object') return payload;

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
      payload[field] = input[field];
    }
  }

  return payload;
}
