import { resolveVital } from '../../../constants/vitalTracks';
import { getVisitStatusKey } from '../../../utils/visitRowProjection';

export const countNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const visitStateAccent = (statusKey) => (
  resolveVital('visit', statusKey)?.accent || 'hsl(var(--muted-foreground))'
);

export const mobileVisitStates = [
  { id: 'all', label: 'All', countKey: 'total', color: 'hsl(var(--muted-foreground))' },
  { id: 'scheduled', label: 'Scheduled', countKey: 'scheduled', color: visitStateAccent('scheduled') },
  { id: 'in_progress', label: 'Active', countKey: 'inProgress', color: visitStateAccent('in_progress') },
  { id: 'completed', label: 'Done', countKey: 'completed', color: visitStateAccent('completed') },
  { id: 'cancelled', label: 'Cancelled', countKey: 'cancelled', color: visitStateAccent('cancelled') },
];

export const getMobileVisitStateCount = ({ item, statistics, visits }) => {
  const fallback = item.id === 'all'
    ? visits.length
    : visits.filter((visit) => getVisitStatusKey(visit?.status) === item.id).length;

  return countNumber(statistics?.[item.countKey], fallback);
};

export const hasMobileVisitFilters = (filters = {}) => Boolean(
  filters?.search
  || (filters?.status && filters.status.length > 0)
  || (filters?.visit_type && filters.visit_type.length > 0)
  || (filters?.care_mode && filters.care_mode.length > 0)
  || filters?.date
);

export const getCompactVisitKpiTransition = ({ nextKpi, viewMode, scheduledViewEnabled }) => {
  if (!scheduledViewEnabled) return { nextKpi, nextViewMode: null };

  if (nextKpi === 'scheduled') {
    return {
      nextKpi: null,
      nextViewMode: viewMode === 'scheduled' ? 'all' : 'scheduled',
    };
  }

  if (viewMode === 'scheduled') {
    return {
      nextKpi: nextKpi === 'all' ? null : nextKpi,
      nextViewMode: 'all',
    };
  }

  return { nextKpi, nextViewMode: null };
};

export const visitWhen = (visit) => (
  visit?.scheduled_start_at || visit?.date || visit?.scheduled_at || visit?.created_at
);
