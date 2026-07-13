import { supabase } from '../../lib/supabase';
import { PROFILE_TABLE_NAME } from './constants';

export function subscribeToProfile(profileId, callback) {
  const channel = supabase
    .channel(`profile_${profileId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: PROFILE_TABLE_NAME,
        filter: `id=eq.${profileId}`,
      },
      (payload) => {
        if (payload.new) callback(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
