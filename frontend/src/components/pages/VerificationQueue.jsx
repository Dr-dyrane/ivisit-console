import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getVerificationQueue, verifyProvider, subscribeToVerificationQueue } from '../../services/verificationService';
import { getOrgVerificationQueue, verifyOrganization, subscribeToOrgVerificationQueue } from '../../services/orgVerificationService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
// Console design system: Approvals COMPOSES the shared workspace grammar (donor:
// Requests) instead of re-remembering it. A DUAL-QUEUE page (providers|facilities)
// is TWO datasets behind ONE canonical render: WorkspaceStage -> neutral queue
// toggle -> SignalPanel/KpiStrip(active queue) -> ONE ActivitySheet whose rows swap
// by queueType with ONE shared Time header. One list = both lanes (Verification
// archaeology, VERIFICATION_REVAMP_CONSTITUTION_2026-07-10).
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { KpiStrip } from '../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { Shimmer, SkeletonRows, DetailLine, EmptyState, LoadErrorState, StatusPill } from '../console/primitives';
import {
  getApprovalStatusKey,
  getApprovalToneClass,
  getApprovalLabel,
  getApprovalIcon,
} from '../../constants/verificationStatus';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAvatarFallback } from '../../lib/avatarUtils';
import { VerificationModal } from '../modals/VerificationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { FilterSheet } from '../common/FilterSheet';
import { PaginationControls } from '../ui/PaginationControls';
import { SEOHead } from '../common/SEOHead';
import { MobileVerification } from '../mobile/MobileVerification';
import {
  CheckCircle,
  Clock,
  Shield,
  ShieldAlert,
  FileCheck,
  Filter,
  ChevronRight,
  Info,
  Eye,
  User,
  Mail,
  MapPin,
  Ban,
  LayoutGrid,
  Loader2,
  Building2,
  Stethoscope,
  Ambulance,
  UserRound,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/errorHandler';

/**
 * Approvals Page
 *
 * Status: route-owned read surface with admin-only approval commands. Dual-queue
 * (providers approve-only; facilities keep a real tri-state Approve + Reject),
 * composed on the console design system.
 */

const isTransientVerificationRefreshError = (error) => {
  const message = String(error?.message || error || '');
  return /failed to fetch|network|aborted|abort/i.test(message);
};

// KPI/state strip options: the STATUS filter within the active queue. Providers
// are approve-only (no rejected state), so the 'rejected' chip is facility-only
// (filtered from the pool below, the donor's includeMine idiom). Literal palette
// only -- the theme's info/success/warning tokens all render red.
const APPROVAL_KPI_OPTIONS = [
  {
    id: 'all',
    label: 'All',
    icon: LayoutGrid,
    colorClass: 'text-foreground',
    activeClass: 'bg-foreground/[0.06] text-foreground shadow-e2 dark:bg-white/[0.06]',
  },
  {
    id: 'pending',
    label: 'Needs review',
    icon: Clock,
    colorClass: 'text-amber-700 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  },
  {
    id: 'approved',
    label: 'Approved',
    icon: CheckCircle,
    colorClass: 'text-emerald-700 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    icon: Ban,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/12 text-destructive shadow-e2',
  },
];
const APPROVAL_KPI_IMPORTANCE = { all: 0, pending: 1, approved: 2, rejected: 3 };
const APPROVAL_PINNED_KPI_IDS = ['pending', 'approved'];

const approvalToneClass = {
  danger: 'bg-destructive/12 text-destructive shadow-e2',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

// Person | Status | Role/Type | Applied | Action -- status owns its own column.
const APPROVAL_GRID_COLS = 'grid-cols-[minmax(150px,1.5fr)_minmax(120px,auto)_minmax(96px,0.7fr)_minmax(92px,auto)_72px]';
const APPROVAL_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(150px,1.5fr)_minmax(120px,auto)_minmax(96px,0.7fr)_minmax(92px,auto)_72px]';

const getFacilityInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((word) => word[0]).join('').toUpperCase();
  return initials || 'F';
};

// Applications are dated by created_at; a date reads truer than a clock time here.
const formatAppliedDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Provider persona signal (F10): the FAB scopes drivers vs doctors by provider_type,
// but the card never surfaced it. A driver/paramedic reads as a RESPONDER (ambulance),
// a doctor as a CLINICIAN (stethoscope) -- the SAME persona vocabulary as MobileUsers /
// MobileVerification (canon, single-source). 'paramedic' previously fell through to the
// generic person mark.
const getProviderTypeIcon = (providerType) => {
  const type = String(providerType || '').toLowerCase();
  if (type.includes('driver') || type.includes('ambulance') || type.includes('paramedic')) return Ambulance;
  if (type.includes('doctor') || type.includes('physician')) return Stethoscope;
  return UserRound;
};

// Normalize either queue's row into ONE projection so the shared row markup stays
// queue-agnostic. Provider identity comes from the profile; facility from hospitals.
const getApprovalProjection = (item, queueType) => {
  const statusKey = getApprovalStatusKey(item, queueType);
  if (queueType === 'providers') {
    return {
      isProvider: true,
      primary: item.username || item.email || 'Unknown',
      secondary: item.email || 'No email on file',
      meta: item.provider_type || item.role || 'provider',
      applied: item.created_at,
      avatarUrl: item.avatar_url || item.image_uri || null,
      displayId: item.display_id || null,
      statusKey,
    };
  }
  return {
    isProvider: false,
    primary: item.name || 'Unnamed facility',
    secondary: item.address || 'No address on file',
    meta: item.type || 'facility',
    applied: item.created_at,
    avatarUrl: null,
    displayId: item.display_id || null,
    statusKey,
  };
};

// KPI count for a status id, read from the active queue's stats.
const getApprovalKpiCount = (id, activeStats) => {
  if (id === 'all') return activeStats.total || 0;
  if (id === 'pending') return activeStats.pending || 0;
  if (id === 'approved') return activeStats.approved || 0;
  if (id === 'rejected') return activeStats.rejected || 0;
  return activeStats.total || 0;
};

// Signal panel copy: anchored on the ACTIVE status filter, per queue noun. A failed
// load with nothing cached surfaces the failure honestly (never a reassuring zero).
const getApprovalSignal = ({ queueType, activeStats, activeId, loadError, hasAny }) => {
  const noun = queueType === 'providers' ? 'provider' : 'facility';
  const nounPlural = queueType === 'providers' ? 'providers' : 'facilities';

  if (loadError && !hasAny) {
    return {
      icon: ShieldAlert,
      tone: 'danger',
      label: 'Load failed',
      headline: 'Approvals did not load',
      subhead: 'Retry to load the queue.',
    };
  }

  if (activeId === 'approved') {
    const n = activeStats.approved || 0;
    return {
      icon: CheckCircle,
      tone: 'clear',
      label: 'Approved',
      headline: n > 0 ? `${n} approved ${n === 1 ? noun : nounPlural}` : `No approved ${nounPlural}`,
      subhead: n > 0 ? 'Already cleared to operate.' : `Approved ${nounPlural} will appear here.`,
    };
  }

  if (activeId === 'rejected') {
    const n = activeStats.rejected || 0;
    return {
      icon: Ban,
      tone: 'danger',
      label: 'Rejected',
      headline: n > 0 ? `${n} rejected ${n === 1 ? noun : nounPlural}` : `No rejected ${nounPlural}`,
      subhead: n > 0 ? 'Declined during review.' : `Rejected ${nounPlural} will appear here.`,
    };
  }

  if (activeId === 'all') {
    const n = activeStats.total || 0;
    return {
      icon: Shield,
      tone: 'muted',
      label: 'All',
      headline: n > 0 ? `${n} ${n === 1 ? noun : nounPlural} in review` : `No ${nounPlural} yet`,
      subhead: n > 0 ? `Every application across ${nounPlural}.` : 'New applications will appear here.',
    };
  }

  // default: pending (the actionable state)
  const pending = activeStats.pending || 0;
  return {
    icon: pending > 0 ? Clock : CheckCircle,
    tone: pending > 0 ? 'warning' : 'clear',
    label: pending > 0 ? 'Needs review' : 'Clear',
    headline: pending > 0 ? `${pending} ${pending === 1 ? noun : nounPlural} to review` : `No ${nounPlural} need review`,
    subhead: pending > 0 ? 'Start with the newest application.' : 'Keep Approvals open for new applications.',
  };
};

export const VerificationQueue = () => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [providers, setProviders] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [orgStats, setOrgStats] = useState({ pending: 0, verified: 0, rejected: 0, total: 0 });
  const [selectedProvider, setSelectedProvider] = useState(null);
  // Right-side detail rail focus lives in the console-wide FocusedRecord store (resolved
  // below, after sortedItems). Distinct from selectedProvider, which drives the full modal.
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: 'pending' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // ?type=driver scopes the providers queue to a provider_type (data-sync-guided:
  // the Ambulances FAB is about the FLEET, so "Driver approvals" must show DRIVERS,
  // not every provider). ?queue=organizations preselects the facilities lane (the
  // Hospitals FAB receiver). Both read from location.search deep-links.
  const providerTypeFilter = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('type')
    : null;
  const [queueType, setQueueType] = useState(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('queue') === 'organizations'
      ? 'organizations'
      : 'providers'
  )); // 'providers' | 'organizations'

  const providerRequestSeqRef = useRef(0);
  const facilityRequestSeqRef = useRef(0);
  const loadedQueuesRef = useRef({ providers: false, organizations: false });

  const pagination = usePagination(12);
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  const canApprove = isAdmin();
  const canReview = canApprove || isOrgAdmin();

  const roleKind = canApprove ? 'admin' : (isOrgAdmin() ? 'org_admin' : 'viewer');
  const visibleModuleRail = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

  // Active-queue list + stats, normalized to ONE shape (facility 'verified' -> 'approved').
  const activeItems = queueType === 'providers' ? providers : organizations;
  const activeStats = useMemo(() => (
    queueType === 'providers'
      ? stats
      : { pending: orgStats.pending, approved: orgStats.verified, rejected: orgStats.rejected, total: orgStats.total }
  ), [queueType, stats, orgStats]);

  // Client-side Time sort of the current page's rows (honest: it reorders exactly
  // what is shown; the server returns newest-first, this flips it). Keyboard nav and
  // row selection operate on the SAME rendered list.
  const sortedItems = useMemo(() => {
    const rows = [...activeItems];
    rows.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return sortConfig.direction === 'asc' ? da - db : db - da;
    });
    return rows;
  }, [activeItems, sortConfig.direction]);

  // Auto-select the focused record via the console-wide shared store (donor parity:
  // Hospitals/Ambulances COMPOSE this same hook). focusedRecord = the explicit selection
  // OR the urgency default (mostUrgent, not list[0]) OR null -- so the rail is never empty
  // when there is data. We compose the extracted mechanism instead of re-rolling
  // `find || list[0]` inline (the reinvention that had dropped the behavior on this page).
  const { focusedRecord: focusedItem, setFocused } = useFocusedRecord('verification', sortedItems);

  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useRowSelection(sortedItems);

  // Multi-select + bulk on BOTH lanes for admins. Providers are approve-only; facilities
  // have a real tri-state, so the facility bulk bar also carries Reject -- each routed to
  // its OWN service (no F4 misfire of one queue's ids against the other's RPC).
  const selectable = canApprove;

  useEffect(() => {
    if (!canReview) {
      setProviders([]);
      setOrganizations([]);
      setLoading(false);
    }
  }, [canReview]);

  const fetchVerificationData = useCallback(async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }

    const requestSeq = providerRequestSeqRef.current + 1;
    providerRequestSeqRef.current = requestSeq;
    if (!loadedQueuesRef.current.providers) setLoading(true);
    setIsFetching(true);
    try {
      const result = await getVerificationQueue({
        status: filters.status,
        search: filters.search,
        providerType: providerTypeFilter || undefined,
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        quiet: true,
      });

      if (requestSeq !== providerRequestSeqRef.current) return;
      setProviders(result.data);
      setStats(result.stats);
      setLoadError(null);
      loadedQueuesRef.current.providers = true;
      pagination.setTotalCount(result.pagination.total);
    } catch (error) {
      if (requestSeq !== providerRequestSeqRef.current || isTransientVerificationRefreshError(error)) return;
      setLoadError('Check your connection and try again.');
      handleApiError(error, 'fetch');
    } finally {
      if (requestSeq === providerRequestSeqRef.current) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [filters.status, filters.search, providerTypeFilter, pagination.currentPage, pagination.itemsPerPage, pagination.setTotalCount, canReview]);

  const fetchOrgVerificationData = useCallback(async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }

    const requestSeq = facilityRequestSeqRef.current + 1;
    facilityRequestSeqRef.current = requestSeq;
    if (!loadedQueuesRef.current.organizations) setLoading(true);
    setIsFetching(true);
    try {
      const status = filters.status === 'approved' ? 'verified' : filters.status;
      const result = await getOrgVerificationQueue({
        status,
        search: filters.search,
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        quiet: true,
      });

      if (requestSeq !== facilityRequestSeqRef.current) return;
      setOrganizations(result.data);
      setOrgStats(result.stats);
      setLoadError(null);
      loadedQueuesRef.current.organizations = true;
      pagination.setTotalCount(result.pagination.total);
    } catch (error) {
      if (requestSeq !== facilityRequestSeqRef.current || isTransientVerificationRefreshError(error)) return;
      setLoadError('Check your connection and try again.');
      handleApiError(error, 'fetch');
    } finally {
      if (requestSeq === facilityRequestSeqRef.current) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [filters.status, filters.search, pagination.currentPage, pagination.itemsPerPage, pagination.setTotalCount, canReview]);

  const refetchActive = useCallback(() => (
    queueType === 'providers' ? fetchVerificationData() : fetchOrgVerificationData()
  ), [queueType, fetchVerificationData, fetchOrgVerificationData]);

  useEffect(() => {
    if (queueType === 'providers') {
      fetchVerificationData();
    } else {
      fetchOrgVerificationData();
    }

    // Real-time subscriptions stay scoped to the active lane.
    // arrival-toast excluded by decision: approvals realtime is a refetch-on-change
    // subscription (subscribeToVerificationQueue / subscribeToOrgVerificationQueue take
    // a callback, not a raw INSERT payload), so there is no per-insert row to throttle a
    // "new application" toast on -- VERIFICATION_REVAMP_CONSTITUTION_2026-07-10 §3.
    let unsubscribeProviders;
    let unsubscribeOrgs;
    if (canReview && queueType === 'providers') {
      unsubscribeProviders = subscribeToVerificationQueue(fetchVerificationData);
    }
    if (canReview && queueType === 'organizations') {
      unsubscribeOrgs = subscribeToOrgVerificationQueue(() => fetchOrgVerificationData());
    }

    const handleOpenFilters = () => setFilterSheetOpen(true);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      if (unsubscribeProviders) unsubscribeProviders();
      if (unsubscribeOrgs) unsubscribeOrgs();
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [fetchVerificationData, fetchOrgVerificationData, canReview, queueType]);

  // Reset pagination + selection + focus on queue switch.
  useEffect(() => {
    pagination.resetPagination();
    clearSelection();
    setFocused(null);
  }, [queueType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selection is per-page (bulk approve acts on the visible page); drop it on paging.
  useEffect(() => {
    clearSelection();
  }, [pagination.currentPage, clearSelection]);

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    pagination.resetPagination();
  }, [pagination]);

  const setStatusFilter = useCallback((status) => {
    setFilters((prev) => ({ ...prev, status: status || 'all' }));
    pagination.resetPagination();
  }, [pagination]);

  const setSearchFilter = useCallback((search) => {
    setFilters((prev) => ({ ...prev, search }));
    pagination.resetPagination();
  }, [pagination]);

  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleVerify = async (providerId, approved) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return false;
    }

    setActionLoading(true);
    try {
      await verifyProvider(providerId, approved);
      toast.success(approved ? 'Provider approved successfully!' : 'Provider verification rejected');
      setSelectedProvider(null);
      await fetchVerificationData();
      return true;
    } catch (error) {
      handleApiError(error, 'update');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOrg = async (hospitalId, approved) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return;
    }

    setActionLoading(true);
    try {
      await verifyOrganization(hospitalId, approved);
      toast.success(approved ? 'Facility approved' : 'Facility rejected');
      fetchOrgVerificationData();
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk acts on the visible-page selection. Providers are APPROVE-ONLY (no rejected
  // state); facilities have a real tri-state, so they get bulk approve AND reject. Each
  // id is routed to the CORRECT service per queue -- providers -> verifyProvider,
  // facilities -> verifyOrganization -- never the F4 misfire of one against the other.
  const handleBulkAction = async (approved) => {
    if (!canApprove) {
      toast.error('Admin approval required');
      return;
    }
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const isProviders = queueType === 'providers';

    setActionLoading(true);
    let failed = 0;
    for (const id of ids) {
      try {
        if (isProviders) await verifyProvider(id, true); // providers: approve-only
        else await verifyOrganization(id, approved);
      } catch (error) {
        failed += 1;
      }
    }

    clearSelection();
    await refetchActive();
    setActionLoading(false);

    const noun = isProviders ? 'provider' : 'facility';
    const plural = isProviders ? 'providers' : 'facilities';
    if (failed > 0) {
      toast.error(`${failed} ${approved ? 'approval' : 'rejection'}${failed === 1 ? '' : 's'} failed`);
    } else {
      toast.success(`${ids.length} ${ids.length === 1 ? noun : plural} ${approved ? 'approved' : 'rejected'}`);
    }
  };

  // Header filter trigger (auto-hiding header slot; the SheetToolbar carries the
  // primary Filters control inside the sheet).
  const hasFilter = Boolean(filters.search) || (filters.status && filters.status !== 'all');
  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter approvals"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, hasFilter]);

  usePageHeader('Approvals', null, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  // Desktop right panel -- publish live route context so ContextPanel/VerificationPanel
  // render this page's real data (canon shared by Staff/Visits/Requests), not stale
  // PageData. Org stats use `verified`; normalize to the panel's shape.
  const verificationPanelContext = useMemo(() => {
    const items = queueType === 'providers' ? providers : organizations;
    return {
      queueType,
      stats: activeStats,
      count: items.length,
      recent: items.slice(0, 4),
      selected: focusedItem,
      canApprove,
      loading,
    };
  }, [queueType, activeStats, providers, organizations, focusedItem, canApprove, loading]);

  const publishVerificationRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('verificationRouteContextUpdated', { detail: verificationPanelContext }));
  }, [verificationPanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    publishVerificationRouteContext();
    window.addEventListener('requestVerificationRouteContext', publishVerificationRouteContext);
    return () => window.removeEventListener('requestVerificationRouteContext', publishVerificationRouteContext);
  }, [publishVerificationRouteContext]);

  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Lookup applicant...',
    },
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Applications' },
        { value: 'pending', label: 'Pending Review' },
        { value: 'approved', label: 'Approved' },
        // 'Rejected' is FACILITY-ONLY (2026-07-10): providers have no rejected state,
        // so the filter returned pending rows (a lie). Offered only for the org lane.
        ...(queueType === 'providers' ? [] : [{ value: 'rejected', label: 'Rejected' }]),
      ],
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Application Date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'month' },
      ],
    },
  ], [queueType]);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />

        <MobileVerification
          queueType={queueType}
          setQueueType={setQueueType}
          providers={providers}
          organizations={organizations}
          loading={loading}
          stats={stats}
          orgStats={orgStats}
          filters={filters}
          setFilters={(updater) => {
            setFilters((prev) => (typeof updater === 'function' ? updater(prev) : updater));
            pagination.resetPagination();
          }}
          onViewProvider={setSelectedProvider}
          onVerifyProvider={canApprove ? handleVerify : null}
          onVerifyOrganization={canApprove ? handleVerifyOrg : null}
          canApprove={canApprove}
          onRefresh={refetchActive}
          onOpenFilters={() => setFilterSheetOpen(true)}
          onViewAnalytics={() => setAnalyticsModalOpen(true)}
          isFetching={isFetching}
          filterSheetOpen={filterSheetOpen}
          analyticsOpen={analyticsModalOpen}
          selectedIds={selectedIds}
          onSelect={canApprove ? handleToggleSelect : null}
          onSelectAll={canApprove ? handleSelectAll : null}
        />

        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPrevPage={pagination.prevPage}
          onNextPage={pagination.nextPage}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          loading={loading}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          initialValues={filters}
          onApply={handleApplyFilters}
          filterSchema={filterSchema}
          viewToggle={null}
          isMobile
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          analytics={queueType === 'providers' ? stats : orgStats}
          type="verification"
        />

        <VerificationModal
          isOpen={!!selectedProvider}
          provider={selectedProvider}
          mode="view"
          onClose={() => setSelectedProvider(null)}
          onVerify={canApprove ? handleVerify : null}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Approvals" description="Review provider and facility approvals in iVisit Console." />

      <ApprovalsDesktopWorkspace
        queueType={queueType}
        setQueueType={setQueueType}
        items={sortedItems}
        activeStats={activeStats}
        loading={loading}
        isFetching={isFetching}
        loadError={loadError}
        canReview={canReview}
        canApprove={canApprove}
        actionLoading={actionLoading}
        focusedItem={focusedItem}
        setFocusedId={setFocused}
        filters={filters}
        setStatusFilter={setStatusFilter}
        setSearchFilter={setSearchFilter}
        hasFilter={hasFilter}
        filterSheetOpen={filterSheetOpen}
        openFilters={() => setFilterSheetOpen(true)}
        onRetry={refetchActive}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        selectable={selectable}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelect={handleToggleSelect}
        onSelectClick={handleSelectClick}
        onSelectAll={handleSelectAll}
        onOpenRecord={setSelectedProvider}
        onApprove={(item) => (queueType === 'providers' ? handleVerify(item.id, true) : handleVerifyOrg(item.id, true))}
        onReject={queueType === 'organizations' ? (item) => handleVerifyOrg(item.id, false) : undefined}
        moduleRailItems={visibleModuleRail}
        routingPath={routingPath}
        onRailNavigate={handleRailNavigate}
      />

      {selectable && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          {/* Providers are APPROVE-ONLY; facilities have a real tri-state, so the facility
              bulk bar also carries Reject. Each button routes through handleBulkAction,
              which dispatches to the correct service per queue (no F4 misfire). */}
          {queueType === 'organizations' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleBulkAction(false)}
              disabled={actionLoading || selectedIds.length === 0}
              className="h-10 w-10 rounded-pill bg-destructive/15 text-destructive transition-all hover:bg-destructive hover:text-white active:scale-[0.96] disabled:opacity-40"
              title="Reject Selected"
              aria-label={`Reject ${selectedIds.length} selected`}
            >
              <Ban className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleBulkAction(true)}
            disabled={actionLoading || selectedIds.length === 0}
            className="h-10 w-10 rounded-pill bg-emerald-500/15 text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white active:scale-[0.96] disabled:opacity-40 dark:text-emerald-300"
            title="Approve Selected"
            aria-label={`Approve ${selectedIds.length} selected`}
          >
            <CheckCircle className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}

      <VerificationModal
        isOpen={!!selectedProvider}
        provider={selectedProvider}
        mode="view"
        onClose={() => setSelectedProvider(null)}
        onVerify={canApprove ? handleVerify : null}
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        initialValues={filters}
        onApply={handleApplyFilters}
        filterSchema={filterSchema}
        isMobile={isMobile}
      />

      {/* F3: analytics follow the ACTIVE queue (desktop used to always feed provider stats). */}
      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        analytics={queueType === 'providers' ? stats : orgStats}
        type="verification"
      />
    </div>
  );
};

