/**
 * Preferences Service
 * Handles all Supabase queries for preferences table
 * User settings and preferences management
 */

import { supabase } from '../lib/supabase';
import { Preferences } from '../types/index';

const TABLE_NAME = 'preferences';

export interface UpdatePreferencesInput {
  demo_mode_enabled?: boolean;
  notifications_enabled?: boolean;
  appointment_reminders?: boolean;
  emergency_updates?: boolean;
  privacy_share_medical_profile?: boolean;
  privacy_share_emergency_contacts?: boolean;
}

/**
 * Get preferences for user
 */
export async function getUserPreferences(userId: string): Promise<Preferences | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching preferences for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create default preferences for user
 */
export async function createUserPreferences(userId: string): Promise<Preferences> {
  try {
    const payload = {
      user_id: userId,
      demo_mode_enabled: false,
      notifications_enabled: true,
      appointment_reminders: true,
      emergency_updates: true,
      privacy_share_medical_profile: false,
      privacy_share_emergency_contacts: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error creating preferences for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  input: UpdatePreferencesInput
): Promise<Preferences> {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating preferences for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Toggle demo mode
 */
export async function toggleDemoMode(userId: string, enabled: boolean): Promise<Preferences> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        demo_mode_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling demo mode for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Toggle notifications
 */
export async function toggleNotifications(userId: string, enabled: boolean): Promise<Preferences> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        notifications_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling notifications for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Toggle appointment reminders
 */
export async function toggleAppointmentReminders(
  userId: string,
  enabled: boolean
): Promise<Preferences> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        appointment_reminders: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling appointment reminders for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Toggle emergency updates
 */
export async function toggleEmergencyUpdates(
  userId: string,
  enabled: boolean
): Promise<Preferences> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        emergency_updates: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling emergency updates for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Toggle medical profile sharing
 */
export async function toggleMedicalProfileSharing(
  userId: string,
  enabled: boolean
): Promise<Preferences> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        privacy_share_medical_profile: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling medical profile sharing for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Toggle emergency contact sharing
 */
export async function toggleEmergencyContactSharing(
  userId: string,
  enabled: boolean
): Promise<Preferences> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        privacy_share_emergency_contacts: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling emergency contact sharing for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to preferences updates
 */
export function subscribeToPreferences(
  userId: string,
  callback: (preferences: Preferences) => void
) {
  const channel = supabase
    .channel(`preferences_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as Preferences);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
