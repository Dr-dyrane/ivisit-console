/**
 * Patient Data Utilities
 * Standardized patient name and data mapping across all components
 * Follows Alexander-Apple DRY principles
 */

/**
 * Get standardized patient name from various data structures
 * @param {Object} data - Data object containing patient information
 * @returns {string} Standardized patient name
 */
export const getPatientName = (data) => {
  if (!data) return 'Unknown Patient';
  
  // Priority order for patient name sources
  const nameSources = [
    data.patient?.full_name,
    data.patient?.username,
    data.patient_snapshot?.fullName,
    data.patient_snapshot?.username,
    data.full_name,
    data.username,
    data.requester_name,
    data.patient_name,
    data.profiles?.full_name,
    data.profiles?.username
  ];
  
  const name = nameSources.find(name => name && name.trim() !== '');
  return name || 'Unknown Patient';
};

/**
 * Get patient contact information
 * @param {Object} data - Data object containing patient information
 * @returns {Object} Patient contact info {phone, email}
 */
export const getPatientContact = (data) => {
  const phoneSources = [
    data.patient?.phone,
    data.patient_snapshot?.phone,
    data.requester_phone,
    data.patient_phone,
    data.profiles?.phone,
    data.phone
  ];
  
  const emailSources = [
    data.patient?.email,
    data.patient_snapshot?.email,
    data.profiles?.email,
    data.email
  ];
  
  return {
    phone: phoneSources.find(phone => phone && phone.trim() !== '') || 'No contact',
    email: emailSources.find(email => email && email.trim() !== '') || 'No email'
  };
};

/**
 * Get patient avatar/image
 * @param {Object} data - Data object containing patient information
 * @returns {string} Avatar URL or null
 */
export const getPatientAvatar = (data) => {
  const avatarSources = [
    data.patient?.avatar,
    data.patient?.avatar_url,
    data.patient_snapshot?.avatar,
    data.patient_snapshot?.avatar_url,
    data.profiles?.avatar,
    data.profiles?.avatar_url,
    data.avatar_url
  ];
  
  return avatarSources.find(avatar => avatar && avatar.trim() !== '') || null;
};

/**
 * Get patient initials for avatar fallback
 * @param {string} name - Patient name
 * @returns {string} Initials (max 2 characters)
 */
export const getPatientInitials = (name) => {
  if (!name || name === 'Unknown Patient') return 'U';
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Standardized patient data object
 * @param {Object} data - Raw data object
 * @returns {Object} Standardized patient object
 */
export const getStandardizedPatient = (data) => {
  const name = getPatientName(data);
  const contact = getPatientContact(data);
  const avatar = getPatientAvatar(data);
  
  return {
    name,
    initials: getPatientInitials(name),
    phone: contact.phone,
    email: contact.email,
    avatar,
    id: data.patient?.id || data.profiles?.id || data.user_id || data.id
  };
};
