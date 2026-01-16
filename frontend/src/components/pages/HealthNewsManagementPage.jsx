import React, { useState, useEffect, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useHealthNews } from '../../hooks/useHealthNews';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { 
  Newspaper, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  Download,
  BarChart3,
  Filter,
  Search,
  Calendar,
  Globe,
  Tag,
  Clock
} from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ViewToggle } from '../common/ViewToggle';
import { HealthNewsModal } from '../modals/HealthNewsModal';
import { BulkImportModal } from '../modals/BulkImportModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { testDatabaseTables } from '../../utils/testDatabase';
import { runSimpleMigrations } from '../../utils/simpleMigrations';

const HEALTH_ICONS = [
  { value: 'medical-outline', label: 'Medical', icon: '🏥' },
  { value: 'business-outline', label: 'Business', icon: '🏢' },
  { value: 'research-outline', label: 'Research', icon: '🔬' },
  { value: 'wellness-outline', label: 'Wellness', icon: '💊' },
  { value: 'emergency-outline', label: 'Emergency', icon: '🚨' },
  { value: 'policy-outline', label: 'Policy', icon: '📋' },
];

const CATEGORIES = [
  'general', 'medical', 'research', 'wellness', 'emergency', 'policy'
];

const SOURCES = [
  'Hospital Update', 'Medical Journal', 'Health Authority', 'Research Institute',
  'Government Health', 'WHO Update', 'CDC Alert', 'Medical News'
];

export const HealthNewsManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const { 
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
    clearError 
  } = useHealthNews();

  const [selectedNews, setSelectedNews] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const { viewMode, setViewMode } = useViewMode('health-news-page', 'table');
  const pagination = usePagination(20);

  // Fetch analytics on mount
  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
    
    // Test database tables and run migrations if needed
    testDatabaseTables().then(results => {
      console.log('Database test results:', results);
      
      // If tables don't exist or missing columns, run migrations
      if (!results.healthNews || !results.supportTickets || !results.insurancePolicies) {
        console.log('🚀 Running database migrations...');
        runSimpleMigrations();
      }
    });
  }, [isAdmin, fetchAnalytics]);

  // Filter and search news
  const filteredNews = React.useMemo(() => {
    let filtered = healthNews;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(news => 
        news.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        news.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        news.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.published !== undefined) {
      filtered = filtered.filter(news => news.published === filters.published);
    }
    if (filters.category) {
      filtered = filtered.filter(news => news.category === filters.category);
    }
    if (filters.source) {
      filtered = filtered.filter(news => news.source === filters.source);
    }

    return filtered;
  }, [healthNews, searchTerm, filters]);

  // Paginated data
  const paginatedData = React.useMemo(() => {
    const start = pagination.paginationRange.start;
    const end = pagination.paginationRange.end;
    return filteredNews.slice(start, end + 1);
  }, [filteredNews, pagination.paginationRange]);

  // Update pagination when filtered data changes
  useEffect(() => {
    pagination.setTotalCount(filteredNews.length);
  }, [filteredNews.length, pagination]);

  const handleCreate = useCallback(() => {
    setSelectedNews(null);
    setModalMode('create');
  }, []);

  const handleEdit = useCallback((news) => {
    setSelectedNews(news);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (news) => {
    if (window.confirm(`Are you sure you want to delete "${news.title}"?`)) {
      try {
        await deleteNews(news.id);
        toast.success('Health news deleted successfully');
      } catch (error) {
        toast.error('Failed to delete health news');
      }
    }
  }, [deleteNews]);

  const handleTogglePublish = useCallback(async (news) => {
    try {
      await togglePublish(news.id, !news.published);
      toast.success(`Health news ${news.published ? 'unpublished' : 'published'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle publish status');
    }
  }, [togglePublish]);

  const handleBulkImport = useCallback(async (data) => {
    try {
      await bulkImport(data);
      toast.success(`${data.length} news items imported successfully`);
      setBulkImportModalOpen(false);
    } catch (error) {
      toast.error('Failed to import news items');
    }
  }, [bulkImport]);

  const handleExport = useCallback(() => {
    const csv = [
      ['Title', 'Source', 'Category', 'Published', 'Time', 'URL'],
      ...filteredNews.map(news => [
        news.title,
        news.source,
        news.category,
        news.published ? 'Yes' : 'No',
        news.time,
        news.url || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'health-news.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Health news exported successfully');
  }, [filteredNews]);

  // Header actions
  const headerActions = React.useMemo(() => (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search news..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {/* Filters */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFilterSheetOpen(true)}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        Filters
      </Button>

      {/* Analytics */}
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAnalyticsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>
      )}

      {/* Bulk Import */}
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBulkImportModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
      )}

      {/* Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      {/* Add New */}
      {isAdmin && (
        <Button
          onClick={handleCreate}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add News
        </Button>
      )}
    </div>
  ), [searchTerm, isAdmin, handleCreate, handleExport]);

  usePageHeader('Health News Management', headerActions);

  if (loading && healthNews.length === 0) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={clearError}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total News</p>
                <p className="text-2xl font-bold">{analytics.total}</p>
              </div>
              <Newspaper className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Published</p>
                <p className="text-2xl font-bold">{analytics.published}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-2xl font-bold">{analytics.recent}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(analytics.byCategory || {}).length}</p>
              </div>
              <Tag className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {filteredNews.length} items found
          </span>
        </div>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* News List/Table */}
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((news) => (
                    <tr key={news.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{news.icon === 'medical-outline' ? '🏥' : '📰'}</span>
                          <div className="text-sm font-medium text-gray-900">
                            {news.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Globe className="h-4 w-4 mr-1" />
                          {news.source}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {news.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={news.published ? 'success' : 'secondary'}>
                          {news.published ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {news.time}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePublish(news)}
                                className="h-8 w-8 p-0"
                              >
                                {news.published ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(news)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(news)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {paginatedData.map((news) => (
                <Card key={news.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">
                        {news.icon === 'medical-outline' ? '🏥' : '📰'}
                      </span>
                      <div>
                        <h3 className="font-medium text-gray-900 line-clamp-2">
                          {news.title}
                        </h3>
                        <p className="text-sm text-gray-500">{news.source}</p>
                      </div>
                    </div>
                    <Badge variant={news.published ? 'success' : 'secondary'}>
                      {news.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {news.time}
                    </div>
                    
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublish(news)}
                          className="h-8 w-8 p-0"
                        >
                          {news.published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(news)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Pagination */}
      <PaginationControls pagination={pagination} />

      {/* Modals */}
      <AnimatePresence>
        {modalMode && (
          <HealthNewsModal
            news={selectedNews}
            mode={modalMode}
            onClose={() => setModalMode(null)}
            onSave={modalMode === 'create' ? createNews : updateNews}
            icons={HEALTH_ICONS}
            categories={CATEGORIES}
            sources={SOURCES}
          />
        )}
        
        {filterSheetOpen && (
          <FilterSheet
            open={filterSheetOpen}
            onClose={() => setFilterSheetOpen(false)}
            filters={filters}
            setFilters={setFilters}
            categories={CATEGORIES}
            sources={SOURCES}
          />
        )}
        
        {analyticsModalOpen && (
          <AnalyticsModal
            open={analyticsModalOpen}
            onClose={() => setAnalyticsModalOpen(false)}
            analytics={analytics}
          />
        )}
        
        {bulkImportModalOpen && (
          <BulkImportModal
            open={bulkImportModalOpen}
            onClose={() => setBulkImportModalOpen(false)}
            onImport={handleBulkImport}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
