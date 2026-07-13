import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

export function subscribeToHospital(hospitalId, callback) {
  const channel = supabase
    .channel(`hospital_${hospitalId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${hospitalId}`,
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
