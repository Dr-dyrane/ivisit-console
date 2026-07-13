import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { buildStaffPanelContext } from './staffPageModel';

export const useDoctorsRouteBridge = ({
  staffRows,
  stats,
  focusedStaff,
  loading,
  count,
  canManageStaff,
  fetchDoctors,
  setFocused,
  handleCreate,
  handleOpenFilters,
  handleOpenAnalytics,
}) => {
  const lastInsertToastAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    const channel = supabase
      .channel('doctors_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
        if (active) fetchDoctors();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doctors' }, (payload) => {
        if (!active || payload?.eventType !== 'INSERT') return;
        const now = Date.now();
        if (now - lastInsertToastAtRef.current < 10000) return;
        lastInsertToastAtRef.current = now;
        toast('New staff added', payload?.new?.name ? { description: payload.new.name } : undefined);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchDoctors]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (id && staffRows.some((doctor) => doctor.id === id)) setFocused(id);
  }, [staffRows, setFocused]);

  useEffect(() => {
    window.addEventListener('openDoctorModal', handleCreate);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openDoctorModal', handleCreate);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate, handleOpenAnalytics, handleOpenFilters]);

  const staffPanelContext = useMemo(() => buildStaffPanelContext({
    stats,
    staffRows,
    focusedStaff,
    loading,
    count,
    canManage: canManageStaff,
  }), [canManageStaff, count, focusedStaff, loading, staffRows, stats]);

  const publishStaffRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('doctorsRouteContextUpdated', { detail: staffPanelContext }));
  }, [staffPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishStaffRouteContext();
    window.addEventListener('requestDoctorsRouteContext', publishStaffRouteContext);
    return () => window.removeEventListener('requestDoctorsRouteContext', publishStaffRouteContext);
  }, [publishStaffRouteContext]);
};
