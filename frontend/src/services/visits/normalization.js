export function normalizeVisitForUI(visit) {
  if (!visit) return visit;
  return {
    ...visit,
    doctor: visit.doctor ?? visit.doctor_name ?? null,
    visit_type: visit.visit_type ?? visit.type ?? null,
    room_number: visit.room_number ?? null,
  };
}
