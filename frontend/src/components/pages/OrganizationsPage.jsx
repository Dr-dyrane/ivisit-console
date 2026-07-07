import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
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

const ORG_STATE_OPTIONS = [
  { id: 'total', label: 'Registry', icon: Building2, tone: 'sky',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-sky-600 dark:text-sky-200' },
  { id: 'active', label: 'Active', icon: Activity, tone: 'emerald',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-emerald-600 dark:text-emerald-200' },
  { id: 'wallet', label: 'Funded', icon: Wallet, tone: 'amber',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-100',
    restClass: 'bg-muted/24 text-muted-foreground hover:bg-muted/34', iconClass: 'text-amber-600 dark:text-amber-200' },
];

const orgToneClass = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  muted: 'bg-muted/30 text-muted-foreground',
};

const normalizeOrgCount = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getOrgStateCount = ({ id, stats, organizations }) => {
  const rows = Array.isArray(organizations) ? organizations : [];
  switch (id) {
    case 'active':
      return normalizeOrgCount(stats?.active, rows.filter((org) => !!org.is_active).length);
    case 'wallet':
      return normalizeOrgCount(stats?.funded, rows.filter((org) => Number(org.wallet_balance) > 0).length);
    default:
      return normalizeOrgCount(stats?.total, rows.length);
  }
};

const getOrgSignal = ({ stats, organizations, kpiFilter }) => {
  const activeId = kpiFilter || 'total';
  const option = ORG_STATE_OPTIONS.find((item) => item.id === activeId) || ORG_STATE_OPTIONS[0];
  const count = getOrgStateCount({ id: option.id, stats, organizations });
  const nounMap = { total: 'organization', active: 'active organization', wallet: 'funded organization' };
  const emptyMap = { total: 'organizations', active: 'active organizations', wallet: 'funded organizations' };
  return {
    icon: option.icon,
    tone: option.tone,
    label: option.label,
    headline: count > 0 ? `${count} ${nounMap[option.id] || 'organization'}${count === 1 ? '' : 's'}` : `No ${emptyMap[option.id] || 'organizations'}`,
    subhead: count > 0
      ? 'Review registry identity, wallet float, and revenue share. Organization commands stay disabled until organization authority is verified.'
      : 'Organization records for this scope will appear here.',
  };
};

const OrgStateStrip = ({ stats, organizations, loading, kpiFilter, setKpiFilter }) => (
  <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
    {ORG_STATE_OPTIONS.map((item) => {
      const Icon = item.icon;
      const active = (kpiFilter || 'total') === item.id;
      const count = loading ? '...' : getOrgStateCount({ id: item.id, stats, organizations });
      return (
        <motion.button key={item.id} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
          onClick={() => setKpiFilter(item.id)}
          className={`group min-h-[78px] rounded-card px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? item.activeClass : item.restClass}`}
          aria-pressed={active} aria-label={`Show ${item.label.toLowerCase()} organizations`} data-state={active ? 'selected' : 'idle'}>
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

const OrgSignalPanel = ({ stats, organizations, loading, kpiFilter, setKpiFilter }) => {
  const signal = loading
    ? { icon: Building2, tone: 'muted', label: 'Loading', headline: 'Loading organizations', subhead: 'One moment while the registry list comes in.' }
    : getOrgSignal({ stats, organizations, kpiFilter });
  const SignalIcon = signal.icon;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}
      className="flex min-h-[240px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[288px]" aria-live="polite">
      <div className="min-w-0">
        <div className="max-w-2xl">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${orgToneClass[signal.tone] || orgToneClass.muted}`}>
            <SignalIcon className="h-4 w-4" />
            {signal.label}
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] text-foreground md:text-6xl">{signal.headline}</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{signal.subhead}</p>
        </div>
        <OrgStateStrip stats={stats} organizations={organizations} loading={loading} kpiFilter={kpiFilter} setKpiFilter={setKpiFilter} />
      </div>
    </motion.section>
  );
};

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
                    className="bg-card/70 h-9 px-4 text-[10px] font-bold"
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
                className={`h-8 w-8 rounded-icon ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
                <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('table')}
                className={`h-8 w-8 rounded-icon ${viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
                <TableIcon className="h-4 w-4" />
            </Button>
        </div>
    ), [viewMode, setViewMode]);

    usePageHeader("Organization Registry", headerActions, !isMobile ? viewToggleComponent : null);

    const footerContent = useMemo(() => (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 rounded-pill bg-muted/30 px-3 py-1 text-[10px] font-bold">
                    <div className={`h-1.5 w-1.5 rounded-pill ${loading ? 'bg-zinc-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span>Page {pagination.currentPage} of {pagination.totalPages} - {filteredOrgs.length} Organizations</span>
                </div>
            </div>
    ), [pagination.currentPage, pagination.totalPages, filteredOrgs.length, loading]);

    usePageFooter(footerContent, 'pagination', !loading && filteredOrgs.length > 0);

    usePageShell({ bleed: true, hideFab: true });

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
                    <DialogContent className="z-[120] mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-5rem)] w-[calc(100vw-1rem)] overflow-hidden overflow-y-auto rounded-modal bg-card/70 p-2 shadow-sm sm:max-w-[425px] md:max-h-[90vh] md:p-6">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500/20">
                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-emerald-500 origin-left" />
                        </div>

                        <DialogHeader className="pt-4">
                            <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                <div className="rounded-icon bg-emerald-500/15 p-2">
                                    <Building2 className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                                </div>
                                {selectedOrg?.id ? 'Entity Configuration' : 'Entity Provisioning'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSave} className="space-y-5 py-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Legal_Name</Label>
                                <Input
                                    value={selectedOrg?.name || ''}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, name: e.target.value })}
                                    className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                    placeholder="Enter organization name"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Registry_Contact</Label>
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
                                    <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Revenue_Share (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={selectedOrg?.ivisit_fee_percentage || ''}
                                        onChange={(e) => setSelectedOrg({ ...selectedOrg, ivisit_fee_percentage: e.target.value })}
                                        className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Lifecycle_State</Label>
                                    <div className="flex h-12 items-center gap-4 rounded-button bg-muted/20 px-5">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrg?.is_active || false}
                                            onChange={(e) => setSelectedOrg({ ...selectedOrg, is_active: e.target.checked })}
                                            className="h-5 w-5 rounded-icon accent-emerald-500"
                                        />
                                        <span className="text-sm font-bold opacity-60">Active Node</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Connected_Stripe_ID</Label>
                                <Input
                                    value={selectedOrg?.stripe_account_id || ''}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, stripe_account_id: e.target.value })}
                                    className="h-12 rounded-button bg-muted/20 px-5 font-mono text-xs"
                                    placeholder="acct_..."
                                />
                            </div>

                            <DialogFooter className="gap-3 pt-4">
                                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="h-12 rounded-button px-8 text-[10px] font-bold">Return</Button>
                                <Button type="submit" className="h-12 rounded-button bg-foreground px-10 text-[10px] font-bold text-background shadow-sm">
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

            {/* Signal Panel - Network Float / Avg_Fee context retained in headline + strip */}
            <OrgSignalPanel
                stats={organizationSummary}
                organizations={organizations}
                loading={loading}
                kpiFilter={kpiFilter}
                setKpiFilter={setKpiFilter}
            />

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Search registry by name, email or ID..."
                        className="w-full h-12 bg-muted/20 rounded-button pl-12 pr-6 text-xs font-medium transition-all focus-visible:shadow-[0_0_0_3px_hsl(var(--foreground)/0.12)]"
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
                                className="rounded-button px-8 text-[10px] font-bold"
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
                <DialogContent className="z-[120] mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-5rem)] w-[calc(100vw-1rem)] overflow-hidden overflow-y-auto rounded-modal bg-card/70 p-2 shadow-sm sm:max-w-[425px] md:max-h-[90vh] md:p-6">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500/20">
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-emerald-500 origin-left" />
                    </div>

                    <DialogHeader className="pt-4">
                        <DialogTitle className="text-2xl font-black flex items-center gap-3">
                            <div className="rounded-icon bg-emerald-500/15 p-2">
                                <Building2 className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                            </div>
                            {selectedOrg?.id ? 'Entity Configuration' : 'Entity Provisioning'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-5 py-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Legal_Name</Label>
                            <Input
                                value={selectedOrg?.name || ''}
                                onChange={(e) => setSelectedOrg({ ...selectedOrg, name: e.target.value })}
                                className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                placeholder="Enter organization name"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Registry_Contact</Label>
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
                                <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Revenue_Share (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={selectedOrg?.ivisit_fee_percentage || ''}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, ivisit_fee_percentage: e.target.value })}
                                    className="h-12 rounded-button bg-muted/20 px-5 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Lifecycle_State</Label>
                                <div className="flex h-12 items-center gap-4 rounded-button bg-muted/20 px-5">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrg?.is_active || false}
                                        onChange={(e) => setSelectedOrg({ ...selectedOrg, is_active: e.target.checked })}
                                        className="h-5 w-5 rounded-icon accent-emerald-500"
                                    />
                                    <span className="text-sm font-bold opacity-60">Active Node</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground ml-4 opacity-50">Connected_Stripe_ID</Label>
                            <Input
                                value={selectedOrg?.stripe_account_id || ''}
                                onChange={(e) => setSelectedOrg({ ...selectedOrg, stripe_account_id: e.target.value })}
                                className="h-12 rounded-button bg-muted/20 px-5 font-mono text-xs"
                                placeholder="acct_..."
                            />
                            <p className="text-[10px] opacity-40 italic ml-4">Authorized for automated secure payouts.</p>
                        </div>

                        <DialogFooter className="gap-3 pt-4">
                            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="h-12 rounded-button px-8 text-[10px] font-bold">Return</Button>
                            <Button type="submit" className="h-12 rounded-button bg-foreground px-10 text-[10px] font-bold text-background shadow-sm">
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
