import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { updateHospital, getHospital, getHospitalsPageData } from '../../services/hospitalsService';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { Hospital, MapPin, Star, Bed, Ambulance, Plus, Edit, Eye, Filter, Search, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { HospitalModal } from '../modals/HospitalModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { withTimeout } from '../../lib/utils';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { HospitalListView } from '../views/HospitalListView';
import { HospitalTableView } from '../views/HospitalTableView';
import { SEOHead } from '../common/SEOHead';
import { MobileHospitals } from '../mobile/MobileHospitals';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';

const getHospitalStatsFilters = (filters = {}) => {
  const { status, ...statsFilters } = filters || {};
  return statsFilters;
};

const normalizeHospitalCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const hospitalStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: Hospital,
    countKey: 'total',
    tone: 'primary',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-sky-600 dark:text-sky-200',
  },
  {
    id: 'available',
    label: 'Available',
    icon: MapPin,
    countKey: 'available',
    tone: 'clear',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-emerald-600 dark:text-emerald-200',
  },
  {
    id: 'full',
    label: 'Full',
    icon: Bed,
    countKey: 'full',
    tone: 'warning',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-amber-600 dark:text-amber-200',
  },
  {
    id: 'busy',
    label: 'Busy',
    icon: Ambulance,
    countKey: 'busy',
    tone: 'info',
    activeClass: 'bg-cyan-500/10 text-cyan-800 shadow-[0_18px_54px_rgba(6,182,212,0.16)] dark:text-cyan-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-cyan-600 dark:text-cyan-200',
  },
];

const hospitalToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:text-amber-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-[0_16px_42px_rgba(6,182,212,0.14)] dark:text-cyan-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-[0_16px_42px_rgb(0_0_0/0.08)]',
};

const getHospitalStateCount = ({ id, stats, hospitals }) => {
  const sourceHospitals = Array.isArray(hospitals) ? hospitals : [];
  const option = hospitalStateOptions.find((item) => item.id === id) || hospitalStateOptions[0];
  const fallback = id === 'all'
    ? sourceHospitals.length
    : sourceHospitals.filter((hospital) => hospital.status === id).length;

  return normalizeHospitalCount(stats?.[option.countKey], fallback);
};

const getHospitalSignal = ({ stats, hospitals, kpiFilter }) => {
  const activeId = kpiFilter || 'all';
  const option = hospitalStateOptions.find((item) => item.id === activeId) || hospitalStateOptions[0];
  const count = getHospitalStateCount({ id: option.id, stats, hospitals });

  if (option.id === 'available') {
    return {
      icon: MapPin,
      tone: 'clear',
      label: 'Available',
      headline: count > 0 ? `${count} available hospital${count === 1 ? '' : 's'}` : 'No available hospitals',
      subhead: count > 0 ? 'Open a facility before changing capacity or care routing.' : 'Available facilities will appear here.',
    };
  }

  if (option.id === 'full') {
    return {
      icon: Bed,
      tone: 'warning',
      label: 'Full',
      headline: count > 0 ? `${count} full hospital${count === 1 ? '' : 's'}` : 'No full hospitals',
      subhead: count > 0 ? 'Review full sites before promising new capacity.' : 'Full facilities will appear here.',
    };
  }

  if (option.id === 'busy') {
    return {
      icon: Ambulance,
      tone: 'info',
      label: 'Busy',
      headline: count > 0 ? `${count} busy hospital${count === 1 ? '' : 's'}` : 'No busy hospitals',
      subhead: count > 0 ? 'Check the facility record before routing more demand.' : 'Busy facilities will appear here.',
    };
  }

  return {
    icon: Hospital,
    tone: 'primary',
    label: 'Hospitals',
    headline: count > 0 ? `${count} hospital record${count === 1 ? '' : 's'}` : 'No hospitals found',
    subhead: count > 0 ? 'Review facility status, visible capacity, and verified records before acting.' : 'Try a different filter or refresh the facility list.',
  };
};

