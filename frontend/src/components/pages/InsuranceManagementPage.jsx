import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getInsuranceBillingOutcomes,
  getInsurancePage,
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
} from '../../services/insuranceService';
import { PaginationControls } from '../ui/PaginationControls';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { TableSkeleton } from '../ui/skeleton';
import { InsuranceModal } from '../modals/InsuranceModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { ViewToggle } from '../common/ViewToggle';
import { InsuranceListView } from '../views/InsuranceListView';
import { InsuranceTableView } from '../views/InsuranceTableView';
import { MobileInsurance } from '../mobile/MobileInsurance';
import { SEOHead } from '../common/SEOHead';
import {
  Shield,
  Filter as FilterIcon,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  AlertTriangle,
  Info,
  ChevronRight,
  X
} from 'lucide-react';
import { toast } from "sonner";
import { motion, LayoutGroup } from 'framer-motion';

const EMPTY_INSURANCE_PAGE = {
  data: [],
  count: 0,
  denied: false,
  failed: false,
  reason: null,
  stats: {
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    verified: 0,
    unverified: 0,
    expiringSoon: 0,
    exactCounts: true,
    scope: 'admin_policy_projection',
  },
};

const EMPTY_INSURANCE_BILLING_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
};

const EMPTY_INSURANCE_BILLING_CONTEXT = {
  outcomes: [],
  recentBilling: [],
  stats: EMPTY_INSURANCE_BILLING_STATS,
  count: 0,
  loading: true,
  denied: false,
  failed: false,
  reason: null,
  errorMessage: null,
  scope: 'admin_billing_outcome_projection',
};

const EMPTY_INSURANCE_FILTERS = Object.freeze({
  search: '',
  status: [],
  type: [],
  verified: '',
  created_at: { start: '', end: '' },
  kpiFilter: 'all',
});

const hasInsuranceFilterValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') {
    return Boolean(value.start || value.end);
  }
  return Boolean(value && value !== 'all');
};

const hasActiveInsuranceFilters = (filters = {}) => (
  Object.entries(filters).some(([key, value]) => key !== 'kpiFilter' && hasInsuranceFilterValue(value))
);

const INSURANCE_STATE_OPTIONS = [
  {
    id: 'all', label: 'Policies', icon: Shield, countKey: 'total', tone: 'sky',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-sky-600 dark:text-sky-200',
  },
  {
    id: 'active', label: 'Active', icon: CheckCircle, countKey: 'active', tone: 'emerald',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-emerald-600 dark:text-emerald-200',
  },
  {
    id: 'pending', label: 'Pending', icon: Clock, countKey: 'pending', tone: 'amber',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-amber-600 dark:text-amber-200',
  },
  {
    id: 'expired', label: 'Expired', icon: AlertTriangle, countKey: 'expired', tone: 'rose',
    activeClass: 'bg-rose-500/10 text-rose-800 shadow-[0_18px_54px_rgba(244,63,94,0.16)] dark:text-rose-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-rose-600 dark:text-rose-200',
  },
  {
    id: 'unverified', label: 'Unverified', icon: Eye, countKey: 'unverified', tone: 'violet',
    activeClass: 'bg-violet-500/10 text-violet-800 shadow-[0_18px_54px_rgba(139,92,246,0.16)] dark:text-violet-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
    iconClass: 'text-violet-600 dark:text-violet-200',
  },
];

const insuranceToneClass = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-200',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
  muted: 'bg-muted/30 text-muted-foreground',
};

const normalizeInsuranceCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getInsuranceStateCount = ({ id, stats, policies }) => {
  const rows = Array.isArray(policies) ? policies : [];
  const option = INSURANCE_STATE_OPTIONS.find((item) => item.id === id) || INSURANCE_STATE_OPTIONS[0];
  const fallback = id === 'all'
    ? rows.length
    : id === 'unverified'
      ? rows.filter((policy) => !policy.verified).length
      : rows.filter((policy) => policy.status === id).length;
  return normalizeInsuranceCount(stats?.[option.countKey], fallback);
};

