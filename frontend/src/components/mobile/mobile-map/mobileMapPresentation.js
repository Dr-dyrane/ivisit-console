export const statusLabel = (value, fallback = '') => {
  const text = String(value || fallback).replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const formatRequestTime = (value) => {
  if (!value) return 'Time not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time not recorded';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ambulanceStatusTone = (value) => {
  const status = String(value || '').toLowerCase();
  if (status === 'available') return 'text-emerald-600 dark:text-emerald-300';
  if (['assigned', 'busy', 'en_route', 'in_use'].includes(status)) {
    return 'text-amber-600 dark:text-amber-300';
  }
  return 'text-foreground/70';
};

export const getMobileMapKpis = (mapData) => {
  const requests = Array.isArray(mapData?.emergencyRequests) ? mapData.emergencyRequests : [];
  const requestSource = mapData?.sourceState?.emergencies;
  const exactTotal = Number.isFinite(requestSource?.total) ? requestSource.total : null;
  const facetValue = (serviceType) => {
    const exactFacet = requestSource?.facets?.[serviceType]?.total;
    if (Number.isFinite(exactFacet)) return exactFacet;
    if (requestSource?.partial) return 'N/A';
    return requests.filter((item) => item?.service_type === serviceType).length;
  };

  return [
    {
      id: 'all',
      label: 'All',
      value: exactTotal ?? (requestSource?.partial ? `${requests.length}+` : requests.length),
    },
    { id: 'ambulance', label: 'Ambulance', value: facetValue('ambulance') },
    { id: 'bed', label: 'Bed', value: facetValue('bed') },
  ];
};
