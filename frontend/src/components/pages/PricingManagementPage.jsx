import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useFocusedRecord } from '../../contexts/FocusedRecordContext';
import { getPricingPageData } from '../../services/pricingService';
import { PaginationControls } from '../ui/PaginationControls';
import {
    DollarSign,
    Search,
    Plus,
    LayoutGrid,
    List as ListIcon,
    Table as TableIcon,
    TrendingUp,
    Globe,
    BadgeDollarSign,
    Activity,
    Info,
    ChevronRight,
    Eye,
    Clock,
    Building2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { motion, LayoutGroup } from 'framer-motion';
import { PricingTableView } from '../views/PricingTableView';
import { PricingListView } from '../views/PricingListView';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { Skeleton } from '../ui/skeleton';
import { MobilePricing } from '../mobile/MobilePricing';

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

const formatPricingAmount = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const PRICING_STATE_OPTIONS = [
    {
        id: 'all', label: 'Points', icon: BadgeDollarSign, tone: 'sky',
        activeClass: 'bg-sky-500/10 text-sky-800 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-100',
        restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
        iconClass: 'text-sky-600 dark:text-sky-200',
    },
    {
        id: 'override', label: 'Overrides', icon: TrendingUp, tone: 'emerald',
        activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-100',
        restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
        iconClass: 'text-emerald-600 dark:text-emerald-200',
    },
    {
        id: 'global', label: 'Global', icon: Globe, tone: 'amber',
        activeClass: 'bg-amber-500/10 text-amber-800 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-100',
        restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34',
        iconClass: 'text-amber-600 dark:text-amber-200',
    },
];

const pricingToneClass = {
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    muted: 'bg-muted/30 text-muted-foreground',
};

const normalizePricingCount = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getPricingStateCount = ({ id, summary, totalCount }) => {
    switch (id) {
        case 'override':
            return normalizePricingCount(summary?.facilityPriceCount, 0);
        case 'global':
            return normalizePricingCount(summary?.globalFallbackCount, 0);
        default:
            return normalizePricingCount(totalCount, 0);
    }
};

const getPricingSignal = ({ summary, totalCount, kpiFilter }) => {
    const activeId = kpiFilter || 'all';
    const option = PRICING_STATE_OPTIONS.find((item) => item.id === activeId) || PRICING_STATE_OPTIONS[0];
    const count = getPricingStateCount({ id: option.id, summary, totalCount });
    const nounMap = { all: 'price point', override: 'facility override', global: 'global rule' };
    const emptyMap = { all: 'price points', override: 'facility overrides', global: 'global rules' };
    return {
        icon: option.icon,
        tone: option.tone,
        label: option.label,
        headline: count > 0 ? `${count} ${nounMap[option.id] || 'price point'}${count === 1 ? '' : 's'}` : `No ${emptyMap[option.id] || 'price points'}`,
        subhead: count > 0
            ? 'Review price basis and coverage. Price changes stay read-only until a facility scope is selected.'
            : 'Price records for this scope will appear here.',
    };
};

const PricingStateStrip = ({ summary, totalCount, loading, kpiFilter, setKpiFilter }) => (
    <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
        {PRICING_STATE_OPTIONS.map((item) => {
            const Icon = item.icon;
            const active = (kpiFilter || 'all') === item.id;
            const count = loading ? '...' : getPricingStateCount({ id: item.id, summary, totalCount });
            return (
                <motion.button
                    key={item.id}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setKpiFilter(item.id)}
                    className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
                    aria-pressed={active}
                    aria-label={`Show ${item.label.toLowerCase()}`}
                    data-state={active ? 'selected' : 'idle'}
                >
                    <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                            <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
                            <span className="mt-1 block text-2xl font-semibold text-foreground">{count}</span>
                        </span>
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/45 transition-transform group-hover:scale-105 ${active ? item.iconClass : ''}`}>
                            <Icon className="h-4 w-4" />
                        </span>
                    </span>
                </motion.button>
            );
        })}
    </div>
);

const PricingSignalPanel = ({ summary, totalCount, loading, kpiFilter, setKpiFilter }) => {
    const signal = loading
        ? { icon: BadgeDollarSign, tone: 'muted', label: 'Loading', headline: 'Loading pricing', subhead: 'One moment while the pricing registry comes in.' }
        : getPricingSignal({ summary, totalCount, kpiFilter });
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
                    <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${pricingToneClass[signal.tone] || pricingToneClass.muted}`}>
                        <SignalIcon className="h-4 w-4" />
                        {signal.label}
                    </div>
                    <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] text-foreground md:text-6xl">{signal.headline}</h1>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{signal.subhead}</p>
                </div>
                <PricingStateStrip
                    summary={summary}
                    totalCount={totalCount}
                    loading={loading}
                    kpiFilter={kpiFilter}
                    setKpiFilter={setKpiFilter}
                />
            </div>
        </motion.section>
    );
};

const PriceDetailLine = ({ icon: Icon, label, value }) => (
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

const PriceRailButton = ({ icon: Icon, label, onClick }) => (
    <Button
        variant="ghost"
        className="h-11 rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
        onClick={onClick}
    >
        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
        {label}
    </Button>
);

const PricingDetailRail = ({ price, onView }) => {
    if (!price) {
        return (
            <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
                <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <BadgeDollarSign className="mb-4 h-10 w-10 text-muted-foreground/60" />
                    <h2 className="text-xl font-semibold">No price point selected</h2>
                    <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
                        Price points that match your filters will appear here.
                    </p>
                </div>
            </aside>
        );
    }

    const serviceName = price.service_name || price.item_name || price.name || price.room_name || 'Unnamed price';
    const isFacility = !!price.facility_id || !!price.hospital_id || !!price.organization_id;
    const scopeLabel = price.facility_id ? 'Facility price' : 'Global fallback';
    const priceValue = price.price != null ? `$${Number(price.price).toLocaleString()}` : 'N/A';
    const unitValue = price.unit || price.billing_unit || 'N/A';
    const updatedValue = price.updated_at ? new Date(price.updated_at).toLocaleDateString() : 'N/A';

    return (
        <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
            <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Price details</h2>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {isFacility ? <Building2 className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                        {scopeLabel}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
                    onClick={() => onView(price)}
                    aria-label="Open full price details"
                >
                    <Info className="h-4 w-4" />
                </Button>
            </div>

            <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-muted/30 text-foreground">
                    <DollarSign className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">{serviceName}</h3>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                        {priceValue}{unitValue !== 'N/A' ? ` / ${unitValue}` : ''}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <PriceDetailLine icon={BadgeDollarSign} label="Service / Item" value={serviceName} />
                <PriceDetailLine icon={DollarSign} label="Price" value={priceValue} />
                <PriceDetailLine icon={Activity} label="Unit" value={unitValue} />
                <PriceDetailLine icon={isFacility ? Building2 : Globe} label="Scope" value={scopeLabel} />
                <PriceDetailLine icon={Clock} label="Updated" value={updatedValue} />
            </div>

            <div className="mt-5 space-y-2.5">
                <Button
                    className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
                    onClick={() => onView(price)}
                >
                    <Eye className="mr-2 h-5 w-5" />
                    View details
                    <ChevronRight className="ml-auto h-5 w-5" />
                </Button>

                <div className="grid grid-cols-1 gap-3">
                    <PriceRailButton icon={Info} label="Open record" onClick={() => onView(price)} />
                </div>

                <div
                    role="note"
                    className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
                >
                    <DollarSign className="h-4 w-4 shrink-0" />
                    Price changes are read-only until a facility scope is selected.
                </div>
            </div>
        </aside>
    );
};

export const PricingManagementPage = () => {
    const { profile, isAdmin, isOrgAdmin } = useAuth();
    const { isMobile } = useNavigation();
    const [loading, setLoading] = useState(true);
    const [pricing, setPricing] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'services' | 'rooms'
    const [kpiFilter, setKpiFilter] = useState('all'); // 'all' | 'global' | 'override'
    const { viewMode, setViewMode } = useViewMode('pricing', 'grid');
    const pagination = usePagination(12);

    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
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
        try {
            const orgId = isOrgAdmin() ? profile?.organization_id || null : null;
            const projection = normalizePricingProjection(await getPricingPageData({
                family: activeTab,
                organizationId: orgId,
                search: searchTerm,
                scope: kpiFilter,
                page: pagination.currentPage,
                pageSize: pagination.itemsPerPage
            }));

            setPricing(projection.rows);
            setPricingProjection(projection);
            pagination.setTotalCount(projection.totalCount || 0);
            setSelectedIds((currentIds) => currentIds.filter((id) => (
                projection.rows.some((row) => row.id === id)
            )));
        } catch (error) {
            console.error('Error fetching pricing:', error);
            toast.error('Failed to load pricing data');
            const emptyProjection = normalizePricingProjection();
            setPricing([]);
            setPricingProjection(emptyProjection);
            pagination.setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [
        activeTab,
        isOrgAdmin,
        kpiFilter,
        pagination.currentPage,
        pagination.itemsPerPage,
        pagination.setTotalCount,
        profile?.organization_id,
        searchTerm
    ]);

    useEffect(() => {
        fetchPricing();
    }, [fetchPricing]);

    useEffect(() => {
        if (pagination.currentPage !== 1) {
            pagination.resetPagination();
        }
    }, [
        activeTab,
        kpiFilter,
        pagination.currentPage,
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

    const openModal = useCallback((item) => {
        if (item?.id) setFocused(item.id);
        showPricingCommandUnavailable();
    }, [setFocused, showPricingCommandUnavailable]);

    const handleFocusPrice = useCallback((item) => setFocused(item?.id || null), [setFocused]);

    const filteredPricing = pricing;

    const handleSelect = useCallback((id, checked) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    }, []);

    const handleSelectAll = useCallback((checked, sourceItems = filteredPricing) => {
        if (checked) {
            setSelectedIds(sourceItems.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    }, [filteredPricing]);

    const paginatedPricing = pricing;

    // Header & Footer
    const headerActions = useMemo(() => (
        <Button
            onClick={showPricingCommandUnavailable}
            data-state="unavailable"
            title={PRICING_SCOPE_UNAVAILABLE_MESSAGE}
            aria-label={`Add pricing unavailable. ${PRICING_SCOPE_UNAVAILABLE_MESSAGE}`}
            className="bg-card/70 h-9 px-4 text-[10px] font-bold"
        >
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing
        </Button>
    ), [showPricingCommandUnavailable]);

    const viewToggle = useMemo(() => (
        <div className="flex bg-muted/20 p-1 rounded-inner mr-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={`h-8 w-8 rounded-inner ${viewMode === 'grid' ? 'bg-background shadow-sm text-muted-foreground' : 'text-muted-foreground'}`}
            >
                <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={`h-8 w-8 rounded-inner ${viewMode === 'list' ? 'bg-background shadow-sm text-muted-foreground' : 'text-muted-foreground'}`}
            >
                <ListIcon className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('table')}
                className={`h-8 w-8 rounded-inner ${viewMode === 'table' ? 'bg-background shadow-sm text-muted-foreground' : 'text-muted-foreground'}`}
            >
                <TableIcon className="h-4 w-4" />
            </Button>
        </div>
    ), [viewMode, setViewMode]);

    usePageHeader('Pricing Engine', headerActions, !isMobile ? viewToggle : null);

    const footerContent = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-muted/30 text-[10px] font-bold">
                <span>Page {pagination.currentPage} of {pagination.totalPages} - {pricingTotalCount} Rules</span>
            </div>
        </div>
    ), [pagination.currentPage, pagination.totalPages, pricingTotalCount]);

    usePageFooter(footerContent, 'pagination', !loading && pricing.length > 0);

    usePageShell({ bleed: true, hideFab: true });

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
                    loading={loading}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    kpiFilter={kpiFilter}
                    setKpiFilter={setKpiFilter}
                    onView={openModal}
                    onEdit={openModal}
                    onDelete={handleDelete}
                    onRefresh={fetchPricing}
                    canEdit={canEdit}
                    onViewAnalytics={() => setAnalyticsModalOpen(true)}
                    actionNotice={actionNotice}
                    selectionEnabled={PRICING_MUTATION_COMMANDS_ENABLED}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onSelectAll={(checked) => handleSelectAll(checked, paginatedPricing)}
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

    return (
        <div className="min-h-screen py-8">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch">
                <section className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:self-stretch">
                    <PricingSignalPanel
                        summary={pricingSummary}
                        totalCount={pricingTotalCount}
                        loading={loading}
                        kpiFilter={kpiFilter}
                        setKpiFilter={setKpiFilter}
                    />

                    <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet">
                <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex bg-muted/10 p-1 rounded-card w-full md:w-fit gap-1  ">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-inner text-[10px] font-black tracking-[0.2em] transition-all duration-300 ${activeTab === 'all'
                            ? 'bg-muted text-foreground scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-inner text-[10px] font-black tracking-[0.2em] transition-all duration-300 ${activeTab === 'services'
                            ? 'bg-muted text-foreground scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-inner text-[10px] font-black tracking-[0.2em] transition-all duration-300 ${activeTab === 'rooms'
                            ? 'bg-muted text-foreground scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Rooms
                    </button>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-muted-foreground transition-colors" />
                    <input
                        placeholder="Filter configuration registry..."
                        className="w-full h-12 bg-muted/30  rounded-card pl-12 pr-6 text-[10px] font-bold transition-all  placeholder:text-muted-foreground/40"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {actionNotice && (
                <p role="status" aria-live="polite" className="mb-4 rounded-card bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                    {actionNotice}
                </p>
            )}

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-64 rounded-card bg-muted/20" />
                        ))}
                    </div>
                ) : filteredPricing.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-card   ">
                        <BadgeDollarSign className="h-12 w-12 text-muted-foreground/20 mb-4" />
                        <h4 className="text-lg font-bold text-muted-foreground">No price points found</h4>
                        <p className="text-sm text-muted-foreground/60 mb-6">Modify your search or add a new override.</p>
                        <Button
                            variant=""
                            onClick={showPricingCommandUnavailable}
                            data-state="unavailable"
                            title={PRICING_SCOPE_UNAVAILABLE_MESSAGE}
                            aria-label={`Initialize first override unavailable. ${PRICING_SCOPE_UNAVAILABLE_MESSAGE}`}
                            className="rounded-card px-8 text-[10px] font-bold"
                        >
                            Initialize First Override
                        </Button>
                    </div>
                ) : viewMode === 'table' ? (
                    <PricingTableView
                        pricing={paginatedPricing}
                        onFocus={handleFocusPrice}
                        onView={openModal}
                        onEdit={openModal}
                        onDelete={handleDelete}
                        selectedIds={selectedIds}
                        selectionEnabled={PRICING_MUTATION_COMMANDS_ENABLED}
                        onSelect={PRICING_MUTATION_COMMANDS_ENABLED ? handleSelect : undefined}
                        onSelectAll={PRICING_MUTATION_COMMANDS_ENABLED ? (checked) => handleSelectAll(checked, paginatedPricing) : undefined}
                        canEdit={canEdit}
                    />
                ) : (
                    <PricingListView
                        pricing={paginatedPricing}
                        onFocus={handleFocusPrice}
                        onView={openModal}
                        onEdit={openModal}
                        onDelete={handleDelete}
                        canEdit={canEdit}
                    />
                )}
            </div>

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

            <PricingDetailRail price={focusedPrice} onView={openModal} />
            </div>

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
};
