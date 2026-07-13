/**
 * Health News service compatibility facade.
 *
 * Keep consumer imports stable while domain ownership lives in ./health-news.
 */

export {
  getHealthNewsPage,
  getHealthNewsPageStats,
} from './health-news/pageQueries';
export {
  getHealthNews,
  getHealthNewsItem,
  getLatestHealthNews,
  getNewsByCategory,
} from './health-news/queries';
export {
  bulkImportHealthNews,
  createHealthNews,
  deleteHealthNews,
  toggleHealthNewsPublish,
  updateHealthNews,
} from './health-news/commands';
export { getHealthNewsAnalytics } from './health-news/analytics';
export { subscribeToHealthNews } from './health-news/realtime';
