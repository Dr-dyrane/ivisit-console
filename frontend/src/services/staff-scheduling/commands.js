import { getCurrentUser } from '../authService';
import { supabase } from '../../lib/supabase';

/**
 * Create/Update staff schedule by modifying existing records.
 * For doctors: updates status in doctors table.
 * For ambulance crew: updates crew array in ambulances table.
 */
export async function createStaffSchedule(scheduleData) {
  try {
    await getCurrentUser();

    if (scheduleData.schedule_type === 'doctor_shift' && scheduleData.doctor_id) {
      // Update doctor status
      const { data, error } = await supabase
        .from('doctors')
        .update({
          status: scheduleData.status === 'on_duty' ? 'available' : 'busy',
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleData.doctor_id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, schedule_type: 'doctor_shift' };

    } else if (scheduleData.schedule_type === 'ambulance_crew' && scheduleData.ambulance_id) {
      // For ambulance crew, we'd need to update the crew array.
      // This is more complex since crew is stored as names, not IDs.
      throw new Error('Ambulance crew scheduling requires manual crew management');

    } else {
      throw new Error('Invalid schedule type or missing required fields');
    }

  } catch (error) {
    console.error('Error creating staff schedule:', error);
    throw error;
  }
}

/**
 * Update existing staff schedule.
 */
export async function updateStaffSchedule(id, updateData) {
  try {
    await getCurrentUser();

    // Parse schedule ID to determine type
    if (id.startsWith('doctor_')) {
      const doctorId = id.replace('doctor_', '');

      const { data, error } = await supabase
        .from('doctors')
        .update({
          status: updateData.status === 'on_duty' ? 'available' : 'busy',
          updated_at: new Date().toISOString()
        })
        .eq('id', doctorId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, schedule_type: 'doctor_shift' };

    } else {
      throw new Error('Only doctor schedules can be updated through this service');
    }

  } catch (error) {
    console.error('Error updating staff schedule:', error);
    throw error;
  }
}

/**
 * Delete staff schedule (revert to default status).
 */
export async function deleteStaffSchedule(id) {
  try {
    await getCurrentUser();

    // Parse schedule ID to determine type
    if (id.startsWith('doctor_')) {
      const doctorId = id.replace('doctor_', '');

      const { error } = await supabase
        .from('doctors')
        .update({
          status: 'off_duty',
          updated_at: new Date().toISOString()
        })
        .eq('id', doctorId);

      if (error) throw error;
      return true;

    } else {
      throw new Error('Only doctor schedules can be deleted through this service');
    }

  } catch (error) {
    console.error('Error deleting staff schedule:', error);
    throw error;
  }
}
