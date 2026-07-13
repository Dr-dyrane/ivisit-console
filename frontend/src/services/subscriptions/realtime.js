import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

export function subscribeToSubscribers(callback) {
  const channel = supabase
    .channel('subscribers_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToNewSubscribers(callback) {
  const channel = supabase
    .channel('new_subscribers')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
