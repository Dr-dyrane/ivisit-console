import { getCurrentUser } from '../authService';
import { supabase } from '../../lib/supabase';

/**
 * Get schedule statistics from existing data.
 */
export async function getScheduleStats(hospitalId, _dateFrom, _dateTo) {
  try {
    await getCurrentUser();

    // Get doctor stats
    let doctorQuery = supabase
      .from('doctors')
      .select('status, hospital_id');

    if (hospitalId) {
      doctorQuery = doctorQuery.eq('hospital_id', hospitalId);
    }

    const { data: doctors, error: doctorError } = await doctorQuery;

    if (doctorError) throw doctorError;

    // Get ambulance stats
    let ambulanceQuery = supabase
      .from('ambulances')
      .select('status');

    if (hospitalId) {
      // Filter by the ambulance's hospital_id directly (ambulances has hospital_id,
      // not a hospital-name column -- no need to resolve the name first).
      ambulanceQuery = ambulanceQuery.eq('hospital_id', hospitalId);
    }

    const { data: ambulances, error: ambulanceError } = await ambulanceQuery;

    if (ambulanceError) throw ambulanceError;

    const doctorStats = (doctors || []).reduce((acc, doctor) => {
      acc.total_shifts++;
      if (doctor.status === 'available') acc.on_duty++;
      else if (doctor.status === 'busy') acc.scheduled++;
      else acc.off_duty++;
      return acc;
    }, { total_shifts: 0, on_duty: 0, scheduled: 0, off_duty: 0 });

    const ambulanceStats = (ambulances || []).reduce((acc, ambulance) => {
      acc.total_shifts++;
      if (ambulance.status === 'available') acc.on_duty++;
      else if (ambulance.status === 'en_route' || ambulance.status === 'on_scene') acc.scheduled++;
      else acc.off_duty++;
      return acc;
    }, { total_shifts: 0, on_duty: 0, scheduled: 0, off_duty: 0 });

    const totalStats = {
      total_shifts: doctorStats.total_shifts + ambulanceStats.total_shifts,
      scheduled_today: doctorStats.scheduled + ambulanceStats.scheduled,
      this_week: doctorStats.on_duty + ambulanceStats.on_duty,
      by_status: {
        scheduled: doctorStats.scheduled + ambulanceStats.scheduled,
        on_duty: doctorStats.on_duty + ambulanceStats.on_duty,
        completed: 0, // Not tracked in current schema
        cancelled: 0
      },
      by_shift_type: {
        day: doctorStats.total_shifts, // Doctors typically day shifts
        evening: ambulanceStats.scheduled, // Ambulances various shifts
        night: ambulanceStats.on_duty
      }
    };

    return totalStats;

  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    throw error;
  }
}