const getInsuranceSignal = ({ stats, policies, kpiFilter }) => {
  const activeId = kpiFilter || 'all';
  const option = INSURANCE_STATE_OPTIONS.find((item) => item.id === activeId) || INSURANCE_STATE_OPTIONS[0];
  const count = getInsuranceStateCount({ id: option.id, stats, policies });
  const noun = option.id === 'all' ? 'policy record' : `${option.label.toLowerCase()} policy`;
  const emptyNoun = option.id === 'all' ? 'policies' : `${option.label.toLowerCase()} policies`;
  return {
    icon: option.icon,
    tone: option.tone,
    label: option.label,
    headline: count > 0 ? `${count} ${noun}${count === 1 ? '' : 's'}` : `No ${emptyNoun}`,
    subhead: count > 0
      ? 'Review policy evidence and claim outcomes. Insurance stays read-only until admin authority is verified.'
      : 'Policy records for this scope will appear here.',
  };
};

const InsuranceStateStrip = ({ stats, policies, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
    {INSURANCE_STATE_OPTIONS.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'all') === item.id;
      const count = loading ? '...' : getInsuranceStateCount({ id: item.id, stats, policies });

      return (
        <motion.button
          key={item.id}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active}
          aria-label={`Show ${item.label.toLowerCase()} policies`}
          data-state={active ? 'selected' : 'idle'}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
              <span className="mt-1 block text-2xl font-semibold text-foreground">{count}</span>
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-inner bg-background/45 transition-transform group-hover:scale-105 ${active ? item.iconClass : ''}`}>
              <Icon className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

const InsuranceSignalPanel = ({ stats, policies, loading, kpiFilter, setKpiFilter }) => {
  const signal = loading
    ? { icon: Shield, tone: 'muted', label: 'Loading', headline: 'Loading policies', subhead: 'One moment while the policy list comes in.' }
    : getInsuranceSignal({ stats, policies, kpiFilter });
  const SignalIcon = signal.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className="flex min-h-[240px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[288px]"
      aria-live="polite"
    >
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${insuranceToneClass[signal.tone] || insuranceToneClass.muted}`}>
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

        <InsuranceStateStrip
          stats={stats}
          policies={policies}
          loading={loading}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
        />
      </div>
    </motion.section>
  );
};

const getInsuranceInitials = (name = 'Policy') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'P';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase();
};

const insuranceRailStatusClass = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
  expired: 'bg-destructive/20 text-destructive',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
};

const InsuranceDetailLine = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-muted/20 p-2.5">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value || 'Not set'}</div>
    </div>
  </div>
);

const InsuranceRailButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

