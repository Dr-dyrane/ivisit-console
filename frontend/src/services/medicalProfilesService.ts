/**
 * Medical Profiles Service
 * Handles all Supabase queries for medical_profiles table
 * Patient medical history and health data
 */

import { supabase } from '../lib/supabase';
import { MedicalProfile } from '../types/index';

const TABLE_NAME = 'medical_profiles';

export interface CreateMedicalProfileInput {
  user_id: string;
  blood_type?: string;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  organ_donor?: boolean;
  insurance_provider?: string;
  insurance_policy_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

export interface UpdateMedicalProfileInput {
  blood_type?: string;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  organ_donor?: boolean;
  insurance_provider?: string;
  insurance_policy_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

/**
 * Get medical profile for user
 */
export async function getUserMedicalProfile(userId: string): Promise<MedicalProfile | null> {
  try {
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
export async function createMedicalProfile(
  input: CreateMedicalProfileInput
): Promise<MedicalProfile> {
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
 */
export async function updateMedicalProfile(
  userId: string,
  input: UpdateMedicalProfileInput
): Promise<MedicalProfile> {
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
    console.error(`Error updating medical profile for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Add allergy to medical profile
 */
export async function addAllergy(userId: string, allergy: string): Promise<MedicalProfile> {
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
export async function removeAllergy(userId: string, allergy: string): Promise<MedicalProfile> {
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
export async function addCondition(userId: string, condition: string): Promise<MedicalProfile> {
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
export async function removeCondition(
  userId: string,
  condition: string
): Promise<MedicalProfile> {
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
export async function addMedication(userId: string, medication: string): Promise<MedicalProfile> {
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
export async function removeMedication(
  userId: string,
  medication: string
): Promise<MedicalProfile> {
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
export function subscribeToMedicalProfile(
  userId: string,
  callback: (profile: MedicalProfile) => void
) {
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
          callback(payload.new as MedicalProfile);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
