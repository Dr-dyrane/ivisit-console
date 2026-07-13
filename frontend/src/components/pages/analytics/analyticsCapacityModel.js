import { formatMetricNumber } from '../../analytics/AnalyticsSummaryPrimitives';

export const CAPACITY_SOURCE_UNAVAILABLE = 'Unavailable';

const getPopulationLabel = (capacity) => (
  capacity?.population === 'demo' ? 'demo hospitals' : 'hospitals'
);

export const getAnalyticsCapacityPresentation = ({ sourceReady, capacity }) => {
  if (!sourceReady || capacity?.sourceComplete !== true) {
    return {
      label: 'Bed capacity',
      value: CAPACITY_SOURCE_UNAVAILABLE,
      detail: 'Bed capacity reports are unavailable.',
    };
  }

  const facilityCount = Number(capacity?.facilityCount) || 0;
  const reportingFacilities = Number(capacity?.reportingFacilities) || 0;
  const populationLabel = getPopulationLabel(capacity);

  if (facilityCount === 0) {
    return {
      label: 'Bed capacity',
      value: 'No hospitals',
      detail: 'No hospitals are in this data scope.',
    };
  }

  if (reportingFacilities === 0 || !(Number(capacity?.total) > 0)) {
    return {
      label: 'Capacity reports',
      value: `0 of ${formatMetricNumber(facilityCount)}`,
      detail: `No valid bed capacity reports from ${formatMetricNumber(facilityCount)} ${populationLabel}.`,
    };
  }

  const available = Number(capacity.available);
  const total = Number(capacity.total);
  const percentage = Math.round((available / total) * 100);
  const reportingDetail = capacity?.coverageComplete
    ? `all ${formatMetricNumber(facilityCount)} ${populationLabel} reporting`
    : `${formatMetricNumber(reportingFacilities)} of ${formatMetricNumber(facilityCount)} ${populationLabel} reporting`;

  return {
    label: 'Reported bed availability',
    value: `${percentage}%`,
    detail: `${formatMetricNumber(available)} of ${formatMetricNumber(total)} beds reported available; ${reportingDetail}.`,
  };
};
