import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { getOrganizations } from '../../services/organizationsService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import {
    Building2,
    Plus,
    Search,
    LayoutGrid,
    Table as TableIcon,
    Activity,
    DollarSign,
    Wallet,
    Globe,
    X,
    Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { OrganizationTableView } from '../views/OrganizationTableView';
import { OrganizationListView } from '../views/OrganizationListView';
import { MobileOrganizations } from '../mobile/MobileOrganizations';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

const ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE = 'Organization changes are not ready until organization authority is verified.';

export const OrganizationsPage = () => {
    const { isAdmin } = useAuth();
    const { isMobile } = useNavigation();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [kpiFilter, setKpiFilter] = useState('total');
    const { viewMode, setViewMode } = useViewMode('organizations', 'table');
    const pagination = usePagination(12);

    // Modal State
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: null
    });
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [organizationCommandNotice, setOrganizationCommandNotice] = useState(null);

    const fetchOrganizations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getOrganizations();
            setOrganizations(data);
        } catch (error) {
            handleApiError(error, 'fetch');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    const handleOrganizationCommandUnavailable = useCallback(() => {
        setOrganizationCommandNotice(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);
        toast.info(ORGANIZATION_COMMAND_UNAVAILABLE_MESSAGE);
        return false;
    }, []);

    const handleCreate = useCallback(() => {
        handleOrganizationCommandUnavailable();
    }, [handleOrganizationCommandUnavailable]);

    const handleEdit = useCallback(() => {
        handleOrganizationCommandUnavailable();
    }, [handleOrganizationCommandUnavailable]);

    const handleDelete = useCallback(() => {
        handleOrganizationCommandUnavailable();
    }, [handleOrganizationCommandUnavailable]);

    const handleBulkDelete = useCallback(() => {
        handleOrganizationCommandUnavailable();
    }, [handleOrganizationCommandUnavailable]);

    const handleSave = async (e) => {
        e.preventDefault();
        handleOrganizationCommandUnavailable();
    };

    const handleSelect = useCallback((id, checked) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    }, []);

    // Filters & Pagination
    const filteredOrgs = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return organizations.filter(org => {
            const matchesSearch =
                org.name.toLowerCase().includes(term) ||
                org.contact_email?.toLowerCase().includes(term) ||
                org.stripe_account_id?.toLowerCase().includes(term);

            const matchesKpi =
                kpiFilter === 'total' ? true :
                    kpiFilter === 'active' ? !!org.is_active :
                        kpiFilter === 'wallet' ? Number(org.wallet_balance) > 0 :
                            true;

            return matchesSearch && matchesKpi;
        });
    }, [organizations, searchTerm, kpiFilter]);

    const handleSelectAll = useCallback((checked, sourceItems = filteredOrgs) => {
        if (checked) {
            setSelectedIds(sourceItems.map(org => org.id));
        } else {
            setSelectedIds([]);
        }
    }, [filteredOrgs]);

    useEffect(() => {
        pagination.setTotalCount(filteredOrgs.length);
        pagination.resetPagination();
    }, [filteredOrgs.length, pagination.setTotalCount, pagination.resetPagination]);

    const paginatedOrgs = useMemo(() => {
        const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
        return filteredOrgs.slice(start, start + pagination.itemsPerPage);
    }, [filteredOrgs, pagination.currentPage, pagination.itemsPerPage]);

    const mobileVisibleOrgs = useMemo(() => {
        const visibleCount = pagination.currentPage * pagination.itemsPerPage;
        return filteredOrgs.slice(0, visibleCount);
    }, [filteredOrgs, pagination.currentPage, pagination.itemsPerPage]);

    const organizationSummary = useMemo(() => ({
        total: organizations.length,
        active: organizations.filter(org => org.is_active).length,
        totalWallet: organizations.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0),
        filteredTotal: filteredOrgs.length,
        loading
    }), [filteredOrgs.length, loading, organizations]);

    const organizationsRouteContext = useMemo(() => ({
        organizations: organizations.slice(0, 25),
        summary: organizationSummary
    }), [organizationSummary, organizations]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const publishOrganizationsRouteContext = () => {
            window.dispatchEvent(new CustomEvent('organizationsRouteContextUpdated', {
                detail: organizationsRouteContext
            }));
        };

        publishOrganizationsRouteContext();
        window.addEventListener('requestOrganizationsRouteContext', publishOrganizationsRouteContext);

        return () => {
            window.removeEventListener('requestOrganizationsRouteContext', publishOrganizationsRouteContext);
        };
    }, [organizationsRouteContext]);

    const headerActions = useMemo(() => (
        <div className="flex items-center gap-2">
            {isAdmin() && (
                <Button
                    onClick={handleCreate}
                    className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
                    aria-label="Add organization unavailable"
                    aria-describedby={organizationCommandNotice ? 'organizations-action-feedback' : undefined}
                    data-state="unavailable"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Board New Org
                </Button>
            )}
        </div>
    ), [isAdmin, handleCreate]);

    const viewToggleComponent = useMemo(() => (
        <div className="mr-2 flex rounded-button bg-muted/20 p-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={`h-8 w-8 rounded-icon ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
                <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('table')}
                className={`h-8 w-8 rounded-icon ${viewMode === 'table' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
                <TableIcon className="h-4 w-4" />
            </Button>
        </div>
    ), [viewMode, setViewMode]);

    usePageHeader("Organization Registry", headerActions, !isMobile ? viewToggleComponent : null);

    const footerContent = useMemo(() => (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 rounded-pill bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                    <div className={`h-1.5 w-1.5 rounded-pill ${loading ? 'bg-zinc-500 animate-pulse' : 'bg-success'}`} />
                    <span>Page {pagination.currentPage} of {pagination.totalPages} - {filteredOrgs.length} Organizations</span>
                </div>
            </div>
    ), [pagination.currentPage, pagination.totalPages, filteredOrgs.length, loading]);

    usePageFooter(footerContent, 'pagination', !loading && filteredOrgs.length > 0);

    /**
     * NOTE (2026-02-16): Removed initial context panel auto-open to adhere
     * to the 'Alexander UI' principle of 'Reveal Gradually'.
     * The panel now only opens via explicit user interaction.
     */

    useEffect(() => {
        const handleOpenAdd = () => handleCreate();
        window.addEventListener('openOrganizationModal', handleOpenAdd);
        return () => window.removeEventListener('openOrganizationModal', handleOpenAdd);
    }, [handleCreate]);

    const totalWallet = organizationSummary.totalWallet;

    if (isMobile) {
        return (
            <div className="min-h-screen">
                {organizationCommandNotice && (
                    <p
                        id="organizations-action-feedback"
                        className="mx-4 mb-3 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
                        role="status"
                        aria-live="polite"
                    >
                        {organizationCommandNotice}
                    </p>
                )}

                <MobileOrganizations
                    organizations={mobileVisibleOrgs}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    kpiFilter={kpiFilter}
                    setKpiFilter={setKpiFilter}
                    onCreate={handleCreate}
                    onView={handleEdit}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRefresh={fetchOrganizations}
                    canManage={isAdmin()}
                    loading={loading}
                    onViewAnalytics={() => setAnalyticsModalOpen(true)}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onSelectAll={(checked) => handleSelectAll(checked, mobileVisibleOrgs)}
                    hasMore={pagination.hasNextPage}
                    onLoadMore={pagination.nextPage}
                />

                <Dialog
                    open={isModalOpen}
                    onOpenChange={(open) => {
                        setIsModalOpen(open);
                        if (!open) setSelectedOrg(null);
                    }}
                >
                    <DialogContent className="z-[120] mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-5rem)] w-[calc(100vw-1rem)] overflow-hidden overflow-y-auto rounded-modal glass-card p-2 shadow-2xl sm:max-w-[425px] md:max-h-[90vh] md:p-6">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-success/20">
                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-success origin-left" />
                        </div>

                        <DialogHeader className="pt-4">
                            <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
                                <div className="rounded-icon bg-success/10 p-2">
                                    <Building2 className="h-5 w-5 text-success" />
                                </div>
                                {selectedOrg?.id ? 'Entity Configuration' : 'Entity Provisioning'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSave} className="space-y-5 py-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Legal_Name</Label>
                                <Input
                                    value={selectedOrg?.name || ''}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, name: e.target.value })}
                                    className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                    placeholder="Enter organization name"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Registry_Contact</Label>
                                <Input
                                    value={selectedOrg?.contact_email || ''}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, contact_email: e.target.value })}
                                    className="h-12 rounded-button bg-muted/20 px-5"
                                    placeholder="admin@org.com"
                                    type="email"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Revenue_Share (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={selectedOrg?.ivisit_fee_percentage || ''}
                                        onChange={(e) => setSelectedOrg({ ...selectedOrg, ivisit_fee_percentage: e.target.value })}
                                        className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Lifecycle_State</Label>
                                    <div className="flex h-12 items-center gap-4 rounded-button bg-muted/20 px-5">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrg?.is_active || false}
                                            onChange={(e) => setSelectedOrg({ ...selectedOrg, is_active: e.target.checked })}
                                            className="h-5 w-5 rounded-icon accent-success"
                                        />
                                        <span className="text-sm font-bold opacity-60">Active Node</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Connected_Stripe_ID</Label>
                                <Input
                                    value={selectedOrg?.stripe_account_id || ''}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, stripe_account_id: e.target.value })}
                                    className="h-12 rounded-button bg-muted/20 px-5 font-mono text-xs"
                                    placeholder="acct_..."
                                />
                            </div>

                            <DialogFooter className="gap-3 pt-4">
                                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="h-12 rounded-button px-8 text-[10px] font-bold uppercase tracking-widest">Return</Button>
                                <Button type="submit" className="h-12 rounded-button bg-success px-10 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-xl shadow-success/20">
                                    Deploy Config
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <ConfirmationModal
                    isOpen={confirmationModal.isOpen}
                    onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                    title={confirmationModal.title}
                    description={confirmationModal.description}
                    onConfirm={confirmationModal.onConfirm}
                    variant="destructive"
                />

                <AnalyticsModal
                    open={analyticsModalOpen}
                    onClose={() => setAnalyticsModalOpen(false)}
                    type="generic"
                    analytics={{
                        total: organizations.length,
                        active: organizations.filter(o => o.is_active).length,
                        recent: organizations.filter(o => {
                            if (!o.created_at) return false;
                            const d = new Date(o.created_at);
                            const cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - 30);
                            return d >= cutoff;
                        }).length,
                        byCategory: {
                            active: organizations.filter(o => o.is_active).length,
                            inactive: organizations.filter(o => !o.is_active).length
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8">
            {organizationCommandNotice && (
                <p
                    id="organizations-action-feedback"
                    className="mb-4 rounded-inner bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
                    role="status"
                    aria-live="polite"
                >
                    {organizationCommandNotice}
                </p>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8">
                <div className="col-span-1 rounded-card glass-card p-6 flex items-center gap-4 relative overflow-hidden group hover-lift transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-pill -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="p-3 bg-primary/20 rounded-icon relative z-10">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Active Nodes</p>
                        <h3 className="text-2xl font-black">{organizations.filter(o => o.is_active).length}</h3>
                    </div>
                </div>

                <div className="col-span-1 rounded-card glass-card p-6 flex items-center gap-4 bg-gradient-to-br from-info/5 to-transparent overflow-hidden hover-lift transition-all shadow-premium">
                    <div className="p-3 bg-info/20 rounded-icon">
                        <Wallet className="h-6 w-6 text-info" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-info/60 uppercase tracking-widest">Network Float</p>
                        <h3 className="text-2xl font-black">
                            ${totalWallet.toLocaleString()}
                        </h3>
                    </div>
                </div>

                <div className="col-span-1 rounded-card glass-card p-6 flex items-center gap-4 bg-white/5 hover-lift transition-all">
                    <div className="p-3 bg-white/10 rounded-icon">
                        <Globe className="h-6 w-6 text-white/50" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Regions</p>
                        <h3 className="text-2xl font-black">Global</h3>
                    </div>
                </div>
                <div className="col-span-1 rounded-card glass-card-premium p-6 flex flex-col justify-center items-center gap-1 group hover-lift transition-all">
                    <div className="p-2 bg-primary/10 rounded-icon mb-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Avg_Fee</p>
                    <h3 className="text-xl font-black">
                        {(organizations.length > 0 ? (organizations.reduce((acc, o) => acc + (parseFloat(o.ivisit_fee_percentage) || 0), 0) / organizations.length) : 0).toFixed(1)}%
                    </h3>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Search registry by name, email or ID..."
                        className="w-full h-12 bg-muted/20 rounded-button pl-12 pr-6 text-xs font-medium transition-all focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {searchTerm && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchTerm('')}
                        className="h-12 w-12 rounded-button bg-muted/20"
                        aria-label="Clear search"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-64 rounded-card bg-muted/20" />
                        ))}
                    </div>
                ) : filteredOrgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-card bg-muted/5 py-20 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
                        <h4 className="text-lg font-bold text-muted-foreground">Registry Empty</h4>
                        <p className="text-sm text-muted-foreground/60 mb-6">No organizations match your current criteria.</p>
                        {isAdmin() && (
                            <Button
                                variant="outline"
                                onClick={handleCreate}
                                className="rounded-button px-8 text-[10px] font-bold uppercase tracking-widest"
                                aria-label="Add organization unavailable"
                                aria-describedby={organizationCommandNotice ? 'organizations-action-feedback' : undefined}
                                data-state="unavailable"
                            >
                                Onboard New Partner
                            </Button>
                        )}
                    </div>
                ) : (!isMobile && viewMode === 'table') ? (
                    <OrganizationTableView
                        organizations={paginatedOrgs}
                        onView={handleEdit}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={(checked) => handleSelectAll(checked, paginatedOrgs)}
                    />
                ) : (
                    <OrganizationListView
                        organizations={paginatedOrgs}
                        onView={handleEdit}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPrevPage={pagination.prevPage}
                onNextPage={pagination.nextPage}
                hasPrevPage={pagination.hasPrevPage}
                hasNextPage={pagination.hasNextPage}
                loading={loading}
            />

            {/* Org Modal */}
            <Dialog
                open={isModalOpen}
                onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) setSelectedOrg(null);
                }}
            >
                <DialogContent className="z-[120] mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-5rem)] w-[calc(100vw-1rem)] overflow-hidden overflow-y-auto rounded-modal glass-card p-2 shadow-2xl sm:max-w-[425px] md:max-h-[90vh] md:p-6">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-success/20">
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-success origin-left" />
                    </div>

                    <DialogHeader className="pt-4">
                        <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
                            <div className="rounded-icon bg-success/10 p-2">
                                <Building2 className="h-5 w-5 text-success" />
                            </div>
                            {selectedOrg?.id ? 'Entity Configuration' : 'Entity Provisioning'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-5 py-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Legal_Name</Label>
                            <Input
                                value={selectedOrg?.name || ''}
                                onChange={(e) => setSelectedOrg({ ...selectedOrg, name: e.target.value })}
                                className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                placeholder="Enter organization name"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Registry_Contact</Label>
                            <Input
                                value={selectedOrg?.contact_email || ''}
                                onChange={(e) => setSelectedOrg({ ...selectedOrg, contact_email: e.target.value })}
                                className="h-12 rounded-button bg-muted/20 px-5"
                                placeholder="admin@org.com"
                                type="email"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Revenue_Share (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={selectedOrg?.ivisit_fee_percentage || ''}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, ivisit_fee_percentage: e.target.value })}
                                    className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Lifecycle_State</Label>
                                <div className="flex h-12 items-center gap-4 rounded-button bg-muted/20 px-5">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrg?.is_active || false}
                                        onChange={(e) => setSelectedOrg({ ...selectedOrg, is_active: e.target.checked })}
                                        className="h-5 w-5 rounded-icon accent-success"
                                    />
                                    <span className="text-sm font-bold opacity-60">Active Node</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Connected_Stripe_ID</Label>
                            <Input
                                value={selectedOrg?.stripe_account_id || ''}
                                onChange={(e) => setSelectedOrg({ ...selectedOrg, stripe_account_id: e.target.value })}
                                className="h-12 rounded-button bg-muted/20 px-5 font-mono text-xs"
                                placeholder="acct_..."
                            />
                            <p className="text-[10px] opacity-40 italic ml-4">Authorized for automated secure payouts.</p>
                        </div>

                        <DialogFooter className="gap-3 pt-4">
                            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="h-12 rounded-button px-8 text-[10px] font-bold uppercase tracking-widest">Return</Button>
                            <Button type="submit" className="h-12 rounded-button bg-success px-10 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-xl shadow-success/20">
                                Deploy Config
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmationModal.title}
                description={confirmationModal.description}
                onConfirm={confirmationModal.onConfirm}
                variant="destructive"
            />

            <AnalyticsModal
                open={analyticsModalOpen}
                onClose={() => setAnalyticsModalOpen(false)}
                type="generic"
                analytics={{
                    total: organizations.length,
                    active: organizations.filter(o => o.is_active).length,
                    recent: organizations.filter(o => {
                        if (!o.created_at) return false;
                        const d = new Date(o.created_at);
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - 30);
                        return d >= cutoff;
                    }).length,
                    byCategory: {
                        active: organizations.filter(o => o.is_active).length,
                        inactive: organizations.filter(o => !o.is_active).length
                    }
                }}
            />

            <BulkActionBar
                selectedCount={selectedIds.length}
                onClear={() => setSelectedIds([])}
            >
                {isAdmin() && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBulkDelete}
                        className="h-10 w-10 rounded-button bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all"
                        title="Delete Selected"
                        aria-label="Delete organizations unavailable"
                        aria-describedby={organizationCommandNotice ? 'organizations-action-feedback' : undefined}
                        data-state="unavailable"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                )}
            </BulkActionBar>
        </div>
    );
};
