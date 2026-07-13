export const deriveEmergencyStats = (emergencyData) => {
  if (emergencyData && emergencyData.stats) {
    return emergencyData.stats;
  }

  const safeData = Array.isArray(emergencyData) ? emergencyData : [];
  const ambulance = safeData.filter((request) => request.service_type === 'ambulance').length;
  const bed = safeData.filter((request) => request.service_type === 'bed').length;
  const booking = safeData.filter((request) => request.service_type === 'booking').length;
  const pending_approval = safeData.filter((request) => request.status === 'pending_approval').length;
  const inProgress = safeData.filter((request) => request.status === 'in_progress').length;
  const accepted = safeData.filter((request) => request.status === 'accepted').length;
  const arrived = safeData.filter((request) => request.status === 'arrived').length;
  const completed = safeData.filter((request) => request.status === 'completed').length;
  const active = pending_approval + inProgress + accepted + arrived;

  return {
    total: safeData.length,
    ambulance,
    bed,
    booking,
    pending_approval,
    pending: pending_approval,
    inProgress,
    accepted,
    arrived,
    completed,
    active,
  };
};

export const deriveDomainLoading = ({
  domainFetching,
  emergencyData,
  verificationData,
  doctorsData,
  visitsData,
  analyticsData,
  userData,
  walletData,
}) => ({
  emergency: Boolean(domainFetching.emergency)
    && emergencyData?.stats == null
    && (emergencyData?.recent?.length || 0) === 0,
  verification: Boolean(domainFetching.verification) && verificationData == null,
  doctors: Boolean(domainFetching.doctors) && doctorsData == null,
  visits: Boolean(domainFetching.visits) && visitsData == null,
  analytics: Boolean(domainFetching.analytics) && analyticsData == null,
  users: Boolean(domainFetching.users)
    && userData?.statistics == null
    && (userData?.users?.length || 0) === 0,
  wallet: Boolean(domainFetching.wallet)
    && walletData?.wallet == null
    && (walletData?.ledger?.length || 0) === 0,
});
