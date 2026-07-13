import { getCurrentUser, applyAuthFilter } from '../authService';
import { supabase } from '../../lib/supabase';

/**
 * Get all staff schedules from existing crew assignments.
 * Uses ambulances.crew array and doctor availability.
 */
export async function getStaffSchedules(filter = {}) {
  try {
    const user = await getCurrentUser();
    const results = {
      schedules: [],
      total: 0
    };

    // Get schedules from ambulance crew assignments (public read access)
    let ambulanceQuery = supabase
      .from('ambulances')
      .select(`
        id,
        call_sign,
        crew,
        hospital_id,
        hospital,
        status,
        type,
        created_at,
        updated_at
      `);

    // Apply RBAC
    ambulanceQuery = applyAuthFilter(ambulanceQuery, user, {
      orgIdField: 'hospital_id',
      resourceType: 'ambulance'
    });

    const { data: ambulances, error: ambulanceError } = await ambulanceQuery;

    if (ambulanceError) throw ambulanceError;

    // Transform crew assignments into schedule format
    const ambulanceSchedules = (ambulances || []).map(ambulance => {
      return (ambulance.crew || []).map((crewMember, index) => ({
        id: `${ambulance.id}_crew_${index}`,
        profile_id: null, // Crew members are stored as names, not IDs
        profile_name: crewMember,
        ambulance_id: ambulance.id,
        ambulance_call_sign: ambulance.call_sign,
        hospital_id: ambulance.hospital_id,
        hospital_name: ambulance.hospital,
        date: new Date().toISOString().split('T')[0], // Current date as default
        start_time: '00:00', // Full day shift
        end_time: '23:59',
        shift_type: 'day',
        status: ambulance.status === 'available' ? 'on_duty' : 'scheduled',
        notes: `Assigned to ${ambulance.call_sign}`,
        created_at: ambulance.created_at,
        updated_at: ambulance.updated_at,
        schedule_type: 'ambulance_crew'
      }));
    }).flat();

    // Get doctor schedules from doctors table
    let doctorQuery = supabase
      .from('doctors')
      .select(`
        id,
        name,
        profile_id,
        specialization,
        status,
        experience,
        hospital_id,
        created_at,
        updated_at,
        profiles!inner (
          id,
          full_name,
          username,
          email,
          phone
        )
      `);

    // Apply RBAC
    doctorQuery = applyAuthFilter(doctorQuery, user, {
      userIdField: 'profile_id',
      orgIdField: 'hospital_id'
    });

    const { data: doctors, error: doctorError } = await doctorQuery;

    if (doctorError) throw doctorError;

    // Transform doctors into schedule format
    const doctorSchedules = (doctors || []).map(doctor => ({
      id: `doctor_${doctor.id}`,
      profile_id: doctor.profile_id,
      profile_name: doctor.profiles?.full_name || doctor.name,
      doctor_id: doctor.id,
      hospital_id: doctor.hospital_id,
      specialization: doctor.specialization,
      date: new Date().toISOString().split('T')[0], // Current date as default
      start_time: '09:00', // Standard clinic hours
      end_time: '17:00',
      shift_type: 'day',
      status: doctor.status === 'available' ? 'on_duty' : 'off_duty',
      notes: `${doctor.specialization} - ${doctor.experience || 0} years experience`,
      created_at: doctor.created_at,
      updated_at: doctor.updated_at,
      schedule_type: 'doctor_shift'
    }));

    // Combine all schedules
    results.schedules = [...ambulanceSchedules, ...doctorSchedules];
    results.total = results.schedules.length;

    // Apply filters
    if (filter.hospital_id) {
      results.schedules = results.schedules.filter(s =>
        s.hospital_id === filter.hospital_id ||
        s.hospital_name === filter.hospital_id
      );
    }

    if (filter.status) {
      results.schedules = results.schedules.filter(s => s.status === filter.status);
    }

    if (filter.date_from) {
      results.schedules = results.schedules.filter(s => s.date >= filter.date_from);
    }

    if (filter.date_to) {
      results.schedules = results.schedules.filter(s => s.date <= filter.date_to);
    }

    results.total = results.schedules.length;

    return results;

  } catch (error) {
    console.error('Error fetching staff schedules:', error);
    throw error;
  }
}

/**
 * Get staff schedule by ID (limited implementation).
 */
export async function getStaffScheduleById(id) {
  try {
    await getCurrentUser();

    if (id.startsWith('doctor_')) {
      const doctorId = id.replace('doctor_', '');

      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles!inner (
            id,
            full_name,
            username,
            email,
            phone,
            role,
            provider_type
          )
        `)
        .eq('id', doctorId)
        .single();

      if (error) throw error;

      // Transform to schedule format
      return {
        id: id,
        profile_id: data.profile_id,
        profile_name: data.profiles?.full_name || data.name,
        doctor_id: data.id,
        hospital_id: data.hospital_id,
        specialization: data.specialization,
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        shift_type: 'day',
        status: data.status === 'available' ? 'on_duty' : 'off_duty',
        notes: `${data.specialization} - ${data.experience || 0} years experience`,
        created_at: data.created_at,
        updated_at: data.updated_at,
        schedule_type: 'doctor_shift',
        profiles: data.profiles
      };

    } else {
      throw new Error('Schedule ID not found or not supported');
    }

  } catch (error) {
    console.error('Error fetching staff schedule:', error);
    throw error;
  }
}
