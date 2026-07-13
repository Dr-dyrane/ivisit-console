import { supabase } from '../../lib/supabase';

/**
 * Subscribe to real-time updates (doctors and ambulances).
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
