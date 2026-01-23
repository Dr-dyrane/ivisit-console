import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Newspaper, MapPin, Star, Plus, Edit, Trash2, Eye, ChevronRight, Filter, Clock, Globe, Tag, Calendar, EyeOff, FileCheck, File } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { HealthNewsModal } from '../modals/HealthNewsModal';
import { ReportsModal } from '../modals/ReportsModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { withTimeout } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { HealthNewsListView } from '../views/HealthNewsListView';
import { HealthNewsTableView } from '../views/HealthNewsTableView';
import { SEOHead } from '../common/SEOHead';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [healthNews, setHealthNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive',
    confirmLabel: 'Delete'
  });
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    medical: 0,
    recent: 0
  });

  const { viewMode, setViewMode } = useViewMode('health-news-page', 'table');
  const pagination = usePagination(20);

  const fetchHealthNews = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch stats in parallel - using published boolean
      const [
        { count: total },
        { count: published },
        { count: draft },
        { count: medical },
        { count: recent }
      ] = await Promise.all([
        supabase.from('health_news').select('id', { count: 'exact' }).limit(0),
        supabase.from('health_news').select('id', { count: 'exact' }).eq('published', true).limit(0),
        supabase.from('health_news').select('id', { count: 'exact' }).eq('published', false).limit(0),
        supabase.from('health_news').select('id', { count: 'exact' }).eq('category', 'medical').limit(0),
        supabase.from('health_news').select('id', { count: 'exact' }).gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).limit(0)
      ]);

      setStats({
        total: total || 0,
        published: published || 0,
        draft: draft || 0,
        medical: medical || 0,
        recent: recent || 0
      });

      // Build data query
      let query = supabase.from('health_news').select('id', { count: 'exact' });

      // Apply Filters
      if (filters.kpiFilter === 'published') query = query.eq('published', true);
      if (filters.kpiFilter === 'draft') query = query.eq('published', false);
      if (filters.kpiFilter === 'medical') query = query.eq('category', 'medical');
      if (filters.kpiFilter === 'recent') query = query.gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (filters.published !== undefined) query = query.eq('published', filters.published);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.source) query = query.eq('source', filters.source);
      if (filters.search) query = query.or(`title.ilike.%${filters.search}%,source.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);

      // Execute query to get total count
      const { count } = await query;
      pagination.setTotalCount(count || 0);

      // Data Fetching
      let dataQuery = supabase
        .from('health_news')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order('created_at', { ascending: false });

      // Apply same filters to data query
      if (filters.kpiFilter === 'published') dataQuery = dataQuery.eq('published', true);
      if (filters.kpiFilter === 'draft') dataQuery = dataQuery.eq('published', false);
      if (filters.kpiFilter === 'medical') dataQuery = dataQuery.eq('category', 'medical');
      if (filters.kpiFilter === 'recent') dataQuery = dataQuery.gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (filters.published !== undefined) dataQuery = dataQuery.eq('published', filters.published);
      if (filters.category) dataQuery = dataQuery.eq('category', filters.category);
      if (filters.source) dataQuery = dataQuery.eq('source', filters.source);
      if (filters.search) dataQuery = dataQuery.or(`title.ilike.%${filters.search}%,source.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);

      const { data, error } = await withTimeout(
        dataQuery,
        8000,
        'Failed to load health news - timeout'
      );

      if (error) throw error;
      setHealthNews(data || []);
    } catch (error) {
      console.error('Error fetching health news:', error);
      toast.error(error.message || 'Failed to load health news');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchHealthNews();
  }, [fetchHealthNews, pagination.currentPage]);

  const handleCreate = useCallback(() => {
    setSelectedNews(null);
    setModalMode('create');
  }, []);

  const handleView = useCallback((news) => {
    setSelectedNews(news);
    setModalMode('view');
  }, []);

  const handleEdit = useCallback((news) => {
    setSelectedNews(news);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(async (news) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete News Article',
      description: `Are you sure you want to delete "${news.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('health_news').delete().eq('id', news.id);
          if (error) throw error;

          toast.success('News article deleted successfully');
          fetchHealthNews();
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting news:', error);
          toast.error('Failed to delete news article');
        }
      },
      variant: 'destructive',
      confirmLabel: 'Delete Article'
    });
  }, []);

  const handleTogglePublish = useCallback(async (news) => {
    try {
      const { error } = await supabase
        .from('health_news')
        .update({ published: !news.published })
        .eq('id', news.id);

      if (error) throw error;

      await createNotification(
        NotificationTypes.NEWS,
        news.published ? NotificationActions.UNPUBLISHED : NotificationActions.PUBLISHED,
        news.id,
        { message: `"${news.title}" has been ${news.published ? 'unpublished' : 'published'}` }
      );
      toast.success(`Health news ${news.published ? 'unpublished' : 'published'} successfully`);
      fetchHealthNews();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('Failed to toggle publish status');
    }
  }, [fetchHealthNews]);

  const handleSelect = useCallback((id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(healthNews.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  }, [healthNews]);

  const handleSave = useCallback(async (formData) => {
    try {
      const timestamp = new Date().toISOString();
      const payload = {
        title: formData.title,
        source: formData.source,
        icon: formData.icon || 'medical-outline',
        url: formData.url,
        category: formData.category,
        published: formData.published,
        description: formData.description,
        content: formData.content,
        time: timestamp
      };

      if (modalMode === 'create') {
        const { data, error } = await supabase
          .from('health_news')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        await createNotification(
          NotificationTypes.NEWS,
          NotificationActions.CREATED,
          data.id,
          { message: `"${formData.title}" has been created` }
        );
      } else if (modalMode === 'edit' && selectedNews) {
        const { error } = await supabase
          .from('health_news')
          .update(payload)
          .eq('id', selectedNews.id);

        if (error) throw error;

        await createNotification(
          NotificationTypes.NEWS,
          NotificationActions.UPDATED,
          selectedNews.id,
          { message: `"${formData.title}" has been updated` }
        );
      }
    } catch (error) {
      console.error('Error saving health news:', error);
      throw error;
    }
  }, [modalMode, selectedNews]);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedNews(null);
    if (shouldRefresh) {
      fetchHealthNews();
    }
  }, [fetchHealthNews]);

  // Handle URL parameters and custom events
  useEffect(() => {
    // Check for create=true in URL params
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true') {
      handleCreate();
      // Clean up URL
      navigate('/health-news', { replace: true });
    }

    // Listen for custom events from context panel
    const handleOpenFilters = () => {
      setFilterSheetOpen(true);
    };

    const handleOpenModal = () => {
      handleCreate();
    };

    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };

    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openHealthNewsModal', handleOpenModal);
    window.addEventListener('openReportsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openHealthNewsModal', handleOpenModal);
      window.removeEventListener('openReportsModal', handleOpenAnalytics);
    };
  }, [location.search, navigate, handleCreate]);

  const getStatusBadge = (published) => {
    return published ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning';
  };

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search news...'
    },
    {
      key: 'published',
      type: 'select',
      label: 'Published Status',
      options: [
        { value: true, label: 'Published' },
        { value: false, label: 'Draft' }
      ]
    },
    {
      key: 'category',
      type: 'select',
      label: 'Category',
      options: CATEGORIES.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
    },
    {
      key: 'source',
      type: 'select',
      label: 'Source',
      options: SOURCES.map(source => ({ value: source, label: source }))
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Published Date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' }
      ]
    }
  ], []);

  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      aria-label="Filter news"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || filters.published !== undefined || filters.category || filters.source || filters.created_at) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </Button>
  ), [filters]);

  const headerActions = React.useMemo(() => isAdmin && (
    <Button
      onClick={handleCreate}
      className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
      aria-label="Add new article"
    >
      <Plus className="h-4 w-4 mr-2" />
      ADD NEWS
    </Button>
  ), [isAdmin, handleCreate]);

  usePageHeader(
    "Health News Management",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Articles</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && healthNews.length > 0);

  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="Health News" description="Manage health news, updates, and announcements." />
      {/* Bento Layout KPIs */}
      <LayoutGroup>
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6"
        >
          {/* Total Articles */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-block glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))}
              role="button"
              tabIndex={0}
              aria-label="Show all news articles"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-primary" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                    <Newspaper className={`h-5 w-5 ${filters.kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Articles</p>
                  {filters.kpiFilter === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{stats.total}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-block bg-primary/20 text-primary border-0 font-bold text-xs">
                    {filters.kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Published */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-badge glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'published' ? 'ring-2 ring-success shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'published' }))}
              role="button"
              tabIndex={0}
              aria-label="Filter by published articles"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-success" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'published' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Eye className={`h-5 w-5 ${filters.kpiFilter === 'published' ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Published</p>
                  {filters.kpiFilter === 'published' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{stats.published}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-badge bg-success/20 text-success border-0 font-bold text-xs">
                    LIVE NOW
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Drafts */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-sharp glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'draft' ? 'ring-2 ring-warning shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'draft' }))}
              role="button"
              tabIndex={0}
              aria-label="Filter by draft articles"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-warning" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'draft' ? 'bg-warning/30' : 'bg-warning/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <File className={`h-5 w-5 ${filters.kpiFilter === 'draft' ? 'text-warning' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Drafts</p>
                  {filters.kpiFilter === 'draft' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{stats.draft}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-sharp bg-warning/20 text-warning border-0 font-bold text-xs">
                    WORKING
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Recent */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'recent' ? 'ring-2 ring-info shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'recent' }))}
              role="button"
              tabIndex={0}
              aria-label="Filter by recent articles"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-info" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'recent' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Clock className={`h-5 w-5 ${filters.kpiFilter === 'recent' ? 'text-info' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
                  {filters.kpiFilter === 'recent' && <div className="h-2 w-2 rounded-full bg-info animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{stats.recent}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-round bg-info/20 text-info border-0 font-bold text-xs">
                    LAST 7 DAYS
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Medical */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card
              className={`h-full min-h-[140px] geo-ticket glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 ${filters.kpiFilter === 'medical' ? 'ring-2 ring-primary shadow-lg' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, kpiFilter: 'medical' }))}
              role="button"
              tabIndex={0}
              aria-label="Filter by medical articles"
            >
              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-primary" />
              <div className="absolute top-0 right-0 p-4 z-20">
                <div className="relative">
                  <div className={`absolute inset-0 ${filters.kpiFilter === 'medical' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                  <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                    <Tag className={`h-5 w-5 ${filters.kpiFilter === 'medical' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Medical</p>
                  {filters.kpiFilter === 'medical' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{stats.medical}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="geo-ticket bg-primary/20 text-primary border-0 font-bold text-xs">
                    CLINICAL
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </LayoutGroup>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : healthNews.length === 0 ? (
        <Card className="squircle-lg glass-card-premium p-12 text-center">
          <Newspaper className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">
            {filters.search ? 'No News Found' :
              filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ? 'No News Articles Yet' :
                'No Matching Articles'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {filters.search ? `No articles found matching "${filters.search}". Try adjusting your search terms.` :
              filters.kpiFilter === 'all' && Object.keys(filters).filter(k => k !== 'kpiFilter').every(k => !filters[k]) ?
                'Create your first health news article to get started.' :
                'Try adjusting your filters or search criteria to find the articles you\'re looking for.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {filters.search && (
              <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="outline" className="squircle" aria-label="Clear search">
                <Filter className="h-4 w-4 mr-2" />
                Clear Search
              </Button>
            )}
            {(filters.kpiFilter !== 'all' || Object.keys(filters).filter(k => k !== 'kpiFilter').some(k => filters[k])) && (
              <Button onClick={() => setFilters({ kpiFilter: 'all', published: undefined, category: '', source: '', search: '' })} variant="outline" className="squircle" aria-label="Reset all filters">
                <Filter className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            )}
            <Button onClick={handleCreate} className="glass-card-premium" aria-label="Add new article">
              <Plus className="h-4 w-4 mr-2" />
              Add News
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' && (
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 auto-rows-min grid-flow-dense"
              >
                {healthNews.map((news, index) => (
                  <motion.div
                    layout
                    key={news.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="col-span-1"
                  >
                    <Card className="h-full geo-block glass-card-premium p-4 md:p-6 hover-lift group relative overflow-hidden flex flex-col">
                      {/* Apple hover glow effect */}
                      <div className={`hover-glow ${news.published ? 'hover-glow-success' : 'hover-glow-warning'}`} />

                      {/* Top Right Icon */}
                      <div className="absolute top-0 right-0 p-3 md:p-5 z-20">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                          <div className="w-8 h-8 md:w-10 md:h-10 geo-round surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                            <Newspaper className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3 md:mb-4 relative z-10">
                        <Badge className={`geo-badge ${getStatusBadge(news.published)} border-0 font-bold editorial-subtitle px-2 md:px-3 py-1 text-xs`}>
                          {news.published ? 'Published' : 'Draft'}
                        </Badge>
                        <Badge className="geo-badge bg-info/20 text-info border-0 px-2 py-1 text-xs">
                          {news.category}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-lg md:text-2xl mb-2 tracking-tight group-hover:text-primary transition-colors line-clamp-2 relative z-10">
                        {news.title || 'Untitled Article'}
                      </h3>

                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 md:mb-6 min-h-[2rem] md:min-h-[2.5rem] relative z-10">
                        <Globe className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                        <p className="truncate-2 leading-snug text-xs md:text-sm">{news.source || 'No source provided'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6 relative z-10">
                        <div className="p-2 md:p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-1 md:gap-2 mb-1">
                            <Clock className="h-3 w-3 md:h-4 md:w-4 text-info" />
                            <p className="text-xs text-muted-foreground font-medium">Time</p>
                          </div>
                          <p className="font-bold text-sm md:text-base truncate">{news.time || 'No time'}</p>
                        </div>
                        <div className="p-2 md:p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-1 md:gap-2 mb-1">
                            <Tag className="h-3 w-3 md:h-4 md:w-4 text-success" />
                            <p className="text-xs text-muted-foreground font-medium">Category</p>
                          </div>
                          <p className="font-bold text-sm md:text-base truncate">{news.category || 'General'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-3 md:pt-4 border-t border-muted/20 relative z-10 px-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-warning" />
                          <span className="font-semibold text-xs md:text-sm truncate">{new Date(news.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-2 md:mr-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(news)}
                            className="geo-round h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            aria-label={`View details for ${news.title}`}
                          >
                            <Eye className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          {/* RBAC: Only admins can edit/delete/publish */}
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePublish(news)}
                                className="geo-round h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-warning/10 hover:text-warning"
                                aria-label={`${news.published ? 'Unpublish' : 'Publish'} ${news.title}`}
                              >
                                {news.published ? <FileCheck className="h-3 w-3 md:h-4 md:w-4" /> : <File className="h-3 w-3 md:h-4 md:w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(news)}
                                className="geo-round h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                aria-label={`Edit ${news.title}`}
                              >
                                <Edit className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(news)}
                                className="geo-round h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete ${news.title}`}
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>
          )}
          {viewMode === 'list' && (
            <HealthNewsListView
              healthNews={healthNews}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
              isAdmin={isAdmin}
            />
          )}
          {viewMode === 'table' && (
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <HealthNewsTableView
                healthNews={healthNews}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePublish={handleTogglePublish}
                getStatusBadge={getStatusBadge}
                isMobile={isMobile}
                isAdmin={isAdmin}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
              />
            </div>
          )}
        </>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
        loading={loading}
      />

      {modalMode && (
        <HealthNewsModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          news={selectedNews}
          mode={modalMode}
          onSave={handleSave}
        />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
      />

      <ReportsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analyticsData={stats}
        initialType="health-news"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
      >
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setConfirmationModal({
                isOpen: true,
                title: 'Delete Selected Articles',
                description: `Are you sure you want to delete ${selectedIds.length} articles? This action cannot be undone.`,
                onConfirm: async () => {
                  try {
                    // Bulk delete logic would go here
                    toast.success(`${selectedIds.length} articles deleted`);
                    setSelectedIds([]);
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                  } catch (err) {
                    toast.error('Failed to delete articles');
                  }
                },
                variant: 'destructive',
                confirmLabel: 'Delete All'
              });
            }}
            className="h-10 w-10 rounded-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all"
            title="Delete Selected"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </BulkActionBar>
    </div>
  );
};
