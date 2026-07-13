import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';

export function subscribeToHealthNews(callback) {
  const channel = supabase
    .channel('health_news_all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
