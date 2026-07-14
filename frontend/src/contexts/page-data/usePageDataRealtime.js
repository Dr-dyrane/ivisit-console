import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const usePageDataRealtime = ({
  user,
  startupDomains,
  queryClient,
  fetchVerificationData,
  fetchVisitsData,
  fetchUsersData,
}) => {
  useEffect(() => {
    if (!user || !startupDomains.includes('emergency')) return;

    const channel = supabase
      .channel('emergency_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_requests' },
        () => queryClient.invalidateQueries({ queryKey: ['emergency'] })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, startupDomains, queryClient]);

  useEffect(() => {
    if (!user || !startupDomains.includes('doctors')) return;

    const channel = supabase
      .channel('doctor_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        () => queryClient.invalidateQueries({ queryKey: ['doctors'] })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, startupDomains, queryClient]);

  useEffect(() => {
    if (!user || !startupDomains.includes('visits')) return;

    const refreshVisibleVisits = () => {
      if (document.visibilityState === 'visible') fetchVisitsData();
    };

    window.addEventListener('focus', refreshVisibleVisits);
    document.addEventListener('visibilitychange', refreshVisibleVisits);

    return () => {
      window.removeEventListener('focus', refreshVisibleVisits);
      document.removeEventListener('visibilitychange', refreshVisibleVisits);
    };
  }, [user, startupDomains, fetchVisitsData]);

  useEffect(() => {
    if (
      !user
      || (!startupDomains.includes('verification') && !startupDomains.includes('users'))
    ) return;

    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          if (startupDomains.includes('verification')) fetchVerificationData();
          if (startupDomains.includes('users')) fetchUsersData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, startupDomains, fetchVerificationData, fetchUsersData]);
};
