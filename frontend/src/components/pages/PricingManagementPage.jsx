import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { getPricingPageData } from '../../services/pricingService';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { usePagination } from '../../hooks/usePagination';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { MobilePricing } from '../mobile/MobilePricing';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useWayfindingNav } from '../console/WorkspaceStage';
import { PricingDesktopWorkspace } from './pricing/PricingDesktopWorkspace';

const PRICING_MUTATION_COMMANDS_ENABLED = false;
const PRICING_SCOPE_UNAVAILABLE_MESSAGE = 'Price changes need a selected facility before they can run.';
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
    const { profile, isAdmin, isOrgAdmin } = useAuth();
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
    const [pricingProjection, setPricingProjection] = useState(EMPTY_PRICING_PROJECTION);
    const pricingSummary = pricingProjection.summary || EMPTY_PRICING_SUMMARY;
    const pricingTotalCount = pricingProjection.totalCount || 0;
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

    const fetchPricing = useCallback(async () => {
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

            setPricing(projection.rows);
            setPricingProjection(projection);
            pagination.setTotalCount(projection.totalCount || 0);
        } catch (error) {
            console.error('Error fetching pricing:', error);
            toast.error('Failed to load pricing data');
            setLoadError('Pricing rules could not load. Try again.');
        } finally {
            setLoading(false);
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
        fetchPricing();
    }, [fetchPricing]);

    useEffect(() => {
        pagination.resetPagination();
    }, [
        activeTab,
        kpiFilter,
        pagination.resetPagination,
        searchTerm
    ]);

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

    const hasPricingRows = paginatedPricing.length > 0;
    const initialLoading = loading && !hasPricingRows;
    const isFetching = loading && hasPricingRows;
    const isLoadingMore = isFetching && pagination.currentPage > 1;
    // Header & Footer
    const headerActions = useMemo(() => (
        <Button
            onClick={showPricingCommandUnavailable}
            data-state="unavailable"
            title={PRICING_SCOPE_UNAVAILABLE_MESSAGE}
            aria-label={`Add pricing unavailable. ${PRICING_SCOPE_UNAVAILABLE_MESSAGE}`}
            className="bg-card/70 h-9 px-4 text-[10px] font-bold text-foreground"
        >
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing
        </Button>
    ), [showPricingCommandUnavailable]);

    usePageHeader('Pricing', headerActions);

    const footerContent = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-muted/30 text-[10px] font-bold">
                <span>Page {pagination.currentPage} of {pagination.totalPages} - {pricingTotalCount} Rules</span>
            </div>
        </div>
    ), [pagination.currentPage, pagination.totalPages, pricingTotalCount]);

    usePageFooter(footerContent, 'pagination', !loading && pricing.length > 0);

    usePageShell({ bleed: true, hideFab: true });
    const moduleRailItems = useMemo(() => getConsoleModuleRailItems({ isAdmin: isAdmin() }), [isAdmin]);
    const { routingPath, handleRailNavigate } = useWayfindingNav();

    /**
     * NOTE (2026-02-16): Removed initial context panel auto-open and 
     * harmonized KPI card layout with Organizations page for containment.
     */

    // Event listener for panel shortcuts
    useEffect(() => {
        const handleOpenAdd = () => showPricingCommandUnavailable();
        window.addEventListener('openPricingModal', handleOpenAdd);
        return () => window.removeEventListener('openPricingModal', handleOpenAdd);
    }, [showPricingCommandUnavailable]);

    if (isMobile) {
        return (
            <div className="min-h-screen">
                <MobilePricing
                    pricing={paginatedPricing}
                    allPricing={pricing}
                    pricingProjection={pricingProjection}
                    loading={initialLoading}
                    isFetching={isFetching}
                    isLoadingMore={isLoadingMore}
                    errorMessage={loadError}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    kpiFilter={kpiFilter}
                    setKpiFilter={setKpiFilter}
                    onRefresh={fetchPricing}
                    hasMore={pagination.hasNextPage}
                    onLoadMore={pagination.nextPage}
                    onViewAnalytics={() => setAnalyticsModalOpen(true)}
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
    );
};
