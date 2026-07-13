import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

export function subscribeToSupportTickets(callback) {
  const channel = supabase
    .channel('support_tickets_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
