/**
 * Staff Scheduling Service
 * 
 * Works with existing database structure without requiring new migrations.
 * Leverages current tables: doctors, ambulances, profiles, hospitals.
 * 
 * Features:
 * - Doctor scheduling via status updates
 * - Ambulance crew viewing (read-only)
 * - Real-time statistics from existing data
 * - Conflict detection for doctors
 * 
 * @author iVisit Console Team
 * @version 1.0.0
 */

import { getCurrentUser, applyAuthFilter } from './authService';
import { supabase } from '../lib/supabase';

/**
 * Get all staff schedules from existing crew assignments
 * Uses ambulances.crew array and doctor availability
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
 * Get available staff from existing profiles and doctors
 */
export async function getAvailableStaff(hospitalId) {
  try {
    const user = await getCurrentUser();
    const staff = [];

    // Get doctors with hospital filtering (doctors have hospital_id field)
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
      .eq('status', 'available');

    // Apply RBAC
    doctorQuery = applyAuthFilter(doctorQuery, user, {
      userIdField: 'profile_id',
      orgIdField: 'hospital_id'
    });

    // Apply hospital filter if specified
    if (hospitalId) {
      doctorQuery = doctorQuery.eq('hospital_id', hospitalId);
    }

    const { data: doctors, error: doctorError } = await doctorQuery;

    if (doctorError) throw doctorError;

    // Transform doctors to staff format
    const doctorStaff = (doctors || []).map(doctor => ({
      id: doctor.profile_id,
      name: doctor.profiles?.full_name || doctor.name,
      role: 'Doctor',
      department: doctor.specialization || 'General',
      email: doctor.profiles?.email,
      phone: doctor.profiles?.phone,
      profile_type: 'doctor',
      doctor_id: doctor.id,
      hospital_id: doctor.hospital_id,
      experience: doctor.experience
    }));

    // Get other providers (drivers, paramedics, etc.)
    let providerQuery = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        username,
        email,
        phone,
        role,
        provider_type,
        organization_id
      `)
      .eq('role', 'provider')
      .in('provider_type', ['driver', 'paramedic', 'ambulance_service']);

    // Apply RBAC
    providerQuery = applyAuthFilter(providerQuery, user, {
      orgIdField: 'organization_id'
    });

    const { data: providers, error: providerError } = await providerQuery;

    if (providerError) throw providerError;

    // Transform providers to staff format
    const providerStaff = (providers || []).map(provider => ({
      id: provider.id,
      name: provider.full_name || provider.username,
      role: provider.provider_type === 'driver' ? 'Driver' :
        provider.provider_type === 'paramedic' ? 'Paramedic' : 'Staff',
      department: 'Emergency Services',
      email: provider.email,
      phone: provider.phone,
      profile_type: provider.provider_type,
      hospital_id: provider.organization_id
    }));

    // Combine and filter by hospital if specified
    const allStaff = [...doctorStaff, ...providerStaff];

    return hospitalId
      ? allStaff.filter(staff => staff.hospital_id === hospitalId)
      : allStaff;

  } catch (error) {
    console.error('Error fetching available staff:', error);
    throw error;
  }
}

/**
 * Create/Update staff schedule by modifying existing records
 * For doctors: updates status in doctors table
 * For ambulance crew: updates crew array in ambulances table
 */
export async function createStaffSchedule(scheduleData) {
  try {
    const user = await getCurrentUser();

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
      // For ambulance crew, we'd need to update the crew array
      // This is more complex since crew is stored as names, not IDs
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
 * Update existing staff schedule
 */
export async function updateStaffSchedule(id, updateData) {
  try {
    const user = await getCurrentUser();

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
 * Delete staff schedule (revert to default status)
 */
export async function deleteStaffSchedule(id) {
  try {
    const user = await getCurrentUser();

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

/**
 * Get schedule statistics from existing data
 */
export async function getScheduleStats(hospitalId, dateFrom, dateTo) {
  try {
    const user = await getCurrentUser();

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
      .select('status, hospital');

    if (hospitalId) {
      // Filter by hospital name match
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('name')
        .eq('id', hospitalId)
        .single();

      if (hospital) {
        ambulanceQuery = ambulanceQuery.eq('hospital', hospital.name);
      }
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

/**
 * Check for scheduling conflicts (limited implementation with existing schema)
 */
export async function checkScheduleConflicts(profileId, date, startTime, endTime, excludeScheduleId = null) {
  try {
    // With current schema, we can only check doctor conflicts
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('status')
      .eq('profile_id', profileId)
      .single();

    if (error) throw error;

    // Simple conflict check based on doctor status
    const hasConflict = doctor?.status === 'busy' || doctor?.status === 'on_call';

    return {
      has_conflicts: hasConflict,
      conflicts: hasConflict ? [{
        reason: `Doctor is currently ${doctor.status}`,
        doctor_status: doctor.status
      }] : []
    };

  } catch (error) {
    console.error('Error checking schedule conflicts:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates (doctors and ambulances)
 */
export function subscribeToScheduleUpdates(hospitalId, callback) {
  // Subscribe to doctor changes
  const doctorChannel = supabase
    .channel('doctor_schedule_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'doctors'
      },
      (payload) => {
        callback({
          type: 'doctor_update',
          payload: payload
        });
      }
    )
    .subscribe();

  // Subscribe to ambulance changes
  const ambulanceChannel = supabase
    .channel('ambulance_schedule_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ambulances'
      },
      (payload) => {
        callback({
          type: 'ambulance_update',
          payload: payload
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(doctorChannel);
    supabase.removeChannel(ambulanceChannel);
  };
}

/**
 * Get staff schedule by ID (limited implementation)
 */
export async function getStaffScheduleById(id) {
  try {
    const user = await getCurrentUser();

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
