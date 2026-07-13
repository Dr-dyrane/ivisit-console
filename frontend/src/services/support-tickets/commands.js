import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { withAudit } from '../supabaseHelpers';
import {
  SUPPORT_TICKET_CREATE_FIELDS,
  SUPPORT_TICKET_UPDATE_FIELDS,
  TABLE_NAME,
} from './constants';
import {
  normalizeSupportTicketEnum,
  pickAllowedSupportTicketFields,
} from './normalization';
import { getSupportTicket } from './queries';

export async function createSupportTicket(input) {
  try {
    const user = await getCurrentUser();
    const payload = pickAllowedSupportTicketFields(input, SUPPORT_TICKET_CREATE_FIELDS);
    payload.user_id = payload.user_id || user?.id || null;
    payload.organization_id = payload.organization_id || user?.organization_id || null;
    payload.subject = (payload.subject || '').trim();
    payload.message = (payload.message || '').trim();
    payload.category = normalizeSupportTicketEnum('category', payload.category, 'general');
    payload.priority = normalizeSupportTicketEnum('priority', payload.priority, 'normal');
    payload.assigned_to = payload.assigned_to || null;
    payload.status = normalizeSupportTicketEnum('status', payload.status, 'open');

    if (!payload.subject) {
      throw new Error('Support ticket subject is required');
    }
    if (!payload.message) {
      throw new Error('Support ticket message is required');
    }

    const data = await withAudit(
      'support_ticket.create',
      'support_ticket',
      async () => {
        const result = await supabase
          .from(TABLE_NAME)
          .insert([payload])
          .select()
          .single();
        if (result.error) throw result.error;
        return result.data;
      },
      { category: payload.category, priority: payload.priority }
    );

    return data;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
}

export async function updateSupportTicket(ticketId, input) {
  try {
    const payload = pickAllowedSupportTicketFields(input, SUPPORT_TICKET_UPDATE_FIELDS);

    if (Object.prototype.hasOwnProperty.call(payload, 'subject')) {
      payload.subject = (payload.subject || '').trim();
      if (!payload.subject) {
        throw new Error('Support ticket subject cannot be empty');
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'message')) {
      payload.message = (payload.message || '').trim();
      if (!payload.message) {
        throw new Error('Support ticket message cannot be empty');
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
      payload.category = normalizeSupportTicketEnum('category', payload.category);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'priority')) {
      payload.priority = normalizeSupportTicketEnum('priority', payload.priority);
    }

    if (Object.keys(payload).length === 0) {
      return getSupportTicket(ticketId);
    }

    payload.updated_at = new Date().toISOString();

    const data = await withAudit(
      'support_ticket.update',
      'support_ticket',
      async () => {
        const result = await supabase
          .from(TABLE_NAME)
          .update(payload)
          .eq('id', ticketId)
          .select()
          .single();
        if (result.error) throw result.error;
        return result.data;
      },
      { ticket_id: ticketId, fields: Object.keys(payload) }
    );

    return data;
  } catch (error) {
    console.error(`Error updating support ticket ${ticketId}:`, error);
    throw error;
  }
}

export async function deleteSupportTicket(ticketId) {
  try {
    const deletedTicket = await withAudit(
      'support_ticket.delete',
      'support_ticket',
      async () => {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('id', ticketId)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!data?.id) {
          throw new Error(
            'Support ticket was not deleted. It may no longer exist or be available to this account.'
          );
        }
        return data;
      },
      { ticket_id: ticketId }
    );

    return deletedTicket;
  } catch (error) {
    console.error(`Error deleting support ticket ${ticketId}:`, error);
    throw error;
  }
}

export async function updateTicketStatus(ticketId, status) {
  try {
    const normalizedStatus = normalizeSupportTicketEnum('status', status);
    const data = await withAudit(
      'support_ticket.status',
      'support_ticket',
      async () => {
        const result = await supabase
          .from(TABLE_NAME)
          .update({
            status: normalizedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId)
          .select()
          .single();
        if (result.error) throw result.error;
        return result.data;
      },
      { ticket_id: ticketId, status: normalizedStatus }
    );

    return data;
  } catch (error) {
    console.error(`Error updating ticket status ${ticketId}:`, error);
    throw error;
  }
}

export async function assignTicket(ticketId, assignedTo) {
  try {
    const data = await withAudit(
      'support_ticket.assign',
      'support_ticket',
      async () => {
        const result = await supabase
          .from(TABLE_NAME)
          .update({
            assigned_to: assignedTo,
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId)
          .select()
          .single();
        if (result.error) throw result.error;
        return result.data;
      },
      { ticket_id: ticketId, assigned_to: assignedTo }
    );

    return data;
  } catch (error) {
    console.error(`Error assigning ticket ${ticketId}:`, error);
    throw error;
  }
}
