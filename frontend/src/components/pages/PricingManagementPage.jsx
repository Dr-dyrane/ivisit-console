import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
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
    Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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

    const openModal = useCallback(() => {
        showPricingCommandUnavailable();
    }, [showPricingCommandUnavailable]);

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
            className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
        >
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing
        </Button>
    ), [showPricingCommandUnavailable]);

    const viewToggle = useMemo(() => (
        <div className="flex bg-muted/20 p-1 rounded-xl mr-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={`h-8 w-8 rounded-lg ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
                <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={`h-8 w-8 rounded-lg ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
                <ListIcon className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('table')}
                className={`h-8 w-8 rounded-lg ${viewMode === 'table' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
                <TableIcon className="h-4 w-4" />
            </Button>
        </div>
    ), [viewMode, setViewMode]);

    usePageHeader('Pricing Engine', headerActions, !isMobile ? viewToggle : null);

    const footerContent = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5  uppercase tracking-widest text-[10px] font-bold">
                <span>Page {pagination.currentPage} of {pagination.totalPages} - {pricingTotalCount} Rules</span>
            </div>
        </div>
    ), [pagination.currentPage, pagination.totalPages, pricingTotalCount]);

    usePageFooter(footerContent, 'pagination', !loading && pricing.length > 0);

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
            {/* KPI Cards */}
            <LayoutGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8">
                    <motion.div layout className="col-span-1">
                        <Card
                            className={`h-full min-h-[140px] geo-block glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 border-0 ${kpiFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : ''}`}
                            onClick={() => setKpiFilter('all')}
                        >
                            <div className="hover-glow hover-glow-primary" />
                            <div className="absolute top-0 right-0 p-4 z-20">
                                <div className="relative">
                                    <div className={`absolute inset-0 ${kpiFilter === 'all' ? 'bg-primary/30' : 'bg-primary/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                                        <BadgeDollarSign className={`h-5 w-5 ${kpiFilter === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Points</p>
                                    {kpiFilter === 'all' && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                                </div>
                                <h3 className="text-3xl font-black">{pricingTotalCount}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className="geo-sharp bg-primary/20 text-primary border-0 font-bold text-[8px] uppercase tracking-tighter">
                                        {kpiFilter === 'all' ? 'FILTERED' : 'VIEW ALL'}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div layout className="col-span-1">
                        <Card
                            className={`h-full min-h-[140px] geo-shard glass-card-premium shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 border-0 ${kpiFilter === 'override' ? 'ring-2 ring-success shadow-lg' : ''}`}
                            onClick={() => setKpiFilter('override')}
                        >
                            <div className="hover-glow hover-glow-success" />
                            <div className="absolute top-0 right-0 p-4 z-20">
                                <div className="relative">
                                    <div className={`absolute inset-0 ${kpiFilter === 'override' ? 'bg-success/30' : 'bg-success/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                                        <TrendingUp className={`h-5 w-5 ${kpiFilter === 'override' ? 'text-success' : 'text-muted-foreground'}`} />
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Base Cost</p>
                                    {kpiFilter === 'override' && <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
                                </div>
                                <h3 className="text-3xl font-bold flex items-center gap-2">
                                    {formatPricingAmount(pricingSummary.averageAmount)}
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className={`geo-sharp border-0 font-bold text-[8px] uppercase tracking-tighter ${kpiFilter === 'override' ? 'bg-success/20 text-success' : 'bg-muted/10 text-muted-foreground'}`}>
                                        {kpiFilter === 'override' ? 'FILTERED' : 'OVERRIDE'}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div layout className="col-span-1">
                        <Card
                            className={`h-full min-h-[140px] geo-round glass-card shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group transition-all duration-200 border-0 ${kpiFilter === 'global' ? 'ring-2 ring-info shadow-lg' : ''}`}
                            onClick={() => setKpiFilter('global')}
                        >
                            <div className="hover-glow hover-glow-info" />
                            <div className="absolute top-0 right-0 p-4 z-20">
                                <div className="relative">
                                    <div className={`absolute inset-0 ${kpiFilter === 'global' ? 'bg-info/30' : 'bg-info/10'} blur-xl rounded-full scale-150 transition-all duration-200 group-hover:scale-200`} />
                                    <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                                        <Globe className={`h-5 w-5 ${kpiFilter === 'global' ? 'text-info' : 'text-muted-foreground'}`} />
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Coverage</p>
                                    {kpiFilter === 'global' && <div className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" />}
                                </div>
                                <h3 className="text-3xl font-black">
                                    {pricingSummary.globalFallbackCount || 0} <span className="text-[10px] text-muted-foreground font-medium uppercase font-sans">Rules</span>
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className={`geo-sharp border-0 font-bold text-[8px] uppercase tracking-tighter ${kpiFilter === 'global' ? 'bg-info/20 text-info' : 'bg-muted/10 text-muted-foreground'}`}>
                                        {kpiFilter === 'global' ? 'FILTERED' : 'UNIFY'}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div layout className="col-span-1">
                        <Card className="h-full min-h-[140px] geo-block glass-card shadow-2xl p-6 hover-lift relative overflow-hidden group border-0">
                            <div className="absolute inset-0 dot-grid opacity-5" />
                            <div className="absolute top-0 right-0 p-4 z-20">
                                <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-200">
                                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Data Basis</p>
                                <h3 className="text-3xl font-black">Current</h3>
                            </div>
                        </Card>
                    </motion.div>

                </div>
            </LayoutGroup>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex bg-muted/10 backdrop-blur-md p-1 rounded-2xl w-full md:w-fit gap-1 border border-white/5">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'all'
                            ? 'bg-primary text-white shadow-glow-primary scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'services'
                            ? 'bg-primary text-white shadow-glow-primary scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'rooms'
                            ? 'bg-primary text-white shadow-glow-primary scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Rooms
                    </button>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        placeholder="Filter configuration registry..."
                        className="w-full h-12 bg-white/5  rounded-2xl pl-12 pr-6 text-[10px] font-bold uppercase tracking-widest focus:ring-2 ring-primary/20 transition-all outline-none placeholder:text-muted-foreground/40"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {actionNotice && (
                <p role="status" aria-live="polite" className="mb-4 rounded-2xl bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                    {actionNotice}
                </p>
            )}

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-64 rounded-[32px] bg-muted/20" />
                        ))}
                    </div>
                ) : filteredPricing.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-[40px] border border-dashed border-muted/20">
                        <BadgeDollarSign className="h-12 w-12 text-muted-foreground/20 mb-4" />
                        <h4 className="text-lg font-bold text-muted-foreground">No price points found</h4>
                        <p className="text-sm text-muted-foreground/60 mb-6">Modify your search or add a new override.</p>
                        <Button
                            variant="outline"
                            onClick={showPricingCommandUnavailable}
                            data-state="unavailable"
                            title={PRICING_SCOPE_UNAVAILABLE_MESSAGE}
                            aria-label={`Initialize first override unavailable. ${PRICING_SCOPE_UNAVAILABLE_MESSAGE}`}
                            className="rounded-2xl px-8 uppercase tracking-widest text-[10px] font-bold"
                        >
                            Initialize First Override
                        </Button>
                    </div>
                ) : viewMode === 'table' ? (
                    <PricingTableView
                        pricing={paginatedPricing}
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

            {/* Pagination Placeholder */}
            {/* pass pagination to smart footer like other pages do */}

            <AnalyticsModal
                open={analyticsModalOpen}
                onClose={() => setAnalyticsModalOpen(false)}
                type="generic"
                analytics={{
                    ...pricingAnalytics
                }}
            />

        </div >
    );
};
