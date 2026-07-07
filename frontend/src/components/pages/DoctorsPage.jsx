import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDoctorsQuery } from '../../hooks/useDoctorsQuery';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { Button } from '../ui/button';
import { PaginationControls } from '../ui/PaginationControls';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Filter,
  Hospital,
  Phone,
  Plus,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { DoctorModal } from '../modals/DoctorModal';
import { ViewToggle } from '../common/ViewToggle';
import { FilterSheet } from '../common/FilterSheet';
import { DoctorListView } from '../views/DoctorListView';
import { DoctorTableView } from '../views/DoctorTableView';
import { SEOHead } from '../common/SEOHead';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobileDoctors } from '../mobile/MobileDoctors';

const staffStatusMeta = {
  available: {
    label: 'Available',
    className: 'bg-emerald-400/12 text-emerald-300 shadow-[0_12px_36px_rgba(16,185,129,0.12)]',
    icon: CheckCircle2,
  },
  on_call: {
    label: 'On call',
    className: 'bg-sky-400/12 text-sky-300 shadow-[0_12px_36px_rgba(14,165,233,0.12)]',
    icon: Phone,
  },
  busy: {
    label: 'Busy',
    className: 'bg-amber-400/12 text-amber-300 shadow-[0_12px_36px_rgba(245,158,11,0.12)]',
    icon: Clock,
  },
  off_duty: {
    label: 'Away',
    className: 'bg-muted/34 text-muted-foreground',
    icon: UserRound,
  },
};

const normalizeStaffStatus = (status) => String(status || 'available').toLowerCase();

const getStaffStatusMeta = (status) => staffStatusMeta[normalizeStaffStatus(status)] || staffStatusMeta.available;