const InsuranceDetailRail = ({ policy, onView }) => {
  if (!policy) {
    return (
      <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Shield className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No policy selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            Policies that match your filters will appear here.
          </p>
        </div>
      </aside>
    );
  }

  const statusClass = insuranceRailStatusClass[policy.status] || 'bg-muted text-muted-foreground';
  const StatusIcon = policy.status === 'active'
    ? CheckCircle
    : policy.status === 'expired'
      ? AlertTriangle
      : Clock;
  const isExpired = policy.status === 'expired';
  const coverageValue = policy.coverage_amount != null
    ? `$${Number(policy.coverage_amount).toLocaleString()}`
    : 'N/A';
  const expiresValue = policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A';

  return (
    <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
      <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Policy details</h2>
          <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusClass}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {policy.status || 'unknown'}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
          onClick={() => onView(policy)}
          aria-label="Open full policy details"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-muted/30 text-lg font-semibold text-foreground">
          {getInsuranceInitials(policy.policy_holder_name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{policy.policy_holder_name || 'Unnamed holder'}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {policy.policy_number || 'No policy number'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <InsuranceDetailLine icon={Shield} label="Holder" value={policy.policy_holder_name} />
        <InsuranceDetailLine icon={Eye} label="Policy #" value={policy.policy_number} />
        <InsuranceDetailLine icon={CheckCircle} label="Provider" value={policy.provider_name} />
        <InsuranceDetailLine icon={DollarSign} label="Coverage" value={coverageValue} />
        <InsuranceDetailLine icon={AlertTriangle} label="Status" value={policy.status} />
        <InsuranceDetailLine icon={Clock} label="Expires" value={expiresValue} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(policy)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        <div className="grid grid-cols-1 gap-3">
          <InsuranceRailButton icon={Info} label="Open record" onClick={() => onView(policy)} />
        </div>

        <div
          role="note"
          className={`flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          <Shield className="h-4 w-4 shrink-0" />
          Policy changes are read-only until admin authority is verified.
        </div>
      </div>
    </aside>
  );
};

export const InsuranceManagementPage = () => {
  const { isAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const [insurancePage, setInsurancePage] = useState(EMPTY_INSURANCE_PAGE);
  const [insuranceBillingContext, setInsuranceBillingContext] = useState(EMPTY_INSURANCE_BILLING_CONTEXT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [focusedPolicyId, setFocusedPolicyId] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'view'
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [commandNotice, setCommandNotice] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Filter state - includes search
  const [filters, setFilters] = useState(EMPTY_INSURANCE_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMountedRef = useRef(false);
  const fetchRequestRef = useRef(0);
  const billingFetchRequestRef = useRef(0);

  const { viewMode, setViewMode } = useViewMode('insurance', 'grid');
  const pagination = usePagination(20);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const hasActiveFilters = useMemo(() => hasActiveInsuranceFilters(filters), [filters]);
  const insurancePolicies = insurancePage.data || [];
  const insuranceStats = insurancePage.stats || EMPTY_INSURANCE_PAGE.stats;

  const showPolicyCommandUnavailable = useCallback((action = 'Policy changes') => {
    const message = `${action} unavailable until admin authority is verified.`;
    setCommandNotice(message);
    toast.info(message);
  }, []);

  const fetchInsurancePage = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    const canUpdateRouteState = () => isMountedRef.current && fetchRequestRef.current === requestId;

    try {
      if (!canUpdateRouteState()) return;
      setLoading(true);
      setError(null);
      const limit = isMobile
        ? pagination.currentPage * pagination.itemsPerPage
        : pagination.itemsPerPage;
      const offset = isMobile ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage;
      const page = await getInsurancePage({
        ...filters,
        limit,
        offset,
        sortKey: sortConfig.key,
        sortDirection: sortConfig.direction,
        quiet: true,
      });

      if (!canUpdateRouteState()) return;
      if (page.failed) {
        setInsurancePage(prevPage => ({
          ...prevPage,
          denied: false,
          failed: true,
          reason: page.reason || 'query_failed',
          errorMessage: page.errorMessage,
        }));
        setError('Insurance policies could not load. Try again.');
        return;
      }

      setInsurancePage(page);
      pagination.setTotalCount(page.count || 0);
      if (page.denied) {
        setError('Insurance access is not available for this role.');
      }
    } catch (err) {
      if (!canUpdateRouteState()) return;
      setInsurancePage(prevPage => ({
        ...prevPage,
        denied: false,
        failed: true,
        reason: 'query_failed',
        errorMessage: err?.message,
      }));
      setError('Insurance policies could not load. Try again.');
    } finally {
      if (canUpdateRouteState()) {
        setLoading(false);
      }
    }
  }, [
    filters,
    isMobile,
    pagination.currentPage,
    pagination.itemsPerPage,
    pagination.setTotalCount,
    sortConfig.direction,
    sortConfig.key,
  ]);

  const fetchInsuranceBillingContext = useCallback(async () => {
    const requestId = billingFetchRequestRef.current + 1;
    billingFetchRequestRef.current = requestId;
    const canUpdateBillingState = () => isMountedRef.current && billingFetchRequestRef.current === requestId;

    try {
      if (!canUpdateBillingState()) return;
      setInsuranceBillingContext(prevContext => ({
        ...prevContext,
        loading: true,
        errorMessage: null,
      }));

      const billingResult = await getInsuranceBillingOutcomes({
        limit: 3,
        offset: 0,
        sortKey: 'created_at',
        sortDirection: 'desc',
        quiet: true,
      });

      if (!canUpdateBillingState()) return;
      if (billingResult.denied) {
        setInsuranceBillingContext({
          ...EMPTY_INSURANCE_BILLING_CONTEXT,
          loading: false,
          denied: true,
          reason: billingResult.reason || 'admin_only',
          errorMessage: 'Billing outcomes are unavailable for this role.',
          scope: billingResult.scope || 'admin_billing_outcome_projection',
        });
        return;
      }

      if (billingResult.failed) {
        setInsuranceBillingContext(prevContext => ({
          ...prevContext,
          loading: false,
          denied: false,
          failed: true,
          reason: billingResult.reason || 'query_failed',
          errorMessage: 'Billing outcomes could not load.',
          scope: billingResult.scope || prevContext.scope || 'admin_billing_outcome_projection',
        }));
        return;
      }

      const outcomes = billingResult.data || [];
      setInsuranceBillingContext({
        outcomes,
        recentBilling: outcomes.slice(0, 3),
        stats: {
          ...EMPTY_INSURANCE_BILLING_STATS,
          ...(billingResult.stats || {}),
        },
        count: billingResult.count || outcomes.length,
        loading: false,
        denied: false,
        failed: false,
        reason: null,
        errorMessage: null,
        scope: billingResult.scope || 'admin_billing_outcome_projection',
      });
    } catch {
      if (!canUpdateBillingState()) return;
      setInsuranceBillingContext(prevContext => ({
        ...prevContext,
        loading: false,
        denied: false,
        failed: true,
        reason: 'query_failed',
        errorMessage: 'Billing outcomes could not load.',
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fetchRequestRef.current += 1;
      billingFetchRequestRef.current += 1;
    };
  }, []);

  // Listen for 'openInsuranceModal' event from ContextPanel
  useEffect(() => {
    const handleOpenModal = () => {
      showPolicyCommandUnavailable('Add policy');
    };

    const handleOpenFilters = () => {
      setFilterSheetOpen(true);
    };
    const handleOpenAnalytics = () => {
      setAnalyticsModalOpen(true);
    };

    window.addEventListener('openInsuranceModal', handleOpenModal);
    window.addEventListener('openFilters', handleOpenFilters);
    window.addEventListener('openAnalyticsModal', handleOpenAnalytics);

    return () => {
      window.removeEventListener('openInsuranceModal', handleOpenModal);
      window.removeEventListener('openFilters', handleOpenFilters);
      window.removeEventListener('openAnalyticsModal', handleOpenAnalytics);
    };
  }, [showPolicyCommandUnavailable]);

  useEffect(() => {
    pagination.resetPagination();
  }, [filterKey, pagination.resetPagination]);

  useEffect(() => {
    fetchInsurancePage();
  }, [fetchInsurancePage]);

  useEffect(() => {
    fetchInsuranceBillingContext();
  }, [fetchInsuranceBillingContext]);

  useEffect(() => {
    if (!isAdmin()) return undefined;
    let active = true;
    const unsubscribe = subscribeToInsurancePolicies(() => {
      if (active && isMountedRef.current) {
        fetchInsurancePage();
      }
    });
    return () => {
      active = false;
      fetchRequestRef.current += 1;
      unsubscribe();
    };
  }, [fetchInsurancePage, isAdmin]);

  useEffect(() => {
    if (!isAdmin()) return undefined;
    let active = true;
    const unsubscribeBilling = subscribeToInsuranceBillingOutcomes(() => {
      if (active && isMountedRef.current) {
        fetchInsuranceBillingContext();
      }
    }, 'insurance_billing_route_context');
    return () => {
      active = false;
      billingFetchRequestRef.current += 1;
      unsubscribeBilling();
    };
  }, [fetchInsuranceBillingContext, isAdmin]);

  // Filter Logic
  const filteredPolicies = useMemo(() => {
    return insurancePolicies;
  }, [insurancePolicies]);

  // Pagination Logic
  const paginatedPolicies = useMemo(() => {
    return filteredPolicies || [];
  }, [filteredPolicies]);

  const mobileVisiblePolicies = useMemo(() => {
    return filteredPolicies || [];
  }, [filteredPolicies]);

  const focusedPolicy = useMemo(
    () => paginatedPolicies.find((p) => p.id === focusedPolicyId) || paginatedPolicies[0] || null,
    [paginatedPolicies, focusedPolicyId],
  );

  const hasDesktopRows = paginatedPolicies.length > 0;
  const hasMobileRows = mobileVisiblePolicies.length > 0;

  const insurancePanelContext = useMemo(() => ({
    policies: paginatedPolicies,
    recentPolicies: paginatedPolicies.slice(0, 3),
    stats: insuranceStats,
    count: pagination.totalCount || insurancePage.count || paginatedPolicies.length,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    filters,
    hasFilters: hasActiveFilters,
    sortConfig,
    loading,
    billing: insuranceBillingContext,
    errorMessage: error,
    denied: insurancePage.denied,
    failed: insurancePage.failed,
    reason: insurancePage.reason,
    scope: insuranceStats.scope || 'admin_policy_projection',
    canManagePolicies: false,
  }), [
    error,
    filters,
    hasActiveFilters,
    insurancePage.count,
    insurancePage.denied,
    insurancePage.failed,
    insurancePage.reason,
    insuranceStats,
    insuranceBillingContext,
    loading,
    paginatedPolicies,
    pagination.currentPage,
    pagination.totalCount,
    pagination.totalPages,
    sortConfig,
  ]);

  const publishInsuranceRouteContext = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('insuranceRouteContextUpdated', {
      detail: insurancePanelContext,
    }));
  }, [insurancePanelContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    publishInsuranceRouteContext();
    window.addEventListener('requestInsuranceRouteContext', publishInsuranceRouteContext);

    return () => {
      window.removeEventListener('requestInsuranceRouteContext', publishInsuranceRouteContext);
    };
  }, [publishInsuranceRouteContext]);

  const visibleAnalyticsPolicies = isMobile ? mobileVisiblePolicies : paginatedPolicies;
  const visibleInsuranceAnalytics = useMemo(() => {
    const rows = Array.isArray(visibleAnalyticsPolicies) ? visibleAnalyticsPolicies : [];
    const byProvider = rows.reduce((acc, policy) => {
      const label = policy.provider_name || 'Unknown provider';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const byCategory = rows.reduce((acc, policy) => {
      const label = policy.policy_type || policy.coverage_type || policy.plan_type || 'Unknown type';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return {
      total: insuranceStats.total,
      active: insuranceStats.active,
      verified: insuranceStats.verified,
      expired: insuranceStats.expired,
      expiringSoon: insuranceStats.expiringSoon,
      byProvider,
      byCategory,
      visibleCount: rows.length,
      distributionScope: 'visible_page',
      distributionLabel: 'Visible page only',
    };
  }, [
    insuranceStats.active,
    insuranceStats.expired,
    insuranceStats.expiringSoon,
    insuranceStats.total,
    insuranceStats.verified,
    visibleAnalyticsPolicies,
  ]);

  // Handlers
  const handlePolicyToolsUnavailable = useCallback(() => {
    showPolicyCommandUnavailable('Policy changes');
  }, [showPolicyCommandUnavailable]);

  const handlePolicyToolsPress = useCallback((event) => {
    event.preventDefault();
    handlePolicyToolsUnavailable();
  }, [handlePolicyToolsUnavailable]);

  const handleView = useCallback((policy) => {
    setFocusedPolicyId(policy?.id || null);
    setSelectedPolicy(policy);
    setModalMode('view');
  }, []);

  const handleFocusPolicy = useCallback((policy) => setFocusedPolicyId(policy?.id || null), []);

  const handleViewAnalytics = useCallback(() => {
    setAnalyticsModalOpen(true);
  }, []);

  // Header Configuration
  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  const filterButtonComponent = React.useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      className="squircle h-9 w-9 hover:bg-muted hover:text-muted-foreground relative"
      aria-label="Filter policies"
    >
      <FilterIcon className="h-4 w-4" />
      {hasActiveFilters && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-pill bg-muted" />
      )}
    </Button>
  ), [hasActiveFilters]);

  // Command authority is not proved yet, so the header advertises read-only state.
  const headerActions = React.useMemo(() => (
    isAdmin() && (
      <Button
        onPointerDown={handlePolicyToolsPress}
        onClick={handlePolicyToolsUnavailable}
        variant="ghost"
        className="bg-card h-9 px-4 text-xs font-semibold"
        aria-label="Insurance is read-only until policy authority is verified"
      >
        <Shield className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">Read-only</span>
        <span className="md:hidden">Read</span>
      </Button>
    )
  ), [isAdmin, handlePolicyToolsUnavailable]);

  usePageHeader(
    'Insurance',
    headerActions,
    !isMobile ? viewToggleComponent : null,
    filterButtonComponent
  );

  // Footer Configuration
  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-muted/30 text-[11px] font-semibold text-muted-foreground">
        <span>Page {pagination.currentPage} of {pagination.totalPages} / {pagination.totalCount} policies</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'pagination', !loading && pagination.totalCount > 0);

  usePageShell({ bleed: true, hideFab: true });

  // Badge Logic
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
      case 'expired': return 'bg-destructive/20 text-destructive';
      case 'pending': return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter Schema
  const filterSchema = useMemo(() => [
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search policies...',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      key: 'type',
      type: 'multiselect',
      label: 'Policy type',
      options: [
        { value: 'Health', label: 'Health' },
        { value: 'Life', label: 'Life' },
        { value: 'Vehicle', label: 'Vehicle' },
        { value: 'Property', label: 'Property' }
      ]
    },
    {
      key: 'verified',
      type: 'select',
      label: 'Verification',
      options: [
        { value: 'all', label: 'All' },
        { value: 'verified', label: 'Verified only' },
        { value: 'unverified', label: 'Unverified only' }
      ]
    },
    {
      key: 'created_at',
      type: 'date',
      label: 'Policy date',
      placeholder: 'Select dates',
      shortcuts: [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 days', value: '7days' },
        { label: 'Last 30 days', value: '30days' },
        { label: 'This month', value: 'month' }
      ]
    }
  ], []);

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Insurance" description="Review insurance policy evidence and claim outcomes." />

        {error && !loading && !hasMobileRows ? (
          <div className="px-4 pt-24 pb-8" data-testid="mobile-insurance-error-state">
            {commandNotice && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
              >
                {commandNotice}
              </div>
            )}
            <Card className="rounded-card bg-card p-6 text-center">
              <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-bold text-lg mb-2">Insurance could not load</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchInsurancePage} variant="outline" className="squircle">
                Try again
              </Button>
            </Card>
          </div>
        ) : (
          <MobileInsurance
            policies={mobileVisiblePolicies}
            filters={filters}
            setFilters={setFilters}
            onView={handleView}
            onRefresh={fetchInsurancePage}
            loading={loading}
            error={error}
            onRetry={fetchInsurancePage}
            stats={insuranceStats}
            onOpenFilters={() => setFilterSheetOpen(true)}
            onViewAnalytics={handleViewAnalytics}
            hasMore={pagination.hasNextPage}
            onLoadMore={pagination.nextPage}
          />
        )}

        <InsuranceModal
          isOpen={!!modalMode}
          onClose={() => setModalMode(null)}
          policy={selectedPolicy}
          mode={modalMode}
        />

        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="insurance"
          analytics={visibleInsuranceAnalytics}
        />

        <FilterSheet
          isOpen={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          filterSchema={filterSchema}
          onApply={setFilters}
          initialValues={filters}
          resetValues={EMPTY_INSURANCE_FILTERS}
          resetLabel="Clear"
          viewToggle={null}
          isMobile={true}
        />

      </div>
    );
  }


  return (
    <div className="min-h-screen py-6 md:py-8 pt-6">
      <SEOHead title="Insurance" description="Review insurance policy evidence and claim outcomes." />

      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch">
        <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:self-stretch">
          {/* Signal panel (headline + state chips) replaces the bento KPI cards */}
          <InsuranceSignalPanel
            stats={insuranceStats}
            policies={paginatedPolicies}
            loading={loading}
            kpiFilter={filters.kpiFilter}
            setKpiFilter={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
          />

          <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet">
        <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
        {commandNotice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          {commandNotice}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error && !hasDesktopRows ? (
        <Card className="rounded-card bg-card p-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">Insurance could not load</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {error}
          </p>
          <Button onClick={fetchInsurancePage} variant="outline" className="squircle">
            Try again
          </Button>
        </Card>
      ) : filteredPolicies.length === 0 ? (
        <Card className="rounded-card bg-card p-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-xl mb-2">
            {filters.search ? 'No policies found' :
              filters.kpiFilter === 'all' && !hasActiveFilters ? 'No policies yet' :
                'No matching policies'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {filters.search ? `No policies found matching "${filters.search}". Try adjusting your search terms.` :
              filters.kpiFilter === 'all' && !hasActiveFilters ?
                'No policy records are available for this scope yet.' :
                'Try adjusting your filters or search criteria to find the policies you\'re looking for.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {filters.search && (
              <Button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} variant="outline" className="squircle">
                <X className="h-4 w-4 mr-2" />
                Clear search
              </Button>
            )}
            {(filters.kpiFilter !== 'all' || hasActiveFilters) && (
              <Button onClick={() => setFilters(EMPTY_INSURANCE_FILTERS)} variant="outline" className="squircle">
                <FilterIcon className="h-4 w-4 mr-2" />
                Reset filters
              </Button>
            )}
            <Button onClick={handlePolicyToolsUnavailable} variant="outline" className="squircle">
              <Shield className="h-4 w-4 mr-2" />
              Read-only
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {error && (
            <Card
              className="mb-4 rounded-card bg-card p-4"
              data-testid="insurance-degraded-state"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-inner bg-amber-500/15 p-2 text-amber-700 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Insurance did not refresh</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Showing the last loaded policy rows until the route read works again.
                    </p>
                  </div>
                </div>
                <Button onClick={fetchInsurancePage} variant="outline" className="squircle">
                  Try again
                </Button>
              </div>
            </Card>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
              >
                {paginatedPolicies.map((policy, index) => (
                  <motion.div
                    layout
                    key={policy.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="col-span-1"
                  >
                    <Card
                      onClick={() => handleFocusPolicy(policy)}
                      data-state={focusedPolicy?.id === policy.id ? 'selected' : 'idle'}
                      className={`h-full rounded-card p-6 group relative overflow-hidden flex flex-col cursor-pointer transition-shadow ${focusedPolicy?.id === policy.id ? 'bg-card shadow-[0_18px_54px_rgb(0_0_0/0.14)]' : 'bg-card'}`}
                    >
                      {/* Apple hover glow effect */}
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-icon surface-raised flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform duration-300">
                            <Shield className={`h-5 w-5 ${policy.status === 'expired' ? 'text-destructive' : 'text-muted-foreground'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <span className={`inline-flex items-center rounded-pill ${getStatusBadge(policy.status)} px-3 py-1 text-xs font-medium`}>
                          {policy.status}
                        </span>
                        {policy.verified && (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 px-2 py-1 text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 tracking-tight relative z-10">
                        {policy.policy_holder_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 font-mono tracking-tight">{policy.policy_number}</p>

                      <div className="space-y-3 mb-6 relative z-10 flex-1">
                        <div className="flex items-center justify-between p-3 rounded-inner bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-normal">Coverage</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            ${policy.coverage_amount?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-inner bg-muted/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-200" />
                            <span className="font-normal">Expires</span>
                          </div>
                          <span className="font-semibold text-foreground">
                            {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-auto pt-4 relative z-10 px-2">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Review
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleView(policy)}
                            className="rounded-icon h-8 px-3 text-xs font-semibold hover:bg-muted hover:text-muted-foreground"
                            aria-label={`View details for ${policy.policy_holder_name}`}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="ml-2">Details</span>
                          </Button>
                        </div>
                      </div>

                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <InsuranceListView
              policies={paginatedPolicies}
              onView={handleView}
              onDelete={null}
              onVerify={null}
              canDelete={false}
              canVerify={false}
              getStatusBadge={getStatusBadge}
              isMobile={isMobile}
            />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <InsuranceTableView
              policies={paginatedPolicies}
              onView={handleView}
              onDelete={null}
              onVerify={null}
              canDelete={false}
              canVerify={false}
              selectionEnabled={false}
              getStatusBadge={getStatusBadge}
            />
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
          </div>
        </section>

        <InsuranceDetailRail policy={focusedPolicy} onView={handleView} />
      </div>

      {/* Modals */}
      <InsuranceModal
        isOpen={!!modalMode}
        onClose={() => setModalMode(null)}
        policy={selectedPolicy}
        mode={modalMode}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        type="insurance"
        analytics={visibleInsuranceAnalytics}
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filterSchema={filterSchema}
        onApply={setFilters}
        initialValues={filters}
        resetValues={EMPTY_INSURANCE_FILTERS}
        resetLabel="Clear"
        viewToggle={isMobile ? viewToggleComponent : null}
        isMobile={isMobile}
      />

    </div>
  );
};
