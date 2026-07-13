import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { getRequestServiceLabel } from './requestPageModel';

export const useEmergencyRequestsRealtime = () => {
  const queryClient = useQueryClient();
  const lastInsertToastAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    const channel = supabase
      .channel('emergency_requests_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, () => {
        if (active) queryClient.invalidateQueries({ queryKey: ['emergency'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergency_requests' }, (payload) => {
        if (!active || payload?.eventType !== 'INSERT') return;
        const now = Date.now();
        if (now - lastInsertToastAtRef.current < 10000) return;
        lastInsertToastAtRef.current = now;
        const serviceLabel = payload?.new?.service_type ? getRequestServiceLabel(payload.new) : '';
        toast('New request received', serviceLabel ? { description: serviceLabel } : undefined);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        if (active) queryClient.invalidateQueries({ queryKey: ['emergency'] });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
