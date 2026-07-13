import {
  getEmergencyRequests,
  getEmergencyRequestsPageStats,
} from '../../../services/emergencyService';

export const loadEmergencyPageData = async () => {
  const [stats, recent] = await Promise.all([
    getEmergencyRequestsPageStats({}, undefined, true),
    getEmergencyRequests({ quiet: true, limit: 10 }),
  ]);

  return {
    stats: {
      total: stats.total,
      ambulance: stats.ambulance,
      bed: stats.bed,
      booking: stats.booking,
      pending_approval: stats.pending_approval,
      pending: stats.pending_approval,
      inProgress: stats.inProgress,
      accepted: stats.accepted,
      arrived: stats.arrived,
      completed: stats.completed,
      active: stats.active,
      mine: stats.mine,
    },
    recent: recent || [],
  };
};

export const createEmergencyFailureData = () => ({ stats: null, recent: [] });
