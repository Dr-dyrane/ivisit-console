import { getVisitsPageData } from '../../../services/visitsService';

export const loadVisitsPageData = async () => {
  const page = await getVisitsPageData({
    quiet: true,
    range: { start: 0, end: 4 },
    sortConfig: { key: 'date', direction: 'desc' },
  });

  return {
    stats: page?.stats || null,
    recent: page?.visits || [],
  };
};
