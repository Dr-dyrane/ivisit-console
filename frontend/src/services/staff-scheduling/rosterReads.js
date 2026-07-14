import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { classifyScheduleError } from './projection';

const MAX_DOCTORS = 1000;

export async function getAvailableStaff(hospitalId) {
  try {
    const user = await getCurrentUser();
    if (!user || !['admin', 'org_admin'].includes(user.role)) {
      throw new Error('Not authorized to read schedule roster.');
    }
    if (!hospitalId) return [];

    const { data, error, count } = await supabase
      .from('doctors')
      .select('id, name, profile_id, specialization, status, hospital_id', { count: 'exact' })
      .eq('hospital_id', hospitalId)
      .order('name', { ascending: true })
      .range(0, MAX_DOCTORS - 1);
    if (error) throw error;
    if (Number.isFinite(count) && count > MAX_DOCTORS) {
      throw new Error('The facility clinician roster exceeds the supported selector window.');
    }

    return (data || []).map((doctor) => ({
      id: doctor.id,
      doctor_id: doctor.id,
      profile_id: doctor.profile_id,
      name: doctor.name || 'Unknown clinician',
      role: 'Doctor',
      department: doctor.specialization || 'General',
      specialization: doctor.specialization || 'General',
      hospital_id: doctor.hospital_id,
      roster_status: doctor.status || 'unknown',
      profile_type: 'doctor',
    }));
  } catch (error) {
    throw classifyScheduleError(error);
  }
}