const getInitials = (name = 'Staff') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'S'}${parts[1]?.[0] || ''}`.toUpperCase();
};

const staffFilterCards = [
  {
    id: 'all',
    label: 'Staff',
    icon: Users,
    activeClass: 'bg-sky-400/12 text-sky-300 shadow-[0_18px_54px_rgba(14,165,233,0.18)]',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-sky-400/10 hover:text-sky-300',
  },
  {
    id: 'available',
    label: 'Available',
    icon: CheckCircle2,
    activeClass: 'bg-emerald-400/12 text-emerald-300 shadow-[0_18px_54px_rgba(16,185,129,0.16)]',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-emerald-400/10 hover:text-emerald-300',
  },
  {
    id: 'on_call',
    label: 'On call',
    icon: Phone,
    activeClass: 'bg-sky-400/12 text-sky-300 shadow-[0_18px_54px_rgba(14,165,233,0.16)]',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-sky-400/10 hover:text-sky-300',
  },
  {
    id: 'busy',
    label: 'Busy',
    icon: Clock,
    activeClass: 'bg-amber-400/12 text-amber-300 shadow-[0_18px_54px_rgba(245,158,11,0.16)]',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-amber-400/10 hover:text-amber-300',
  },
  {
    id: 'off_duty',
    label: 'Away',
    icon: UserRound,
    activeClass: 'bg-muted/50 text-foreground shadow-[0_18px_54px_rgba(0,0,0,0.12)]',
    restClass: 'bg-muted/28 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
  },
];

const getStaffFilterCount = (id, stats) => {
  if (id === 'all') return stats.total || 0;
  return stats[id] || 0;
};

const getStatusList = (value) => {
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
};

const resolveStaffStatusFilter = (filters = {}) => {
  const sheetStatuses = getStatusList(filters.status);
  const kpiStatus = filters.kpiFilter && filters.kpiFilter !== 'all' ? filters.kpiFilter : null;

  if (!kpiStatus) {
    return { status: sheetStatuses, forceEmpty: false, statsStatus: sheetStatuses };
  }

  if (sheetStatuses.length === 0 || sheetStatuses.includes(kpiStatus)) {
    return { status: kpiStatus, forceEmpty: false, statsStatus: sheetStatuses };
  }

  return { status: kpiStatus, forceEmpty: true, statsStatus: sheetStatuses };
};

const hasDateFilter = (value) => Boolean(value && typeof value === 'object' && (value.start || value.end));

export const DoctorsPage = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ kpiFilter: 'all' });
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  const { viewMode, setViewMode } = useViewMode('doctors-page', 'grid');
  const pagination = usePagination(20);
  const canManageStaff = isAdmin() || isOrgAdmin();

  const queryFilter = useMemo(() => {
    const statusFilter = resolveStaffStatusFilter(filters);
    const nextFilter = {
      limit: isMobile ? pagination.currentPage * pagination.itemsPerPage : pagination.itemsPerPage,
      offset: isMobile ? 0 : pagination.paginationRange.start,
      quiet: true,
      status: statusFilter.status,
      forceEmpty: statusFilter.forceEmpty,
      statsStatus: statusFilter.statsStatus,
    };
    if (filters.search) nextFilter.search = filters.search;
    if (filters.specialization) nextFilter.specialization = filters.specialization;
    if (hasDateFilter(filters.created_at)) nextFilter.created_at = filters.created_at;
    if (sortConfig.key) {
      nextFilter.sortKey = sortConfig.key;
      nextFilter.sortDirection = sortConfig.direction;
    }
    return nextFilter;
  }, [
    filters.kpiFilter,
    filters.search,
    filters.specialization,
    filters.status,
    filters.created_at,
    isMobile,
    pagination.currentPage,
    pagination.itemsPerPage,
    pagination.paginationRange.start,
    sortConfig.direction,
    sortConfig.key,
  ]);

  const { doctors, count, stats: staffStats, loading, refetch } = useDoctorsQuery(queryFilter);

  const derivedStats = useMemo(() => {
    const stats = staffStats || {};
    return {
      total: Number(stats.total) || count,
      totalDoctors: Number(stats.totalDoctors) || Number(stats.total) || count,
      available: Number(stats.available) || 0,
      on_call: Number(stats.on_call) || 0,
      onCall: Number(stats.onCall ?? stats.on_call) || 0,
      busy: Number(stats.busy) || 0,
      off_duty: Number(stats.off_duty) || 0,
      exactCounts: Boolean(stats.exactCounts),
    };
  }, [staffStats, count]);

  const staffRows = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);

  useEffect(() => {
    pagination.setTotalCount(count);
  }, [count, pagination.setTotalCount]);

  const paginatedDoctors = staffRows;
  const mobileVisibleDoctors = staffRows;

  useEffect(() => {
    pagination.resetPagination();
  }, [filters, pagination.resetPagination, sortConfig]);

  const fetchDoctors = refetch;

  const handleCreate = useCallback(() => {
    if (!canManageStaff) return;
    setSelectedDoctor(null);
    setModalMode('create');
  }, [canManageStaff]);

  useEffect(() => {
    const handleOpenModal = () => handleCreate();
    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);

    window.addEventListener('openDoctorModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openDoctorModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [handleCreate]);

  const handleView = useCallback((doctor) => {
    setSelectedDoctor(doctor);
    setModalMode('view');
  }, []);

  const handleEdit = useCallback((doctor) => {
    if (!canManageStaff) return;
    setSelectedDoctor(doctor);
    setModalMode('edit');
  }, [canManageStaff]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key === key && prev.direction === 'desc') return { key: '', direction: 'asc' };
      return {
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  }, []);

  const handleModalClose = useCallback((shouldRefresh) => {
    setModalMode(null);
    setSelectedDoctor(null);
    if (shouldRefresh) fetchDoctors();
  }, [fetchDoctors]);

  const getStatusBadge = (status) => getStaffStatusMeta(status).className;

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search staff...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'busy', label: 'Busy' },
        { value: 'off_duty', label: 'Away' },
        { value: 'on_call', label: 'On call' },
      ],
    },
    {
      key: 'specialization',
      type: 'multiselect',
      label: 'Specialization',
      options: [
        { value: 'cardiology', label: 'Cardiology' },
        { value: 'neurology', label: 'Neurology' },
        { value: 'pediatrics', label: 'Pediatrics' },
        { value: 'general', label: 'General' },
        { value: 'orthopedics', label: 'Orthopedics' },
        { value: 'dermatology', label: 'Dermatology' },
      ],
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Added',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 days', value: '7days' },
        { label: 'Last 30 days', value: '30days' },
        { label: 'This month', value: 'month' },
      ],
    },
  ], []);

  const viewToggleComponent = useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="relative h-9 w-9 rounded-full bg-muted/28 text-muted-foreground shadow-sm transition-all hover:bg-sky-400/10 hover:text-sky-300 active:scale-95"
      aria-label="Filter staff"
    >
      <Filter className="h-4 w-4" />
      {(filters.search || (filters.status && filters.status.length > 0) || (filters.specialization && filters.specialization.length > 0)) && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sky-300" />
      )}
    </Button>
  ), [filters]);

  const headerActions = useMemo(() => {
    if (!canManageStaff) return null;

    return (
      <Button
        onClick={handleCreate}
        className="h-9 rounded-full bg-sky-400/12 px-4 text-sm font-semibold text-sky-300 shadow-sm transition-all hover:bg-sky-400/18 active:scale-95 focus-visible:shadow-[0_0_0_3px_rgba(14,165,233,0.22)]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add staff
      </Button>
    );
  }, [canManageStaff, handleCreate]);

  usePageHeader(
    'Staff',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  usePageFooter(null, 'status', false);

  const activeStaffFilter = filters.kpiFilter || 'all';
  const visibleStaffCount = count;
  const staffPanelContext = useMemo(() => ({
    stats: derivedStats,
    recent: staffRows.slice(0, 4),
    loading,
    count,
    canManage: canManageStaff,
  }), [canManageStaff, count, derivedStats, loading, staffRows]);

  const publishStaffRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('doctorsRouteContextUpdated', {
      detail: staffPanelContext,
    }));
  }, [staffPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishStaffRouteContext();
    window.addEventListener('requestDoctorsRouteContext', publishStaffRouteContext);

    return () => {
      window.removeEventListener('requestDoctorsRouteContext', publishStaffRouteContext);
    };
  }, [publishStaffRouteContext]);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Staff" description="Review and update staff directory records." />

        <MobileDoctors
          doctors={mobileVisibleDoctors}
          loading={loading}
          statistics={derivedStats}
          filters={filters}
          setFilters={setFilters}
          onView={handleView}
          onEdit={handleEdit}
          onRefresh={fetchDoctors}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          isAdmin={isAdmin()}
          isOrgAdmin={isOrgAdmin()}
          canManage={canManageStaff}
          onOpenFilters={() => setFilterSheetOpen(true)}
          hasMore={pagination.hasNextPage}
          onLoadMore={pagination.nextPage}
        />

        {modalMode && (
          <DoctorModal
            isOpen={!!modalMode}
            onClose={handleModalClose}
            doctor={selectedDoctor}
            mode={modalMode}
          />
        )}

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setFilters}
          initialValues={filters}
          viewToggle={null}
          isMobile
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={derivedStats}
          type="doctor"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8 text-foreground">
      <SEOHead title="Staff" description="Review and update staff directory records." />

      <div className="space-y-5 pb-10">
        <StaffFilterStrip
          stats={derivedStats}
          activeFilter={activeStaffFilter}
          setFilter={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
            <span>{loading ? 'Loading staff' : `${visibleStaffCount} staff`}</span>
            <span>{loading ? 'One moment' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
          </div>

          {loading ? (
            <StaffSkeletonGrid />
          ) : (
            <>
              {viewMode === 'grid' && (
                visibleStaffCount === 0 ? (
                  <StaffEmptyState canManage={canManageStaff} onCreate={handleCreate} />
                ) : (
                  <motion.div
                    layout
                    className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                    data-testid="doctors-grid"
                  >
                    {paginatedDoctors.map((doctor, index) => (
                      <StaffMemberCard
                        key={doctor.id}
                        doctor={doctor}
                        index={index}
                        canManage={canManageStaff}
                        onView={handleView}
                        onEdit={handleEdit}
                      />
                    ))}
                  </motion.div>
                )
              )}

              {viewMode === 'list' && (
                <DoctorListView
                  doctors={paginatedDoctors}
                  onView={handleView}
                  onEdit={handleEdit}
                  getStatusBadge={getStatusBadge}
                  isMobile={isMobile}
                  canManage={canManageStaff}
                />
              )}

              {viewMode === 'table' && (
                <DoctorTableView
                  doctors={paginatedDoctors}
                  onView={handleView}
                  onEdit={handleEdit}
                  getStatusBadge={getStatusBadge}
                  isMobile={isMobile}
                  canManage={canManageStaff}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              )}
            </>
          )}
        </section>

        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPrevPage={pagination.prevPage}
          onNextPage={pagination.nextPage}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          loading={loading}
        />
      </div>

      {modalMode && (
        <DoctorModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          doctor={selectedDoctor}
          mode={modalMode}
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

      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={derivedStats}
        type="doctor"
      />

    </div>
  );
};

const StaffFilterStrip = ({ stats, activeFilter, setFilter }) => (
  <div className="rounded-[32px] bg-background/45 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:bg-white/[0.035]">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {staffFilterCards.map((item) => {
        const Icon = item.icon;
        const active = activeFilter === item.id;
        const count = getStaffFilterCount(item.id, stats);

        return (
          <motion.button
            key={item.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(item.id)}
            className={`group flex min-h-[92px] items-center justify-between rounded-[26px] px-5 py-4 text-left transition-all duration-200 ${active ? item.activeClass : item.restClass}`}
            aria-pressed={active}
          >
            <span className="flex min-w-0 items-center gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background/50 shadow-sm transition-transform group-hover:scale-105 ${active ? '' : 'text-muted-foreground'}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-3xl font-semibold tracking-normal text-foreground">{count}</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        );
      })}
    </div>
  </div>
);

const StaffMemberCard = ({ doctor, index, canManage, onView, onEdit }) => {
  const status = getStaffStatusMeta(doctor.status);
  const StatusIcon = status.icon;
  const name = doctor.name || 'Unknown staff';
  const facility = doctor.hospitals?.name || 'No facility';
  const phone = doctor.phone || 'No phone';

  const openDetails = () => onView(doctor);
  const stopAndRun = (handler) => (event) => {
    event.stopPropagation();
    handler(doctor);
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails();
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleKeyDown}
      className="group flex min-h-[260px] cursor-pointer flex-col overflow-hidden rounded-[32px] bg-background/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.14)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-background/60 focus-visible:shadow-[0_0_0_3px_rgba(14,165,233,0.22),0_24px_80px_rgba(0,0,0,0.14)] dark:bg-white/[0.035]"
      data-testid={`doctor-card-${doctor.id}`}
      aria-label={`Open ${name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-400/12 text-sm font-semibold text-sky-300">
          {getInitials(name)}
        </span>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      <div className="mt-6 min-w-0">
        <h3 className="truncate text-2xl font-semibold tracking-normal text-foreground transition-colors group-hover:text-sky-300">
          {name}
        </h3>
        <p className="mt-2 truncate text-sm font-medium text-muted-foreground">
          {doctor.specialization || 'General'}
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <StaffInfoLine icon={Hospital} label="Facility" value={facility} />
        <StaffInfoLine icon={Phone} label="Contact" value={phone} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 rounded-[24px] bg-muted/22 p-2">
        <span className="px-2 text-xs font-semibold text-muted-foreground">
          {doctor.experience != null ? `${doctor.experience} years` : 'Experience not set'}
        </span>
        <span className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={stopAndRun(onView)}
            className="h-9 w-9 rounded-full bg-background/40 text-muted-foreground shadow-sm transition-all hover:bg-sky-400/10 hover:text-sky-300 active:scale-95"
            data-testid={`view-doctor-${doctor.id}`}
            aria-label={`View details for ${name}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canManage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={stopAndRun(onEdit)}
                className="h-9 w-9 rounded-full bg-background/40 text-muted-foreground shadow-sm transition-all hover:bg-sky-400/10 hover:text-sky-300 active:scale-95"
                data-testid={`edit-doctor-${doctor.id}`}
                aria-label={`Edit ${name}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </>
          )}
        </span>
      </div>
    </motion.article>
  );
};

const StaffInfoLine = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-[20px] bg-muted/22 p-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-background/42 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="mt-1 block truncate text-sm font-semibold text-foreground">{value}</span>
    </span>
  </div>
);

const StaffEmptyState = ({ canManage, onCreate }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[32px] bg-background/45 p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:bg-white/[0.035]">
    <Stethoscope className="mb-4 h-12 w-12 text-muted-foreground/65" />
    <h3 className="text-xl font-semibold">No staff found</h3>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">
      Change filters or add the first staff member.
    </p>
    {canManage && (
      <Button
        onClick={onCreate}
        className="mt-5 rounded-full bg-sky-400/12 px-5 font-semibold text-sky-300 shadow-sm transition-all hover:bg-sky-400/18 active:scale-95"
        data-testid="add-first-doctor-btn"
        aria-label="Add staff"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add staff
      </Button>
    )}
  </div>
);

const StaffSkeletonGrid = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="h-64 animate-pulse rounded-[32px] bg-muted/20 shadow-sm"
      >
        <div className="h-full rounded-[32px] bg-gradient-to-br from-background/42 to-muted/14" />
      </div>
    ))}
  </div>
);
