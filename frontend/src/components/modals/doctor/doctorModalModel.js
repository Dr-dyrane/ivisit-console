const EMPTY_FORM = {
  name: '',
  specialization: '',
  phone: '',
  email: '',
  hospital_id: '',
  status: 'available',
  experience: '',
  license_number: '',
  about: '',
  consultation_fee: '',
};

const statusMeta = {
  available: {
    label: 'Available',
    className: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-300/16 dark:text-emerald-100',
  },
  busy: {
    label: 'Busy',
    className: 'bg-amber-500/12 text-amber-700 dark:bg-amber-300/16 dark:text-amber-100',
  },
  on_call: {
    label: 'On call',
    className: 'bg-sky-500/12 text-sky-700 dark:bg-sky-300/16 dark:text-sky-100',
  },
  off_duty: {
    label: 'Off duty',
    className: 'bg-foreground/[0.06] text-muted-foreground dark:bg-white/[0.07] dark:text-slate-200',
  },
  invited: {
    label: 'Invited',
    className: 'bg-violet-500/12 text-violet-700 dark:bg-violet-300/16 dark:text-violet-100',
  },
  unavailable: {
    label: 'Unavailable for assignment',
    className: 'bg-amber-500/12 text-amber-700 dark:bg-amber-300/16 dark:text-amber-100',
  },
};

export const normalizeStaffDirectoryStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  return value || 'available';
};

const formatStatusLabel = (status) => String(status || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getStaffStatusMeta = (status, isAvailable) => {
  const normalizedStatus = normalizeStaffDirectoryStatus(status);
  if (normalizedStatus === 'available' && isAvailable === false) {
    return statusMeta.unavailable;
  }
  return statusMeta[normalizedStatus] || {
    label: formatStatusLabel(normalizedStatus) || 'Unknown',
    className: statusMeta.off_duty.className,
  };
};

export const normalizeForm = (doctor) => ({
  ...EMPTY_FORM,
  name: doctor?.name || '',
  specialization: doctor?.specialization || '',
  phone: doctor?.phone || '',
  email: doctor?.email || '',
  hospital_id: doctor?.hospital_id || '',
  status: normalizeStaffDirectoryStatus(doctor?.status),
  experience: doctor?.experience == null ? '' : String(doctor.experience),
  license_number: doctor?.license_number || '',
  about: doctor?.about || '',
  consultation_fee: doctor?.consultation_fee || '',
});

export const cleanText = (value) => {
  const text = String(value || '').trim();
  return text.length > 0 ? text : null;
};

export const buildStaffPayload = (formData, { isCreate = false, isProfileLinked = false } = {}) => {
  const experience = formData.experience === '' ? null : Number(formData.experience);

  const payload = {
    specialization: cleanText(formData.specialization),
    hospital_id: formData.hospital_id || null,
    experience: Number.isFinite(experience) ? experience : null,
    license_number: cleanText(formData.license_number),
    about: cleanText(formData.about),
    consultation_fee: cleanText(formData.consultation_fee),
  };

  if (isCreate || !isProfileLinked) {
    payload.name = cleanText(formData.name);
    payload.phone = cleanText(formData.phone);
    payload.email = cleanText(formData.email);
  }

  // Database defaults own initial availability; ordinary directory edits do not
  // write lifecycle fields.

  return payload;
};

export const getFacilityName = (doctor, facilities, hospitalId) => {
  if (doctor?.hospitals?.name) return doctor.hospitals.name;
  if (!hospitalId) return 'No facility selected';
  return facilities.find((facility) => facility.id === hospitalId)?.name || 'Facility unavailable';
};

export const getInitials = (name = 'Staff') => name
  .split(' ')
  .map((part) => part.trim().charAt(0))
  .filter(Boolean)
  .slice(0, 2)
  .join('')
  .toUpperCase() || 'ST';
