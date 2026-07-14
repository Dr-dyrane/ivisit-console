import { supabase } from '../../lib/supabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REALTIME_DOCTORS = 100;
const noSubscription = () => {};

export function subscribeToScheduleUpdates(hospitalId, doctorIds, callback) {
  const scopedDoctorIds = [...new Set(Array.isArray(doctorIds) ? doctorIds : [])]
    .filter((doctorId) => UUID_PATTERN.test(String(doctorId)));
  if (!hospitalId || scopedDoctorIds.length === 0 || scopedDoctorIds.length > MAX_REALTIME_DOCTORS) {
    return noSubscription;
  }

  const channelId = globalThis.crypto?.randomUUID?.() || Date.now();
  const channel = supabase.channel(`doctor-schedules-${hospitalId}-${channelId}`);
  scopedDoctorIds.forEach((doctorId) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'doctor_schedules',
        filter: `doctor_id=eq.${doctorId}`,
      },
      (payload) => callback?.({ type: 'doctor_schedule_update', hospitalId, payload }),
    );
  });
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
