import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

export function subscribeToAmbulance(ambulanceId, callback) {
  const channel = supabase
    .channel(`ambulance_${ambulanceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${ambulanceId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToAllAmbulances(callback) {
  const channel = supabase
    .channel('ambulances_all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new, payload.eventType);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
