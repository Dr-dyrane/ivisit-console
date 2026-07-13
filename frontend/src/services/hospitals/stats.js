export function getHospitalVisibleStats(rows = []) {
  const data = Array.isArray(rows) ? rows : [];
  const total = data.length;
  const available = data.filter(h => h.status === 'available').length;
  const full = data.filter(h => h.status === 'full').length;
  const busy = data.filter(h => h.status === 'busy').length;
  const verified = data.filter(h => h.verified).length;
  const totalBeds = data.reduce((acc, h) => acc + (Number(h.available_beds) || 0), 0);
  const totalAmbulances = data.reduce((acc, h) => acc + (Number(h.ambulances_count) || 0), 0);

  return { total, available, full, busy, verified, totalBeds, totalAmbulances };
}
