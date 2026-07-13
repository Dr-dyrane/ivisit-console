import { getCurrentUser, applyAuthFilter } from '../authService';
import { supabase } from '../../lib/supabase';

/**
 * Get available staff from existing profiles and doctors.
 */
export async function getAvailableStaff(hospitalId) {
  try {
    const user = await getCurrentUser();
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
      ? allStaff.filter(staffMember => staffMember.hospital_id === hospitalId)
      : allStaff;

  } catch (error) {
    console.error('Error fetching available staff:', error);
    throw error;
  }
}
