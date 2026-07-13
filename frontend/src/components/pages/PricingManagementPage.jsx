import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { getPricingPageData } from '../../services/pricingService';
import { BarChart3 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { usePagination } from '../../hooks/usePagination';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobilePricing } from '../mobile/MobilePricing';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { PricingDesktopWorkspace } from './pricing/PricingDesktopWorkspace';
import { SEOHead } from '../common/SEOHead';

const PRICING_MUTATION_COMMANDS_ENABLED = false;
const PRICING_SCOPE_UNAVAILABLE_MESSAGE = 'Price changes need a selected facility before they can run.';
// arrival-toast excluded by decision: the read-only projection invalidates from
// realtime but does not claim a locally identified create event.
// submit-spinner excluded by decision: no pricing write surface is mounted while
// explicit facility authority and patient-quote consequence remain unproved.
// filter-icon excluded by decision: family tabs, scope chips, and sheet search
// expose the complete filter grammar; there is no hidden FilterSheet to open.
// deep-link excluded by decision: no Pricing record URL contract is admitted
// until rendered focus proof and selected-facility identity semantics are closed.
const EMPTY_PRICING_SUMMARY = {
    globalFallbackCount: 0,
    facilityPriceCount: 0,
    averageAmount: null,
    recentCount: 0,
    basis: 'current_filter'
};
const EMPTY_PRICING_PROJECTION = {
    rows: [],
    totalCount: 0,
    summary: EMPTY_PRICING_SUMMARY,
    readState: {
        basis: 'current_filter'
    }
};

const normalizePricingProjection = (projection = EMPTY_PRICING_PROJECTION) => ({
    ...EMPTY_PRICING_PROJECTION,
    ...projection,
    rows: Array.isArray(projection.rows) ? projection.rows : [],
    totalCount: Number(projection.totalCount) || 0,
    summary: {
        ...EMPTY_PRICING_SUMMARY,
        ...(projection.summary || {})
    },
    readState: {
        ...EMPTY_PRICING_PROJECTION.readState,
        ...(projection.readState || {})
    }
});

