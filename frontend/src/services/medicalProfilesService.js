/**
 * Medical Profiles Service
 * Handles all Supabase queries for medical_profiles table
 * Patient medical history and health data
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { isValidUUID } from '../lib/utils';

const TABLE_NAME = 'medical_profiles';

/**
 * Get medical profile for user
 * Admin users can see any medical profile, others see only their own
 */
export async function getUserMedicalProfile(userId) {
  try {
    if (!isValidUUID(userId)) return null;

    const user = await getCurrentUser();

    // Apply authorization - admins can see any profile, others only own
    if (user?.role !== 'admin' && userId !== user?.id) {
      throw new Error('Unauthorized: Cannot access other users medical profiles');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching medical profile for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create medical profile for user
 */
export async function createMedicalProfile(input) {
  try {
    const payload = {
      user_id: input.user_id,
      blood_type: input.blood_type,
      allergies: input.allergies,
      conditions: input.conditions,
      medications: input.medications,
      organ_donor: input.organ_donor || false,
      insurance_provider: input.insurance_provider,
      insurance_policy_number: input.insurance_policy_number,
      emergency_contact_name: input.emergency_contact_name,
      emergency_contact_phone: input.emergency_contact_phone,
      emergency_contact_relationship: input.emergency_contact_relationship,
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
    console.error('Error creating medical profile:', error);
    throw error;
  }
}

/**
 * Update medical profile
 * Admin users can update any profile, others only their own
 */
export async function updateMedicalProfile(userId, input) {
  try {
    const user = await getCurrentUser();

    // Apply authorization - admins can update any profile, others only own
    if (user?.role !== 'admin' && userId !== user?.id) {
      throw new Error('Unauthorized: Cannot update other users medical profiles');
    }

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
    console.error(`Error updating medical profile for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Add allergy to medical profile
 */
export async function addAllergy(userId, allergy) {
  try {
    const profile = await getUserMedicalProfile(userId);
    const allergies = profile?.allergies || [];
    if (!allergies.includes(allergy)) {
      allergies.push(allergy);
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        allergies: allergies,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error adding allergy for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Remove allergy from medical profile
 */
export async function removeAllergy(userId, allergy) {
  try {
    const profile = await getUserMedicalProfile(userId);
    const allergies = (profile?.allergies || []).filter((a) => a !== allergy);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        allergies: allergies,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error removing allergy for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Add medical condition
 */
export async function addCondition(userId, condition) {
  try {
    const profile = await getUserMedicalProfile(userId);
    const conditions = profile?.conditions || [];
    if (!conditions.includes(condition)) {
      conditions.push(condition);
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        conditions: conditions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error adding condition for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Remove medical condition
 */
export async function removeCondition(userId, condition) {
  try {
    const profile = await getUserMedicalProfile(userId);
    const conditions = (profile?.conditions || []).filter((c) => c !== condition);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        conditions: conditions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error removing condition for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Add medication
 */
export async function addMedication(userId, medication) {
  try {
    const profile = await getUserMedicalProfile(userId);
    const medications = profile?.medications || [];
    if (!medications.includes(medication)) {
      medications.push(medication);
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        medications: medications,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error adding medication for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Remove medication
 */
export async function removeMedication(userId, medication) {
  try {
    const profile = await getUserMedicalProfile(userId);
    const medications = (profile?.medications || []).filter((m) => m !== medication);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        medications: medications,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error removing medication for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to medical profile updates
 */
export function subscribeToMedicalProfile(userId, callback) {
  const channel = supabase
    .channel(`medical_profile_${userId}`)
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
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
