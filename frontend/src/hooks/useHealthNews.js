import { useState, useEffect, useCallback } from 'react';
import { 
  getHealthNews, 
  createHealthNews, 
  updateHealthNews, 
  deleteHealthNews,
  toggleHealthNewsPublish,
  bulkImportHealthNews,
  getHealthNewsAnalytics,
  subscribeToHealthNews
} from '../services/healthNewsService';

export const useHealthNews = () => {
  const [healthNews, setHealthNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Fetch health news
  const fetchHealthNews = useCallback(async (filter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHealthNews(filter);
      setHealthNews(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch health news');
      console.error('Error fetching health news:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create health news
  const createNews = useCallback(async (newsData) => {
    try {
      const newNews = await createHealthNews(newsData);
      setHealthNews((prev) => [newNews, ...prev]);
      return newNews;
    } catch (err) {
      setError(err.message || 'Failed to create health news');
      throw err;
    }
  }, []);

  // Update health news
  const updateNews = useCallback(async (id, updates) => {
    try {
      const updatedNews = await updateHealthNews(id, updates);
      setHealthNews((prev) => 
        prev.map((news) => news.id === id ? { ...news, ...updatedNews } : news)
      );
      return updatedNews;
    } catch (err) {
      setError(err.message || 'Failed to update health news');
      throw err;
    }
  }, []);

  // Delete health news
  const deleteNews = useCallback(async (id) => {
    try {
      await deleteHealthNews(id);
      setHealthNews((prev) => prev.filter((news) => news.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete health news');
      throw err;
    }
  }, []);

  // Toggle publish status
  const togglePublish = useCallback(async (id, published) => {
    try {
      const updatedNews = await toggleHealthNewsPublish(id, published);
      setHealthNews((prev) => 
        prev.map((news) => news.id === id ? { ...news, ...updatedNews } : news)
      );
      return updatedNews;
    } catch (err) {
      setError(err.message || 'Failed to toggle publish status');
      throw err;
    }
  }, []);

  // Bulk import
  const bulkImport = useCallback(async (newsItems) => {
    try {
      const importedNews = await bulkImportHealthNews(newsItems);
      setHealthNews((prev) => [...importedNews, ...prev]);
      return importedNews;
    } catch (err) {
      setError(err.message || 'Failed to bulk import health news');
      throw err;
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getHealthNewsAnalytics();
      setAnalytics(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchHealthNews();
  }, [fetchHealthNews]);

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToHealthNews((payload) => {
      console.log('Health news change:', payload);
      fetchHealthNews(); // Refetch on any change
    });

    return unsubscribe;
  }, [fetchHealthNews]);

  return {
    healthNews,
    loading,
    error,
    analytics,
    fetchHealthNews,
    createNews,
    updateNews,
    deleteNews,
    togglePublish,
    bulkImport,
    fetchAnalytics,
    clearError,
  };
};