export const HospitalsPage = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const location = useLocation();
  const { isMobile } = useNavigation();
  const [hospitals, setHospitals] = useState([]);
  const [hospitalPageStats, setHospitalPageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [kpiFilter, setKpiFilter] = useState('all');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [hospitalPageError, setHospitalPageError] = useState(null);
  const [activeActionFeedback, setActiveActionFeedback] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const { viewMode, setViewMode } = useViewMode('hospitals-page', 'grid');
  const pagination = usePagination(20);
  const canEditHospitals = isAdmin() || isOrgAdmin();
  // Shared focused-record store: rail shows the most-urgent hospital at rest and
  // toggles consistently on row focus. Replaces the old private focusedHospitalId
  // state + `list.find(id) || list[0]` memo + first-item re-pin effect.
  const { focusedRecord, setFocused, isFocused } = useFocusedRecord('hospitals', hospitals);
  const focusedHospital = focusedRecord;
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const actionFeedbackTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      fetchRequestRef.current += 1;
      if (actionFeedbackTimerRef.current) {
        window.clearTimeout(actionFeedbackTimerRef.current);
      }
    };
  }, []);

  const markActionFeedback = useCallback((actionId) => {
    if (!actionId) return;
    if (actionFeedbackTimerRef.current) {
      window.clearTimeout(actionFeedbackTimerRef.current);
    }
    setActiveActionFeedback(actionId);
    actionFeedbackTimerRef.current = window.setTimeout(() => {
      setActiveActionFeedback(current => current === actionId ? null : current);
    }, 900);
  }, []);

  const handleApplyFilters = useCallback((nextFiltersOrUpdater) => {
    pagination.resetPagination();
    setFilters(currentFilters => (
      typeof nextFiltersOrUpdater === 'function'
        ? nextFiltersOrUpdater(currentFilters)
        : (nextFiltersOrUpdater || {})
    ));
  }, [pagination.resetPagination]);

  const handleKpiFilterChange = useCallback((nextFilter) => {
    pagination.resetPagination();
    setKpiFilter(nextFilter);
  }, [pagination.resetPagination]);

  const fetchHospitals = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setHospitalPageError(null);
      }

      // Check if we have a specific hospital ID in URL
      const params = new URLSearchParams(location.search);
      const hospitalId = params.get('id');

      if (hospitalId) {
        const [specificHospital, pageData] = await Promise.all([
          getHospital(hospitalId),
          getHospitalsPageData({
            statsFilters: getHospitalStatsFilters(filters),
            limit: pagination.itemsPerPage,
            offset: 0,
            quiet: true
          })
        ]);

        if (!isMountedRef.current || fetchRequestRef.current !== requestId) {
          return;
        }

        setHospitals(specificHospital ? [specificHospital] : []);
        setHospitalPageStats(pageData.stats);
        pagination.setTotalCount(specificHospital ? 1 : 0);
        setHospitalPageError(null);

        // Auto-open the modal for this hospital
        if (specificHospital) {
          setFocused(specificHospital.id);
          setSelectedHospital(specificHospital);
          setModalMode('view');
        }
        return;
      }

      const routeFilters = {
        ...filters,
        ...(kpiFilter !== 'all' ? { status: kpiFilter } : {})
      };
      const statsFilters = getHospitalStatsFilters(filters);

      const { data, count, stats } = await getHospitalsPageData({
        filters: routeFilters,
        statsFilters,
        limit: pagination.itemsPerPage,
        offset: pagination.paginationRange.start,
        quiet: true
      });

      if (!isMountedRef.current || fetchRequestRef.current !== requestId) {
        return;
      }

      pagination.setTotalCount(count);
      setHospitalPageStats(stats);
      setHospitals(data || []);
      setHospitalPageError(null);
    } catch (error) {
      if (!isMountedRef.current || fetchRequestRef.current !== requestId) {
        return;
      }

      console.error('Error fetching hospitals:', error);
      setHospitalPageError('Hospitals could not load. Try again.');
      handleApiError(error, 'fetch');
    } finally {
      if (isMountedRef.current && fetchRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [filters, kpiFilter, pagination.itemsPerPage, pagination.paginationRange.start, location.search]);

  useEffect(() => {
    let active = true;

    fetchHospitals();

    // Real-time updates
    const channel = supabase
      .channel('hospitals_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
        if (active && isMountedRef.current) {
          fetchHospitals();
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchHospitals]);

  const handleCreateUnavailable = useCallback(() => {
    markActionFeedback('create-unavailable');
    toast.info('Add facility is unavailable');
  }, [markActionFeedback]);

  const handleOpenFilters = useCallback(() => {
    markActionFeedback('filters');
    setFilterSheetOpen(true);
  }, [markActionFeedback]);

  const handleOpenAnalytics = useCallback(() => {
    markActionFeedback('analytics');
    setAnalyticsModalOpen(true);
  }, [markActionFeedback]);

  const hospitalPanelContext = React.useMemo(() => ({
    stats: hospitalPageStats || {},
    recent: hospitals.slice(0, 4),
    focusedHospital,
    count: pagination.totalCount || hospitals.length,
    loading,
    errorMessage: hospitalPageError,
    currentState: kpiFilter,
    canAdd: false,
    canEdit: canEditHospitals,
  }), [
    canEditHospitals,
    focusedHospital,
    hospitalPageError,
    hospitalPageStats,
    hospitals,
    kpiFilter,
    loading,
    pagination.totalCount,
  ]);

  const publishHospitalsRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('hospitalsRouteContextUpdated', {
      detail: hospitalPanelContext,
    }));
  }, [hospitalPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishHospitalsRouteContext();
    window.addEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);

    return () => {
      window.removeEventListener('requestHospitalsRouteContext', publishHospitalsRouteContext);
    };
  }, [publishHospitalsRouteContext]);

  // Open "Add" modal on page load if requested via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Handle add=true parameter
    if (params.get('add') === 'true') {
      handleCreateUnavailable();
    }
    // Note: id parameter is now handled in fetchHospitals function
  }, [handleCreateUnavailable, location.search]);

  // Handle custom events from context panel
  useEffect(() => {
    const handleOpenModal = () => handleCreateUnavailable();

    window.addEventListener('openHospitalModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openHospitalModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreateUnavailable, handleOpenAnalytics, handleOpenFilters]);

  const handleView = useCallback((hospital) => {
    markActionFeedback(`view-${hospital?.id || 'unknown'}`);
    if (hospital?.id) setFocused(hospital.id);
    setSelectedHospital(hospital);
    setModalMode('view');
  }, [markActionFeedback, setFocused]);

  const handleEdit = useCallback((hospital) => {
    markActionFeedback(`edit-${hospital?.id || 'unknown'}`);
    if (hospital?.id) setFocused(hospital.id);
    setSelectedHospital(hospital);
    setModalMode('edit');
  }, [markActionFeedback, setFocused]);

  const handleClearFilters = useCallback(() => {
    handleKpiFilterChange('all');
    handleApplyFilters({});
  }, [handleApplyFilters, handleKpiFilterChange]);

  const handleSave = useCallback(async (formData) => {
    try {
      if (modalMode !== 'edit' || !selectedHospital?.id) {
        throw new Error('Facility edit requires a selected facility');
      }

      const updatedHospital = await updateHospital(selectedHospital.id, formData);
      const updatedHospitalName = formData.name || selectedHospital.name || 'Facility';

      await createNotification(
        NotificationTypes.HOSPITAL,
        NotificationActions.UPDATED,
        updatedHospital?.id || selectedHospital.id,
        { message: `${updatedHospitalName} has been updated` }
      );

      return true;
    } catch (error) {
      console.error('Error saving hospital:', error);
      handleApiError(error, 'update');
      throw error;
    }
  }, [modalMode, selectedHospital]);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedHospital(null);
    if (shouldRefresh) {
      fetchHospitals();
    }
  }, [fetchHospitals]);

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-success/20 text-success',
      full: 'bg-warning/20 text-warning',
    };
    return badges[status] || badges.available;
  };

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const filterSchema = React.useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search hospitals...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'full', label: 'Full' },
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Registered On',
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
      onClick={handleOpenFilters}
      className={`squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative transition-all ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
      aria-label="Filter hospitals"
      aria-busy={activeActionFeedback === 'filters'}
      data-state={activeActionFeedback === 'filters' ? 'opening' : 'idle'}
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0)) && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-pill bg-primary" />
      )}
    </Button>
  ), [activeActionFeedback, filters, handleOpenFilters]);

  const headerActions = React.useMemo(() => {
    // Create remains unavailable until a backend receiver/policy is proved.
    if (canEditHospitals) {
      return (
        <Button
          onClick={handleCreateUnavailable}
          title="Add facility unavailable"
          aria-busy={activeActionFeedback === 'create-unavailable'}
          data-state={activeActionFeedback === 'create-unavailable' ? 'opening' : 'unavailable'}
          className={`rounded-button bg-card/68 backdrop-blur-2xl h-9 px-4 text-xs font-semibold opacity-70 transition-all ${activeActionFeedback === 'create-unavailable' ? 'scale-95 bg-primary/10 text-primary' : ''}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add facility
        </Button>
      );
    }
    return null;
  }, [activeActionFeedback, canEditHospitals, handleCreateUnavailable]);

  usePageHeader(
    "Hospitals",
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Hospitals" description="Manage network hospitals, bed capacity, and facility status." />

        <MobileHospitals
          hospitals={hospitals}
          loading={loading}
          statistics={hospitalPageStats}
          filters={filters}
          setFilters={handleApplyFilters}
          onView={handleView}
          onEdit={handleEdit}
          onRefresh={fetchHospitals}
          onViewAnalytics={handleOpenAnalytics}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          onOpenFilters={handleOpenFilters}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
          canDelete={false}
          selectionEnabled={false}
        />

        {modalMode && (
          <HospitalModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            hospital={selectedHospital}
            mode={modalMode}
            onSave={handleSave}
          />
        )}

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={handleApplyFilters}
          initialValues={filters}
          viewToggle={null}
          isMobile={true}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={hospitalPageStats}
          type="hospital"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Hospitals" description="Manage network hospitals, bed capacity, and facility status." />
      <div className="pt-2" />
      <div className="grid min-h-[calc(100dvh-7rem)] grid-cols-1 gap-5 px-4 pb-8 pt-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <section className="min-w-0">
          <HospitalSignalPanel
            stats={hospitalPageStats}
            hospitals={hospitals}
            loading={loading}
            kpiFilter={kpiFilter}
            setKpiFilter={handleKpiFilterChange}
          />

          <HospitalActivitySheet
            filters={filters}
            setFilters={handleApplyFilters}
            openFilters={handleOpenFilters}
            loading={loading}
            pagination={pagination}
            errorMessage={hospitalPageError}
            onRetry={fetchHospitals}
            activeActionFeedback={activeActionFeedback}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : hospitals.length === 0 ? (
              <HospitalEmptyState onClearFilters={handleClearFilters} />
            ) : (
              <>
                {viewMode === 'grid' && (
                  <LayoutGroup>
                    <motion.div
                      layout
                      className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
                    >
                      {hospitals.map((hospital, index) => {
                        const focused = isFocused(hospital.id);

                        return (
                          <motion.div
                            layout
                            key={hospital.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="col-span-1"
                          >
                            <div
                              className={`group relative flex h-full min-h-[520px] cursor-pointer flex-col overflow-hidden rounded-card p-5 transition-[background,box-shadow,transform] duration-200 ${focused ? 'bg-foreground/[0.07] shadow-[0_24px_70px_rgba(0,0,0,0.14)] dark:bg-white/[0.075]' : 'bg-muted/22 hover:bg-muted/34 hover:shadow-[0_18px_54px_rgba(0,0,0,0.10)]'}`}
                              role="button"
                              tabIndex={0}
                              aria-pressed={focused}
                              data-state={focused ? 'focused' : 'idle'}
                              onClick={() => setFocused(hospital.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setFocused(hospital.id);
                                }
                              }}
                            >
                              {/* Hospital Image */}
                              {hospital.image ? (
                                <div className="relative h-48 w-full mb-4 rounded-inner overflow-hidden bg-black/20">
                                  <img
                                    src={hospital.image}
                                    alt={hospital.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  {/* Fallback placeholder */}
                                  <div className="absolute inset-0 flex items-center justify-center bg-muted/20 hidden">
                                    <Hospital className="h-12 w-12 text-muted-foreground/50" />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-48 w-full mb-4 rounded-inner bg-muted/20 flex items-center justify-center">
                                  <Hospital className="h-12 w-12 text-muted-foreground/50" />
                                </div>
                              )}

                              {/* Top Right Icon */}
                              <div className="absolute top-0 right-0 p-5 z-20">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-pill scale-150" />
                                  <div className="w-10 h-10 rounded-icon bg-background/60 backdrop-blur-xl flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                                    <Hospital className="h-5 w-5 text-primary" />
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-4 relative z-10">
                                <span className={`inline-flex items-center rounded-pill ${hospital.status === 'available'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                                  } text-xs font-bold px-3 py-1`}>
                                  {hospital.status}
                                </span>
                                {hospital.verified && (
                                  <span className="inline-flex items-center rounded-pill bg-sky-500/20 text-sky-600 dark:text-sky-300 text-xs font-bold px-2 py-1">
                                    OK
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-2xl mb-2 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                                {hospital.name || 'Unnamed Hospital'}
                              </h3>

                              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-6 min-h-[2.5rem] relative z-10">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                                <p className="truncate-2 leading-snug">{hospital.address || 'No address provided'}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                                <div className="p-3 rounded-inner bg-muted/30 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Bed className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                                    <p className="text-xs text-muted-foreground font-medium">Beds</p>
                                  </div>
                                  <p className="font-bold text-xl">{hospital.available_beds}</p>
                                </div>
                                <div className="p-3 rounded-inner bg-muted/30 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Ambulance className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                                    <p className="text-xs text-muted-foreground font-medium">Fleet</p>
                                  </div>
                                  <p className="font-bold text-xl">{hospital.ambulances_count}</p>
                                </div>
                              </div>

                              <div className="relative z-10 mt-auto flex items-center justify-between rounded-inner bg-background/35 px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                  <span className="font-semibold text-sm">{hospital.rating}</span>
                                </div>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleView(hospital);
                                    }}
                                    className={`rounded-pill h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all ${activeActionFeedback === `view-${hospital.id}` ? 'bg-primary/10 text-primary scale-95' : ''}`}
                                    aria-label={`View details for ${hospital.name}`}
                                    aria-busy={activeActionFeedback === `view-${hospital.id}`}
                                    data-state={activeActionFeedback === `view-${hospital.id}` ? 'opening' : 'idle'}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {/* RBAC: Only Admins and Org Admins can edit hospitals */}
                                  {canEditHospitals && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleEdit(hospital);
                                        }}
                                        className={`rounded-pill h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all ${activeActionFeedback === `edit-${hospital.id}` ? 'bg-primary/10 text-primary scale-95' : ''}`}
                                        aria-label={`Edit ${hospital.name}`}
                                        aria-busy={activeActionFeedback === `edit-${hospital.id}`}
                                        data-state={activeActionFeedback === `edit-${hospital.id}` ? 'opening' : 'idle'}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </LayoutGroup>
                )}
                {viewMode === 'list' && (
                  <HospitalListView
                    hospitals={hospitals}
                    onView={handleView}
                    onEdit={handleEdit}
                    getStatusBadge={getStatusBadge}
                    isMobile={isMobile}
                    canDelete={false}
                    selectionEnabled={false}
                  />
                )}
                {viewMode === 'table' && (
                  <HospitalTableView
                    hospitals={hospitals}
                    onView={handleView}
                    onEdit={handleEdit}
                    getStatusBadge={getStatusBadge}
                    isMobile={isMobile}
                    canDelete={false}
                    selectionEnabled={false}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                )}
              </>
            )}
          </HospitalActivitySheet>
        </section>

        <HospitalDetailRail
          hospital={focusedHospital}
          loading={loading}
          canEdit={canEditHospitals}
          onView={handleView}
          onEdit={handleEdit}
          activeActionFeedback={activeActionFeedback}
        />
      </div>

      {modalMode && (
        <HospitalModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          hospital={selectedHospital}
          mode={modalMode}
          onSave={handleSave}
        />
      )}

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={handleApplyFilters}
        initialValues={filters}
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={hospitalPageStats}
        type="hospital"
      />
    </div>
  );
};

const HospitalSignalPanel = ({ stats, hospitals, loading, kpiFilter, setKpiFilter }) => {
  const sourceHospitals = Array.isArray(hospitals) ? hospitals : [];
  const visibleBeds = loading
    ? '...'
    : normalizeHospitalCount(
      stats?.visibleBeds,
      sourceHospitals.reduce((sum, hospital) => sum + (Number(hospital.available_beds) || 0), 0)
    );
  const visibleFleet = loading
    ? '...'
    : normalizeHospitalCount(
      stats?.visibleAmbulances,
      sourceHospitals.reduce((sum, hospital) => sum + (Number(hospital.ambulances_count) || 0), 0)
    );
  const signal = loading
    ? {
      icon: Hospital,
      tone: 'muted',
      label: 'Loading',
      headline: 'Loading hospitals',
      subhead: 'One moment while the facility list comes in.',
    }
    : getHospitalSignal({ stats, hospitals: sourceHospitals, kpiFilter });
  const SignalIcon = signal.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className="flex min-h-[248px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[310px]"
      aria-live="polite"
    >
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${hospitalToneClass[signal.tone] || hospitalToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] text-foreground md:text-6xl">
            {signal.headline}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {signal.subhead}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
            <Bed className="h-4 w-4 text-amber-600 dark:text-amber-200" />
            Visible beds
            <strong className="text-foreground">{visibleBeds}</strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-2">
            <Ambulance className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
            Visible fleet
            <strong className="text-foreground">{visibleFleet}</strong>
          </span>
        </div>

        <HospitalStateStrip
          stats={stats}
          hospitals={sourceHospitals}
          loading={loading}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />
      </div>
    </motion.section>
  );
};

const HospitalStateStrip = ({ stats, hospitals, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
    {hospitalStateOptions.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'all') === item.id;
      const count = loading ? '...' : getHospitalStateCount({ id: item.id, stats, hospitals });

      return (
        <motion.button
          key={item.id}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active}
          aria-label={`Show ${item.label.toLowerCase()} hospitals`}
          data-state={active ? 'selected' : 'idle'}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-background/45 transition-transform group-hover:scale-105 ${active ? item.iconClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const HospitalActivitySheet = ({ filters, setFilters, openFilters, loading, pagination, errorMessage, onRetry, activeActionFeedback, children }) => (
  <section
    className="mt-2 flex min-h-[520px] flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet"
    data-testid="hospitals-activity-sheet"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
    <HospitalSheetToolbar
      filters={filters}
      setFilters={setFilters}
      openFilters={openFilters}
      activeActionFeedback={activeActionFeedback}
    />

    <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
      <span>{loading ? 'Loading hospitals' : `${pagination.totalCount} hospitals`}</span>
      <span>{loading ? 'One moment' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
    </div>

    {errorMessage && (
      <HospitalErrorBanner message={errorMessage} onRetry={onRetry} />
    )}

    <div className="mt-3 min-h-[360px] flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
      {children}
    </div>

    <PaginationControls
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      totalCount={pagination.totalCount}
      itemsPerPage={pagination.itemsPerPage}
      onPrevPage={pagination.prevPage}
      onNextPage={pagination.nextPage}
      hasPrevPage={pagination.hasPrevPage}
      hasNextPage={pagination.hasNextPage}
      loading={loading}
    />
  </section>
);

const HospitalDetailRail = ({ hospital, loading, canEdit, onView, onEdit, activeActionFeedback }) => {
  if (loading) {
    return (
      <aside className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col rounded-sheet bg-card/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <div className="h-5 w-28 rounded-pill bg-muted/40" />
          <div className="mt-6 h-24 rounded-inner bg-muted/28" />
          <div className="mt-4 space-y-3">
            <div className="h-14 rounded-button bg-muted/24" />
            <div className="h-14 rounded-button bg-muted/24" />
            <div className="h-14 rounded-button bg-muted/24" />
          </div>
        </div>
      </aside>
    );
  }

  if (!hospital) {
    return (
      <aside className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="sticky top-24 flex min-h-[520px] flex-col justify-center rounded-sheet bg-card/70 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <Hospital className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No facility selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Facilities will appear here when the list has results.</p>
        </div>
      </aside>
    );
  }

  const status = String(hospital.status || 'available').replace(/_/g, ' ');
  const beds = normalizeHospitalCount(hospital.available_beds, 0);
  const fleet = normalizeHospitalCount(hospital.ambulances_count, 0);
  const rating = Number.isFinite(Number(hospital.rating)) ? Number(hospital.rating).toFixed(1) : 'Not rated';
  const viewOpening = activeActionFeedback === `view-${hospital.id}`;
  const editOpening = activeActionFeedback === `edit-${hospital.id}`;

  return (
    <aside className="hidden min-h-0 lg:flex lg:flex-col" data-testid="hospitals-detail-rail">
      <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden rounded-sheet bg-card/72 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center ${hospital.status === 'available' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200' : hospital.status === 'busy' ? 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-200' : 'bg-amber-500/12 text-amber-700 dark:text-amber-200'} rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]`}>
            {status}
          </span>
          {hospital.verified && (
            <span className="rounded-pill bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
              Verified
            </span>
          )}
        </div>

        <div className="mt-5 min-w-0">
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-foreground">
            {hospital.name || 'Unnamed hospital'}
          </h2>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-200" />
            <span>{hospital.address || 'No address provided'}</span>
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <RailMetric icon={Bed} label="Beds" value={beds} tone="amber" />
          <RailMetric icon={Ambulance} label="Fleet" value={fleet} tone="cyan" />
          <RailMetric icon={Star} label="Rating" value={rating} tone="sky" />
          <RailMetric icon={Activity} label="Care" value={hospital.emergency_level || 'Not set'} tone="emerald" />
        </div>

        <div className="mt-5 space-y-3 rounded-inner bg-muted/20 p-4">
          <RailFact label="Phone" value={hospital.phone || 'No phone'} />
          <RailFact label="Tier" value={hospital.type || 'Not set'} />
          <RailFact label="Price" value={hospital.price_range || 'Not set'} />
          <RailFact label="Updated" value={hospital.last_availability_update ? new Date(hospital.last_availability_update).toLocaleString() : 'Unknown'} />
        </div>

        <div className="mt-5 rounded-inner bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
          <p className="text-sm font-semibold">Capacity changes need review</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Use Requests for reservation changes. This panel is read-only evidence until an approved action opens.
          </p>
        </div>

        <div className="mt-auto flex gap-2 pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onView(hospital)}
            className={`h-11 flex-1 rounded-button bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95 ${viewOpening ? 'bg-primary/10 text-primary scale-95' : ''}`}
            aria-busy={viewOpening}
            data-state={viewOpening ? 'opening' : 'idle'}
          >
            <Eye className="mr-2 h-4 w-4" />
            {viewOpening ? 'Opening' : 'Details'}
          </Button>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onEdit(hospital)}
              className={`h-11 flex-1 rounded-button bg-primary/10 px-4 text-sm font-semibold text-primary transition-all hover:bg-primary/15 active:scale-95 ${editOpening ? 'scale-95' : ''}`}
              aria-busy={editOpening}
              data-state={editOpening ? 'opening' : 'idle'}
            >
              <Edit className="mr-2 h-4 w-4" />
              {editOpening ? 'Opening' : 'Edit'}
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};

const railToneClasses = {
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
};

const RailMetric = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-inner bg-muted/24 p-3">
    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-button ${railToneClasses[tone] || railToneClasses.sky}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
  </div>
);

const RailFact = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
    <span className="min-w-0 text-right font-medium text-foreground">{value}</span>
  </div>
);

const HospitalSheetToolbar = ({ filters, setFilters, openFilters, activeActionFeedback }) => {
  const hasFilter = Boolean(
    filters.search ||
    (filters.status && filters.status.length > 0) ||
    filters.created_at
  );

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
        <input
          type="search"
          value={filters.search || ''}
          onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
          placeholder="Search hospitals..."
          className="h-12 w-full rounded-inner bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
          data-testid="hospitals-sheet-search"
        />
      </div>
      <Button
        variant="ghost"
        onClick={openFilters}
        className={`h-12 rounded-inner bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95 ${activeActionFeedback === 'filters' ? 'bg-primary/10 text-primary scale-95' : ''}`}
        aria-busy={activeActionFeedback === 'filters'}
        data-state={activeActionFeedback === 'filters' ? 'opening' : 'idle'}
      >
        <Filter className="mr-2 h-4 w-4" />
        {activeActionFeedback === 'filters' ? 'Opening' : 'Filters'}
        {hasFilter && <span className="ml-2 h-2 w-2 rounded-pill bg-primary" />}
      </Button>
    </div>
  );
};

const HospitalErrorBanner = ({ message, onRetry }) => (
  <div
    className="mt-3 flex flex-col gap-3 rounded-inner bg-amber-500/10 p-4 text-amber-800 shadow-[0_14px_38px_rgb(245_158_11/0.12)] dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
    data-testid="hospitals-error-state"
  >
    <div className="flex min-w-0 items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Hospitals could not load</p>
        <p className="mt-1 text-xs leading-5 opacity-80">{message}</p>
      </div>
    </div>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="h-10 shrink-0 rounded-button bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

const HospitalEmptyState = ({ onClearFilters }) => (
  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-card bg-muted/18 p-8 text-center">
    <Hospital className="mb-4 h-12 w-12 text-muted-foreground/60" />
    <h2 className="text-lg font-semibold">No hospitals found</h2>
    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
      Try a different search or clear the current filters.
    </p>
    <Button
      type="button"
      variant="ghost"
      onClick={onClearFilters}
      className="mt-5 rounded-button bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
    >
      Clear filters
    </Button>
  </div>
);
