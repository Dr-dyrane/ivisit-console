/**
 * Support FAQs Service
 * Handles all Supabase queries for support_faqs table
 * FAQ database and management
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'support_faqs';
const SUPPORT_FAQ_WRITABLE_FIELDS = ['question', 'answer', 'category', 'rank'];

const isValidFaqId = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
};

const pickAllowedFields = (input, allowedFields) => {
  const payload = {};
  if (!input || typeof input !== 'object') return payload;
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
      payload[field] = input[field];
    }
  }
  return payload;
};

const normalizeRank = (value, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized >= 0 ? normalized : fallback;
};

function buildSupportFaqPayload(input = {}, { forInsert = false } = {}) {
  const payload = pickAllowedFields(input, SUPPORT_FAQ_WRITABLE_FIELDS);

  if (Object.prototype.hasOwnProperty.call(payload, 'question')) {
    payload.question = typeof payload.question === 'string' ? payload.question.trim() : '';
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'answer')) {
    payload.answer = typeof payload.answer === 'string' ? payload.answer.trim() : '';
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
    payload.category =
      typeof payload.category === 'string' && payload.category.trim()
        ? payload.category.trim()
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'rank')) {
    payload.rank = normalizeRank(payload.rank, 100);
  } else if (forInsert) {
    payload.rank = 100;
  }

  if (forInsert) {
    payload.created_at = new Date().toISOString();
  }

  return payload;
}

/**
 * Get all FAQs with optional filters
 */
export async function getSupportFAQs(filter) {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }

    query = query.order('rank', { ascending: true });

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching support FAQs:', error);
    throw error;
  }
}

/**
 * Get single FAQ by ID
 */
export async function getSupportFAQ(faqId) {
  try {
    if (!isValidFaqId(faqId)) return null;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', faqId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching support FAQ ${faqId}:`, error);
    throw error;
  }
}

/**
 * Create new FAQ
 */
export async function createSupportFAQ(input) {
  try {
    const payload = buildSupportFaqPayload(input, { forInsert: true });
    if (!payload.question || !payload.answer) {
      throw new Error('FAQ question and answer are required');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating support FAQ:', error);
    throw error;
  }
}

/**
 * Update FAQ
 */
export async function updateSupportFAQ(faqId, input) {
  try {
    const payload = buildSupportFaqPayload(input, { forInsert: false });
    if (Object.prototype.hasOwnProperty.call(payload, 'question') && !payload.question) {
      throw new Error('FAQ question cannot be empty');
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'answer') && !payload.answer) {
      throw new Error('FAQ answer cannot be empty');
    }
    if (Object.keys(payload).length === 0) {
      return getSupportFAQ(faqId);
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', faqId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating support FAQ ${faqId}:`, error);
    throw error;
  }
}

/**
 * Delete FAQ
 */
export async function deleteSupportFAQ(faqId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', faqId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting support FAQ ${faqId}:`, error);
    throw error;
  }
}

/**
 * Get FAQs by category
 */
export async function getFAQsByCategory(category) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('category', category)
      .order('rank', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching FAQs by category ${category}:`, error);
    throw error;
  }
}

/**
 * Search FAQs by keyword
 */
export async function searchFAQs(keyword) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .or(`question.ilike.%${keyword}%,answer.ilike.%${keyword}%`)
      .order('rank', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error searching FAQs with keyword ${keyword}:`, error);
    throw error;
  }
}

/**
 * Subscribe to FAQ updates
 */
export function subscribeToSupportFAQs(callback) {
  const channel = supabase
    .channel('support_faqs_all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new, payload.eventType);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