export const PricingManagementPage = () => {
    const { profile, isAdmin, isOrgAdmin, isProvider, isDriver } = useAuth();
    const { isMobile } = useNavigation();
    const [loading, setLoading] = useState(true);
    const [pricing, setPricing] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'services' | 'rooms'
    const [kpiFilter, setKpiFilter] = useState('all'); // 'all' | 'global' | 'override'
    const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
    const pagination = usePagination(12);

    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [actionNotice, setActionNotice] = useState('');
    const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
    const [pricingProjection, setPricingProjection] = useState(EMPTY_PRICING_PROJECTION);
    const isMountedRef = useRef(false);
    const fetchRequestRef = useRef(0);
    const pricingSummary = pricingProjection.summary || EMPTY_PRICING_SUMMARY;
    const pricingTotalCount = pricingProjection.totalCount || 0;
    const roleKind = useMemo(() => {
        if (isAdmin()) return 'admin';
        if (isOrgAdmin()) return 'org_admin';
        if (isProvider()) return isDriver() ? 'driver' : 'provider';
        return 'viewer';
    }, [isAdmin, isOrgAdmin, isProvider, isDriver]);
    const pricingAnalytics = useMemo(() => ({
        total: pricingTotalCount,
        active: pricingTotalCount,
        recent: pricingSummary.recentCount || 0,
        byCategory: {
            global: pricingSummary.globalFallbackCount || 0,
            override: pricingSummary.facilityPriceCount || 0
        }
    }), [
        pricingSummary.facilityPriceCount,
        pricingSummary.globalFallbackCount,
        pricingSummary.recentCount,
        pricingTotalCount
    ]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            fetchRequestRef.current += 1;
        };
    }, []);

    const fetchPricing = useCallback(async () => {
        const requestId = fetchRequestRef.current + 1;
        fetchRequestRef.current = requestId;
        const canUpdateRouteState = () => isMountedRef.current && fetchRequestRef.current === requestId;
        if (!canUpdateRouteState()) return;

        setLoading(true);
        setLoadError(null);
        try {
            const orgId = isOrgAdmin() ? profile?.organization_id || null : null;
            const mobilePageSize = pagination.currentPage * pagination.itemsPerPage;
            const projection = normalizePricingProjection(await getPricingPageData({
                family: activeTab,
                organizationId: orgId,
                search: searchTerm,
                scope: kpiFilter,
                sortDirection: sortConfig.direction,
                page: isMobile ? 1 : pagination.currentPage,
                pageSize: isMobile ? mobilePageSize : pagination.itemsPerPage
            }));

            if (!canUpdateRouteState()) return;
            setPricing(projection.rows);
            setPricingProjection(projection);
            pagination.setTotalCount(projection.totalCount || 0);
        } catch (error) {
            if (!canUpdateRouteState()) return;
            console.error('Error fetching pricing:', error);
            toast.error('Failed to load pricing data');
            setLoadError('Pricing rules could not load. Try again.');
        } finally {
            if (canUpdateRouteState()) {
                setLoading(false);
                setMobileLoadingMore(false);
            }
        }
    }, [
        activeTab,
        isMobile,
        isOrgAdmin,
        kpiFilter,
        pagination.currentPage,
        pagination.itemsPerPage,
        pagination.setTotalCount,
        profile?.organization_id,
        searchTerm
        , sortConfig.direction
    ]);

    useEffect(() => {
        pagination.resetPagination();
        setMobileLoadingMore(false);
    }, [
        activeTab,
        kpiFilter,
        pagination.resetPagination,
        searchTerm
    ]);

    useEffect(() => {
        fetchPricing();
    }, [fetchPricing]);

    // Role-based editing rules
    const canEdit = useCallback((item) => {
        if (!PRICING_MUTATION_COMMANDS_ENABLED) return false;
        if (isAdmin()) {
            // Admin can only edit Global items
            return !item.organization_id && !item.hospital_id;
        }
        if (isOrgAdmin()) {
            // Org Admin can edit their own overrides OR create a new one based on a global one (handled by upsert)
            // But if it belongs to another org, they can't.
            if (!item.organization_id && !item.hospital_id) return true; // Can override global
            return item.organization_id === profile?.organization_id;
        }
        return false;
    }, [isAdmin, isOrgAdmin, profile?.organization_id]);

    const showPricingCommandUnavailable = useCallback(() => {
        setActionNotice(PRICING_SCOPE_UNAVAILABLE_MESSAGE);
        toast.info(PRICING_SCOPE_UNAVAILABLE_MESSAGE);
    }, []);

    const handleOpenPricingStats = useCallback(() => {
        setAnalyticsModalOpen(true);
    }, []);

    const handleDelete = useCallback(() => {
        showPricingCommandUnavailable();
    }, [showPricingCommandUnavailable]);

    const { focusedRecord, setFocused } = useFocusedRecord('pricing', pricing);
    const focusedPrice = focusedRecord;

    const pricingRouteContext = useMemo(() => ({
        pricing,
        recentPricing: pricing.slice(0, 4),
        focusedPrice,
        summary: pricingSummary,
        totalCount: pricingTotalCount,
        activeTab,
        kpiFilter,
        searchTerm,
        loading,
        error: loadError,
        readState: pricingProjection.readState,
        scope: pricingProjection.scope,
        canManagePricing: false,
    }), [activeTab, focusedPrice, kpiFilter, loadError, loading, pricing, pricingProjection.readState, pricingProjection.scope, pricingSummary, pricingTotalCount, searchTerm]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const publishPricingRouteContext = () => window.dispatchEvent(new CustomEvent('pricingRouteContextUpdated', { detail: pricingRouteContext }));
        publishPricingRouteContext();
        window.addEventListener('requestPricingRouteContext', publishPricingRouteContext);
        return () => window.removeEventListener('requestPricingRouteContext', publishPricingRouteContext);
    }, [pricingRouteContext]);

    const openModal = useCallback((item) => {
        if (item?.id) setFocused(item.id);
        showPricingCommandUnavailable();
    }, [setFocused, showPricingCommandUnavailable]);

    const handleFocusPrice = useCallback((item) => setFocused(item?.id || null), [setFocused]);

    const filteredPricing = pricing;

    const paginatedPricing = pricing;

    const handleMobileLoadMore = useCallback(() => {
        if (loading || !pagination.hasNextPage) return;
        setMobileLoadingMore(true);
        pagination.nextPage();
    }, [loading, pagination.hasNextPage, pagination.nextPage]);

    const hasPricingRows = paginatedPricing.length > 0;
    const initialLoading = loading && !hasPricingRows;
    const isFetching = loading && hasPricingRows;
    const mobileIsFetching = isFetching && !mobileLoadingMore;
    // Header & Footer
    const headerActions = useMemo(() => (
        <Button
            onClick={handleOpenPricingStats}
            data-state={analyticsModalOpen ? 'open' : 'idle'}
            aria-label="Pricing stats"
            aria-haspopup="dialog"
            aria-expanded={analyticsModalOpen}
            className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
        >
            <BarChart3 className="mr-2 h-4 w-4" />
            Pricing stats
        </Button>
    ), [analyticsModalOpen, handleOpenPricingStats]);

    usePageHeader('Pricing', headerActions);

    usePageFooter(null, 'status', false);

    usePageShell({ bleed: true, hideFab: true });
    const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
    const { routingPath, handleRailNavigate } = useWayfindingNav();

    /**
     * NOTE (2026-02-16): Removed initial context panel auto-open and 
     * harmonized KPI card layout with Organizations page for containment.
     */

    // Event listener for panel shortcuts
    useEffect(() => {
        const handleOpenAdd = () => showPricingCommandUnavailable();
        window.addEventListener('openPricingModal', handleOpenAdd);
        window.addEventListener('openPricingAnalytics', handleOpenPricingStats);
        return () => {
            window.removeEventListener('openPricingModal', handleOpenAdd);
            window.removeEventListener('openPricingAnalytics', handleOpenPricingStats);
        };
    }, [handleOpenPricingStats, showPricingCommandUnavailable]);

    if (isMobile) {
        return (
            <div className="min-h-screen">
                <SEOHead title="Pricing" description="Review platform fallback and facility pricing evidence." />
                <MobilePricing
                    pricing={paginatedPricing}
                    allPricing={pricing}
                    pricingProjection={pricingProjection}
                    loading={initialLoading}
                    isFetching={mobileIsFetching}
                    isLoadingMore={mobileLoadingMore}
                    errorMessage={loadError}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    kpiFilter={kpiFilter}
                    setKpiFilter={setKpiFilter}
                    onRefresh={fetchPricing}
                    hasMore={pagination.hasNextPage}
                    onLoadMore={handleMobileLoadMore}
                    onViewAnalytics={handleOpenPricingStats}
                    actionNotice={actionNotice}
                />
                <AnalyticsModal
                    open={analyticsModalOpen}
                    onClose={() => setAnalyticsModalOpen(false)}
                    type="generic"
                    analytics={{
                        ...pricingAnalytics
                    }}
                />
            </div>
        );
    }

    const desktopFilters = { search: searchTerm, family: activeTab, kpiFilter };
    const setDesktopFilters = (updater) => {
        const next = typeof updater === 'function' ? updater(desktopFilters) : updater;
        if (next.search !== searchTerm) setSearchTerm(next.search || '');
        if (next.family !== activeTab) setActiveTab(next.family || 'all');
        if (next.kpiFilter !== kpiFilter) setKpiFilter(next.kpiFilter || 'all');
    };

    return (
        <>
            <SEOHead title="Pricing" description="Review platform fallback and facility pricing evidence." />
            <PricingDesktopWorkspace
                rows={paginatedPricing}
                summary={pricingSummary}
                totalCount={pricingTotalCount}
                loading={initialLoading}
                isFetching={isFetching}
                error={loadError}
                filters={desktopFilters}
                setFilters={setDesktopFilters}
                retry={fetchPricing}
                pagination={pagination}
                sortConfig={sortConfig}
                onSort={(key) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }))}
                focusedPrice={focusedPrice}
                setFocused={setFocused}
                moduleRailItems={moduleRailItems}
                routingPath={routingPath}
                onRailNavigate={handleRailNavigate}
            />
        </>
    );
};
