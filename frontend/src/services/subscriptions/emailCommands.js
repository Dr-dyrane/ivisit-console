import { supabase } from '../../lib/supabase';
import { getSubscriber } from './reads';

// These legacy Edge invocations are compatibility inventory, not proof that the
// active management UI owns consent, authorization, or delivery lifecycle.
export async function sendWelcomeEmail(email) {
  try {
    const { data, error } = await supabase.functions.invoke('sendWelcome', {
      body: { email },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

export async function sendWelcomeToSubscriber(subscriberId) {
  const subscriber = await getSubscriber(subscriberId);
  if (!subscriber?.email) {
    throw new Error('Subscriber not found');
  }

  if (subscriber.welcome_email_sent) {
    return {
      subscriber,
      emailResult: { success: true, skipped: true, reason: 'already_sent' },
      marked: true,
    };
  }

  const emailResult = await sendWelcomeEmail(subscriber.email);
  const refreshed = await getSubscriber(subscriberId);

  return {
    subscriber: refreshed || subscriber,
    emailResult,
    marked: Boolean(refreshed?.welcome_email_sent),
  };
}

export async function sendCustomEmail(subscriber, subject, content) {
  try {
    if (!subscriber.email) {
      throw new Error('No valid email address found');
    }

    const { data, error } = await supabase.functions.invoke('sendCustomEmail', {
      body: {
        email: subscriber.email,
        subject,
        content,
      },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw error;
  }
}

export async function sendBulkEmail(subscribers, subject, content) {
  try {
    const emails = subscribers.map((subscriber) => subscriber.email).filter((email) => email);

    if (emails.length === 0) {
      throw new Error('No valid email addresses found');
    }

    const { data, error } = await supabase.functions.invoke('sendBulkEmail', {
      body: {
        emails,
        subject,
        content,
      },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error sending bulk email:', error);
    throw error;
  }
}
