import { applyAuthFilter } from '../authService';
import {
  normalizeSupportTicketFilterList,
  sanitizeSupportTicketSearchTerm,
} from './normalization';

export function applySupportTicketScope(query, user) {
  return applyAuthFilter(query, user, {
    userIdField: 'user_id',
    orgIdField: 'organization_id',
    resourceType: 'support',
  });
}

export function applySupportTicketFilters(query, filter = {}) {
  const statusValues = normalizeSupportTicketFilterList('status', filter.status);
  if (statusValues.length === 1) {
    query = query.eq('status', statusValues[0]);
  } else if (statusValues.length > 1) {
    query = query.in('status', statusValues);
  }

  const priorityValues = normalizeSupportTicketFilterList('priority', filter.priority);
  if (priorityValues.length === 1) {
    query = query.eq('priority', priorityValues[0]);
  } else if (priorityValues.length > 1) {
    query = query.in('priority', priorityValues);
  }

  const categoryValues = normalizeSupportTicketFilterList('category', filter.category);
  if (categoryValues.length === 1) {
    query = query.eq('category', categoryValues[0]);
  } else if (categoryValues.length > 1) {
    query = query.in('category', categoryValues);
  }

  if (filter.assigned_to) {
    query = query.eq('assigned_to', filter.assigned_to);
  }

  const search = sanitizeSupportTicketSearchTerm(filter.search);
  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,message.ilike.%${search}%,category.ilike.%${search}%`
    );
  }

  return query;
}