const ApprovalsDesktopWorkspace = ({
  queueType,
  setQueueType,
  items,
  activeStats,
  loading,
  isFetching,
  loadError,
  canReview,
  canApprove,
  actionLoading,
  focusedItem,
  setFocusedId,
  filters,
  setStatusFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  pagination,
  sortConfig,
  onSort,
  selectable,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  onOpenRecord,
  onApprove,
  onReject,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const activeId = filters.status || 'pending';
  const signal = getApprovalSignal({ queueType, activeStats, activeId, loadError, hasAny });
  const noun = queueType === 'providers' ? 'providers' : 'facilities';

  // Providers are approve-only -> the 'rejected' status chip is facility-only (the
  // donor's includeMine pattern: filter the pool BEFORE the strip ranks + selects).
  const kpiPool = queueType === 'providers'
    ? APPROVAL_KPI_OPTIONS.filter((option) => option.id !== 'rejected')
    : APPROVAL_KPI_OPTIONS;

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem,
    setFocusedId,
    onOpen: onOpenRecord,
    scrollRef: listScrollRef,
    rowAttr: 'data-approval-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/verification"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <ApprovalDetailRail
          item={focusedItem}
          queueType={queueType}
          canApprove={canApprove}
          actionLoading={actionLoading}
          loading={loading}
          hasFilter={hasFilter}
          onOpen={onOpenRecord}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    >
      <ApprovalQueueToggle queueType={queueType} setQueueType={setQueueType} />

      <SignalPanel signal={signal} loading={loading} toneClassMap={approvalToneClass}>
        <KpiStrip
          options={kpiPool}
          getCount={(id) => getApprovalKpiCount(id, activeStats)}
          kpiFilter={activeId}
          setKpiFilter={setStatusFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={APPROVAL_PINNED_KPI_IDS}
          importance={APPROVAL_KPI_IMPORTANCE}
          defaultId="pending"
          dataAttr="data-approval-kpi"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun={noun}
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder={queueType === 'providers' ? 'Search applicants...' : 'Search facilities...'}
            searchTestId="approvals-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun={noun}
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label={`${queueType === 'providers' ? 'Provider' : 'Facility'} approvals list`}
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
        >
          <ApprovalListHeader
            queueType={queueType}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {loading && <SkeletonRows />}

          {!loading && !canReview && (
            <EmptyState
              icon={Shield}
              heading="Access restricted"
              body="This role cannot open Approvals."
            />
          )}

          {!loading && canReview && loadError && items.length === 0 && (
            <LoadErrorState title="Approvals did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && canReview && !loadError && items.length === 0 && (
            <EmptyState
              icon={FileCheck}
              heading={hasFilter ? `No matching ${noun}` : (canApprove ? 'All clear' : `No visible ${noun}`)}
              body={hasFilter
                ? 'Change filters or search again.'
                : (canApprove ? `No ${noun} awaiting review.` : `${queueType === 'providers' ? 'Provider' : 'Facility'} applications are not visible for this role.`)}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={() => setStatusFilter('all')}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all {noun}
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && canReview && items.length > 0 && items.map((item) => (
            <ApprovalRow
              key={item.id}
              item={item}
              queueType={queueType}
              selected={focusedItem?.id === item.id}
              onFocus={() => setFocusedId(item.id)}
              onOpen={onOpenRecord}
              selectable={selectable}
              checked={selectedIds.includes(item.id)}
              onToggleSelect={onToggleSelect}
              onSelectClick={onSelectClick}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

// Neutral segmented queue toggle -- its OWN control, not a KPI chip. Switching
// resets pagination/selection/focus (handled by the parent's queueType effect).
const ApprovalQueueToggle = ({ queueType, setQueueType }) => {
  const tabClass = (value) => `rounded-pill px-4 py-1.5 text-sm font-semibold transition-all active:scale-[0.96] ${
    queueType === value
      ? 'bg-card text-foreground shadow-e2 dark:bg-white/[0.10]'
      : 'text-muted-foreground hover:text-foreground'
  }`;
  return (
    <div className="flex w-fit items-center gap-1 rounded-pill bg-muted/30 p-1" role="tablist" aria-label="Approval queue">
      <button
        type="button"
        role="tab"
        aria-selected={queueType === 'providers'}
        data-testid="approval-tab-providers"
        onClick={() => setQueueType('providers')}
        className={tabClass('providers')}
      >
        Providers
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={queueType === 'organizations'}
        data-testid="approval-tab-facilities"
        onClick={() => setQueueType('organizations')}
        className={tabClass('organizations')}
      >
        Facilities
      </button>
    </div>
  );
};

const ApprovalListHeader = ({ queueType, selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? APPROVAL_GRID_COLS_SELECT : APPROVAL_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : `Select all ${queueType === 'providers' ? 'providers' : 'facilities'}`}
        className="h-4 w-4"
      />
    )}
    {/* Applicant/Facility, Role/Type are plain labels -- alphabetical sorts aren't
        operational here. Only Applied (created_at) is a meaningful sort. */}
    <span>{queueType === 'providers' ? 'Applicant' : 'Facility'}</span>
    <span>Status</span>
    <span>{queueType === 'providers' ? 'Role' : 'Type'}</span>
    <SortableColumnHeader label="Applied" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const ApprovalRow = ({ item, queueType, selected, onFocus, onOpen, selectable = false, checked = false, onToggleSelect, onSelectClick }) => {
  const projection = getApprovalProjection(item, queueType);
  const toneClass = getApprovalToneClass(projection.statusKey);
  const StatusIcon = getApprovalIcon(projection.statusKey);
  const statusLabel = getApprovalLabel(projection.statusKey);
  const MetaIcon = projection.isProvider ? getProviderTypeIcon(projection.meta) : Building2;

  return (
    <ListRowShell
      id={item.id}
      dataAttrName="data-approval-row"
      gridCols={selectable ? APPROVAL_GRID_COLS_SELECT : APPROVAL_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onOpen(item)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(item.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${projection.primary}` : `Select ${projection.primary}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        {projection.isProvider ? (
          <Avatar className="h-11 w-11 shrink-0 rounded-pill shadow-sm">
            <AvatarImage src={projection.avatarUrl || undefined} />
            <AvatarFallback className="rounded-pill bg-amber-500/10 text-sm font-semibold text-amber-700 dark:text-amber-200">
              {getAvatarFallback(item)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-sm font-semibold text-sky-700 dark:text-sky-200">
            {getFacilityInitials(projection.primary)}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={projection.primary}>{projection.primary}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={projection.secondary}>{projection.secondary}</div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={statusLabel} icon={StatusIcon} className={toneClass} compact />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
          <MetaIcon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium capitalize" title={projection.meta}>{projection.meta}</span>
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {formatAppliedDate(projection.applied)}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(item);
        }}
        className="justify-self-end rounded-pill bg-background/45 px-3 text-xs font-semibold transition-all duration-200 hover:bg-foreground hover:text-background active:scale-95"
      >
        Review
      </Button>
    </ListRowShell>
  );
};

const RailActionButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

/**
 * ApprovalDetailRail -- right-side focused-record rail for Approvals.
 * Providers are approve-only (no rejected state); facilities keep a real
 * Approve + Reject (verification_status). Actions fail-closed on canApprove.
 */
const ApprovalDetailRail = ({ item, queueType, canApprove, actionLoading, loading, hasFilter, onOpen, onApprove, onReject }) => {
  if (loading) {
    return (
      <DetailRailShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 flex items-center gap-4">
          <Shimmer className="h-14 w-14 shrink-0 rounded-pill" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-5 w-2/3 rounded-inner" />
            <Shimmer className="h-4 w-1/2 rounded-inner" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (<Shimmer key={i} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!item) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <FileCheck className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No application selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Applications that match your filters will appear here.'
              : 'Select an application to review its details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const projection = getApprovalProjection(item, queueType);
  const isProviders = queueType === 'providers';
  const isPending = projection.statusKey === 'pending';
  const toneClass = getApprovalToneClass(projection.statusKey);
  const StatusIcon = getApprovalIcon(projection.statusKey);
  const statusLabel = getApprovalLabel(projection.statusKey);
  const MetaIcon = isProviders ? getProviderTypeIcon(projection.meta) : Building2;
  const canReject = queueType === 'organizations' && typeof onReject === 'function';

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Application details</h2>
            {projection.displayId && (
              <p className="mt-1 truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={projection.displayId}>
                {projection.displayId}
              </p>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${toneClass}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusLabel}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onOpen(item)}
            aria-label="Open full application details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {isProviders ? (
            <Avatar className="h-14 w-14 shrink-0 rounded-pill shadow-sm">
              <AvatarImage src={projection.avatarUrl || undefined} />
              <AvatarFallback className="rounded-pill bg-amber-500/10 text-lg font-semibold text-amber-700 dark:text-amber-200">
                {getAvatarFallback(item)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-lg font-semibold text-sky-700 dark:text-sky-200">
              {getFacilityInitials(projection.primary)}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold" title={projection.primary}>{projection.primary}</h3>
            <p className="mt-1 truncate text-sm capitalize text-muted-foreground" title={projection.meta}>{projection.meta}</p>
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        {isProviders ? (
          <>
            <DetailLine icon={User} label="Applicant" value={item.username || item.email} />
            <DetailLine icon={MetaIcon} label="Provider type" value={projection.meta} />
            <DetailLine icon={Shield} label="Role" value={item.role} />
            <DetailLine icon={Mail} label="Contact" value={item.email} />
            {item.phone && <DetailLine icon={Phone} label="Phone" value={item.phone} />}
            <DetailLine icon={Clock} label="Applied" value={formatAppliedDate(item.created_at)} />
          </>
        ) : (
          <>
            <DetailLine icon={Building2} label="Facility" value={item.name} />
            <DetailLine icon={MetaIcon} label="Type" value={projection.meta} />
            <DetailLine icon={MapPin} label="Address" value={item.address} />
            {item.phone && <DetailLine icon={Phone} label="Phone" value={item.phone} />}
            <DetailLine icon={Clock} label="Applied" value={formatAppliedDate(item.created_at)} />
          </>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onOpen(item)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {/* Provider lane is APPROVE-ONLY (2026-07-10): providers have no rejected
            state, so a Reject was a no-op. Facilities keep a real Approve + Reject. */}
        {canApprove && isPending && (
          <div className={canReject ? 'grid grid-cols-2 gap-3' : ''}>
            {canReject && (
              <Button
                disabled={actionLoading}
                className="h-11 rounded-button bg-destructive text-sm font-bold text-white transition-all hover:bg-destructive/90 active:scale-[0.98] disabled:opacity-60"
                onClick={() => onReject(item)}
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                Reject
              </Button>
            )}
            <Button
              disabled={actionLoading}
              className="h-11 w-full rounded-button bg-emerald-500/90 text-sm font-bold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
              onClick={() => onApprove(item)}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Approve
            </Button>
          </div>
        )}

        <RailActionButton icon={Info} label="Open record" onClick={() => onOpen(item)} />

        {!canApprove && (
          <div
            role="note"
            className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
          >
            <Shield className="h-4 w-4 shrink-0" />
            Approvals are read-only until admin authority is verified.
          </div>
        )}
      </div>
    </DetailRailShell>
  );
};
