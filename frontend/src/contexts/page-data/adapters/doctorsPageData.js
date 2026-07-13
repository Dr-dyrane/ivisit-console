import { getDoctors } from '../../../services/doctorsService';

export const loadDoctorsPageData = async () => {
  const { data } = await getDoctors({ quiet: true });
  const total = data?.length || 0;
  const available = data?.filter((doctor) => doctor.status === 'available').length || 0;
  const busy = data?.filter((doctor) => doctor.status === 'busy').length || 0;
  const off_duty = data?.filter((doctor) => doctor.status === 'off_duty').length || 0;
  const onCall = data?.filter((doctor) => doctor.status === 'on_call').length || 0;

  return {
    stats: {
      total,
      totalDoctors: total,
      onCall,
      available,
      busy,
      off_duty,
    },
    recent: data?.slice(0, 5) || [],
  };
};
