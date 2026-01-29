/**
 * Hospital Data Utilities
 * Standardized hospital information mapping across all components
 * Follows Alexander-Apple DRY principles
 */

/**
 * Get standardized hospital name from various data structures
 * @param {Object} data - Data object containing hospital information
 * @returns {string} Standardized hospital name
 */
export const getHospitalName = (data) => {
  if (!data) return 'Unknown Facility';
  
  // Priority order for hospital name sources
  const nameSources = [
    data.hospital?.name,
    data.hospitals?.name,
    data.hospital_name,
    data.hospital,
    data.name
  ];
  
  const name = nameSources.find(name => name && name.trim() !== '');
  return name || 'Unknown Facility';
};

/**
 * Get standardized hospital address from various data structures
 * @param {Object} data - Data object containing hospital information
 * @returns {string} Standardized hospital address
 */
export const getHospitalAddress = (data) => {
  if (!data) return 'No address';
  
  const addressSources = [
    data.hospital?.address,
    data.hospitals?.address,
    data.address
  ];
  
  const address = addressSources.find(addr => addr && addr.trim() !== '');
  return address || 'No address';
};

/**
 * Get standardized hospital contact information
 * @param {Object} data - Data object containing hospital information
 * @returns {Object} Hospital contact info {phone, address}
 */
export const getHospitalContact = (data) => {
  const phoneSources = [
    data.hospital?.phone,
    data.hospitals?.phone,
    data.phone
  ];
  
  return {
    name: getHospitalName(data),
    address: getHospitalAddress(data),
    phone: phoneSources.find(phone => phone && phone.trim() !== '') || 'No phone'
  };
};

/**
 * Get hospital ID from various data structures
 * @param {Object} data - Data object containing hospital information
 * @returns {string} Hospital ID
 */
export const getHospitalId = (data) => {
  if (!data) return null;
  
  const idSources = [
    data.hospital?.id,
    data.hospitals?.id,
    data.hospital_id
  ];
  
  return idSources.find(id => id) || null;
};

/**
 * Standardized hospital data object
 * @param {Object} data - Raw data object
 * @returns {Object} Standardized hospital object
 */
export const getStandardizedHospital = (data) => {
  const contact = getHospitalContact(data);
  
  return {
    id: getHospitalId(data),
    name: contact.name,
    address: contact.address,
    phone: contact.phone,
    specialty: data.hospital?.specialty || data.hospitals?.specialty || data.specialty
  };
};
