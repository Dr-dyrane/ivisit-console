const normalizeFilterList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const text = String(value || '').trim();
  return text ? [text] : [];
};

const sanitizeSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[%_,]/g, ' ')
  .replace(/\s+/g, ' ');

export function applyHospitalFilters(query, filter = {}) {
  if (filter?.id) {
    query = query.eq('id', filter.id);
  }

  if (filter?.organization_id) {
    query = query.eq('organization_id', filter.organization_id);
  }

  const statusValues = normalizeFilterList(filter?.status);
  if (statusValues.length === 1) {
    query = query.eq('status', statusValues[0]);
  } else if (statusValues.length > 1) {
    query = query.in('status', statusValues);
  }

  if (filter?.verified !== undefined) {
    query = query.eq('verified', filter.verified);
  }

  const verificationValues = normalizeFilterList(filter?.verification_status);
  if (verificationValues.length === 1) {
    query = query.eq('verification_status', verificationValues[0]);
  } else if (verificationValues.length > 1) {
    query = query.in('verification_status', verificationValues);
  }

  if (filter?.specialty) {
    query = query.contains('specialties', [filter.specialty]);
  }

  if (filter?.date_from) {
    query = query.gte('created_at', filter.date_from);
  }
  if (filter?.date_to) {
    query = query.lte('created_at', filter.date_to);
  }

  const search = sanitizeSearchTerm(filter?.search);
  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,display_id.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  return query;
}
