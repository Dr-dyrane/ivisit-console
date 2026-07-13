import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

// Compatibility inventory only. These direct table operations do not establish
// command authority and must remain disconnected from active management UI.
const WRITABLE_FIELDS = new Set([
  'email',
  'type',
  'status',
  'new_user',
  'welcome_email_sent',
  'subscription_date',
]);

function toSubscriberWritePayload(input = {}, { forInsert = false } = {}) {
  const now = new Date().toISOString();
  const payload = {};

  if (forInsert) {
    payload.type = 'free';
    payload.status = 'pending';
    payload.new_user = true;
    payload.welcome_email_sent = false;
    payload.subscription_date = now;
    payload.created_at = now;
  }

  Object.entries(input || {}).forEach(([key, value]) => {
    if (WRITABLE_FIELDS.has(key) && value !== undefined) {
      payload[key] = value;
    }
  });

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    payload.email = String(payload.email || '').trim().toLowerCase();
  }

  payload.updated_at = now;
  return payload;
}

async function runSubscriberWrite(writeOperation, inputPayload) {
  const { data, error } = await writeOperation(inputPayload || {});
  if (error) throw error;
  return data;
}

export async function createSubscriber(input) {
  try {
    const email = String(input?.email || '').trim().toLowerCase();
    if (!email) {
      throw new Error('email is required');
    }

    const payload = toSubscriberWritePayload({ ...input, email }, { forInsert: true });
    const data = await runSubscriberWrite(
      (candidate) => supabase
        .from(TABLE_NAME)
        .insert([candidate])
        .select()
        .single(),
      payload
    );
    return data;
  } catch (error) {
    console.error('Error creating subscriber:', error);
    throw error;
  }
}

export async function updateSubscriber(subscriberId, input) {
  try {
    const payload = toSubscriberWritePayload(input, { forInsert: false });
    const data = await runSubscriberWrite(
      (candidate) => supabase
        .from(TABLE_NAME)
        .update(candidate)
        .eq('id', subscriberId)
        .select()
        .single(),
      payload
    );

    return data;
  } catch (error) {
    console.error(`Error updating subscriber ${subscriberId}:`, error);
    throw error;
  }
}

export async function deleteSubscriber(subscriberId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', subscriberId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error(`Error deleting subscriber ${subscriberId}:`, error);
    throw error;
  }
}

export async function updateSubscriberStatus(subscriberId, status) {
  try {
    const data = await runSubscriberWrite(
      (candidate) => supabase
        .from(TABLE_NAME)
        .update(candidate)
        .eq('id', subscriberId)
        .select()
        .single(),
      toSubscriberWritePayload({ status }, { forInsert: false })
    );

    return data;
  } catch (error) {
    console.error(`Error updating subscriber status for ${subscriberId}:`, error);
    throw error;
  }
}

export async function updateSubscriberType(subscriberId, type) {
  try {
    const data = await runSubscriberWrite(
      (candidate) => supabase
        .from(TABLE_NAME)
        .update(candidate)
        .eq('id', subscriberId)
        .select()
        .single(),
      toSubscriberWritePayload({ type }, { forInsert: false })
    );

    return data;
  } catch (error) {
    console.error(`Error updating subscriber type for ${subscriberId}:`, error);
    throw error;
  }
}

export async function markWelcomeEmailSent(subscriberId) {
  try {
    const data = await runSubscriberWrite(
      (candidate) => supabase
        .from(TABLE_NAME)
        .update(candidate)
        .eq('id', subscriberId)
        .select()
        .single(),
      toSubscriberWritePayload(
        {
          welcome_email_sent: true,
          new_user: false,
          status: 'active',
        },
        { forInsert: false }
      )
    );

    return data;
  } catch (error) {
    console.error(`Error marking welcome email sent for ${subscriberId}:`, error);
    throw error;
  }
}
