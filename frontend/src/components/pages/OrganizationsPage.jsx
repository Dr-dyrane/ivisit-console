import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageHeader, usePageFooter, useLayout } from '../../contexts/LayoutContext';
import { getOrganizations, saveOrganization, deleteOrganization } from '../../services/organizationsService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import {
    Building2,
    Plus,
    Search,
    LayoutGrid,
    List as ListIcon,
    Table as TableIcon,
    Activity,
    CheckCircle,
    DollarSign,
    Wallet,
    Globe,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { OrganizationTableView } from '../views/OrganizationTableView';
import { OrganizationListView } from '../views/OrganizationListView';
import { OrganizationsPanel } from '../context/OrganizationsPanel';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

export const OrganizationsPage = () => {
    const { isAdmin } = useAuth();
    const { openContextPanel, closeContextPanel } = useLayout();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { viewMode, setViewMode } = useViewMode('organizations', 'table');
    const { currentPage, goToPage, itemsPerPage, setTotalCount } = usePagination(12);

    // Modal State
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: null
    });

    const fetchOrganizations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getOrganizations();
            setOrganizations(data);
            setTotalCount(data?.length || 0);
        } catch (error) {
            handleApiError(error, 'fetch');
        } finally {
            setLoading(false);
        }
    }, [setTotalCount]);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    const handleCreate = () => {
        setSelectedOrg({
            name: '',
            stripe_account_id: '',
            ivisit_fee_percentage: 2.5,
            fee_tier: 'standard',
            contact_email: '',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (org) => {
        setSelectedOrg(org);
        setIsModalOpen(true);
    };

    const handleDelete = (org) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Delete Organization',
            description: `Are you sure you want to delete ${org.name}? This will affect all associated hospitals and users.`,
            onConfirm: async () => {
                try {
                    await deleteOrganization(org.id);
                    toast.success('Organization deleted successfully');
                    fetchOrganizations();
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    handleApiError(error, 'delete');
                }
            }
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await saveOrganization(selectedOrg);
            toast.success(`Organization ${selectedOrg.id ? 'updated' : 'created'} successfully`);
            setIsModalOpen(false);
            fetchOrganizations();
        } catch (error) {
            handleApiError(error, 'update');
        }
    };

    // Filters & Pagination
    const filteredOrgs = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return organizations.filter(org =>
            org.name.toLowerCase().includes(term) ||
            org.contact_email?.toLowerCase().includes(term) ||
            org.stripe_account_id?.toLowerCase().includes(term)
        );
    }, [organizations, searchTerm]);

    const paginatedOrgs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredOrgs.slice(start, start + itemsPerPage);
    }, [filteredOrgs, currentPage, itemsPerPage]);

    const headerActions = useMemo(() => (
        <div className="flex items-center gap-2">
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
                    onClick={() => setViewMode('table')}
                    className={`h-8 w-8 rounded-lg ${viewMode === 'table' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                >
                    <TableIcon className="h-4 w-4" />
                </Button>
            </div>
            {isAdmin() && (
                <Button onClick={handleCreate} className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase">
                    <Plus className="h-4 w-4 mr-2" />
                    Board New Org
                </Button>
            )}
        </div>
    ), [isAdmin, viewMode, setViewMode]);

    usePageHeader("Organization Registry", headerActions);

    const footerContent = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
                <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-zinc-500 animate-pulse' : 'bg-success'}`} />
                <span>{organizations.length} Organizations Enrolled</span>
            </div>
        </div>
    ), [organizations.length, loading]);

    usePageFooter(footerContent, 'status', true);

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

    const totalWallet = organizations.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0);

    return (
        <div className="min-h-screen py-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8">
                <Card className="col-span-1 geo-block glass-card p-6 flex items-center gap-4 border-l-4 border-l-primary/50 relative overflow-hidden group hover-lift transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="p-3 bg-primary/20 rounded-2xl relative z-10">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Active Nodes</p>
                        <h3 className="text-2xl font-black">{organizations.filter(o => o.is_active).length}</h3>
                    </div>
                </Card>

                <Card className="col-span-1 geo-sharp glass-card-premium p-6 flex flex-col gap-3 group hover-lift transition-all">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-success/20 rounded-xl">
                            <Activity className="h-5 w-5 text-success" />
                        </div>
                        <Badge className="bg-success text-white border-0 text-[8px] font-black tracking-tighter uppercase px-2 py-0.5">LITE</Badge>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network Health</p>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            99.8% <span className="text-[10px] text-success font-normal tracking-tight">↑ Optimal</span>
                        </h3>
                    </div>
                </Card>

                <Card className="col-span-1 geo-round glass-card p-6 flex items-center gap-4 bg-gradient-to-br from-info/5 to-transparent border-info/20 overflow-hidden hover-lift transition-all shadow-premium">
                    <div className="p-3 bg-info/20 rounded-full border border-info/30">
                        <Wallet className="h-6 w-6 text-info" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-info/60 uppercase tracking-widest">Network Float</p>
                        <h3 className="text-2xl font-black">
                            ${totalWallet.toLocaleString()}
                        </h3>
                    </div>
                </Card>

                <Card className="col-span-1 geo-block glass-card p-6 flex items-center gap-4 bg-white/5 border-dashed hover-lift transition-all">
                    <div className="p-3 bg-white/10 rounded-2xl">
                        <Globe className="h-6 w-6 text-white/50" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Regions</p>
                        <h3 className="text-2xl font-black">Global</h3>
                    </div>
                </Card>
                <Card className="col-span-1 geo-sharp glass-card-premium p-6 flex flex-col justify-center items-center gap-1 border-t-2 border-t-primary/50 group hover-lift transition-all">
                    <div className="p-2 bg-primary/10 rounded-full mb-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Avg_Fee</p>
                    <h3 className="text-xl font-black">
                        {(organizations.length > 0 ? (organizations.reduce((acc, o) => acc + (parseFloat(o.ivisit_fee_percentage) || 0), 0) / organizations.length) : 0).toFixed(1)}%
                    </h3>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Search registry by name, email or ID..."
                        className="w-full h-12 bg-muted/20 border-0 rounded-2xl pl-12 pr-6 text-xs font-medium focus:ring-2 ring-primary/20 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="ghost" size="icon" className="md:hidden h-12 w-12 rounded-2xl bg-muted/20">
                    <Filter className="h-5 w-5" />
                </Button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-64 rounded-[32px] bg-muted/20" />
                        ))}
                    </div>
                ) : filteredOrgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-[40px] border border-dashed border-muted/20 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
                        <h4 className="text-lg font-bold text-muted-foreground">Registry Empty</h4>
                        <p className="text-sm text-muted-foreground/60 mb-6">No organizations match your current criteria.</p>
                        {isAdmin() && (
                            <Button variant="outline" onClick={handleCreate} className="rounded-2xl px-8 uppercase tracking-widest text-[10px] font-bold">
                                Onboard New Partner
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'table' ? (
                    <OrganizationTableView
                        organizations={paginatedOrgs}
                        onView={handleEdit}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        selectedIds={[]}
                        onSelect={() => { }}
                        onSelectAll={() => { }}
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

            {/* Org Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[32px] glass-card shadow-2xl border border-white/10 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-success/20">
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-success origin-left" />
                    </div>

                    <DialogHeader className="pt-4">
                        <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
                            <div className="p-2 bg-success/10 rounded-xl">
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
                                className="rounded-2xl bg-muted/20 border-0 h-12 px-5 font-bold"
                                placeholder="Enter organization name"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Registry_Contact</Label>
                            <Input
                                value={selectedOrg?.contact_email || ''}
                                onChange={(e) => setSelectedOrg({ ...selectedOrg, contact_email: e.target.value })}
                                className="rounded-2xl bg-muted/20 border-0 h-12 px-5"
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
                                    className="rounded-2xl bg-muted/20 border-0 h-12 px-5 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Lifecycle_State</Label>
                                <div className="flex h-12 items-center gap-4 px-5 rounded-2xl bg-muted/20 border-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrg?.is_active || false}
                                        onChange={(e) => setSelectedOrg({ ...selectedOrg, is_active: e.target.checked })}
                                        className="w-5 h-5 accent-success rounded-[4px]"
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
                                className="rounded-2xl bg-muted/20 border-0 h-12 px-5 font-mono text-xs"
                                placeholder="acct_..."
                            />
                            <p className="text-[10px] opacity-40 italic ml-4">Authorized for automated secure payouts.</p>
                        </div>

                        <DialogFooter className="gap-3 pt-4">
                            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-12 px-8">Return</Button>
                            <Button type="submit" className="rounded-2xl bg-success text-white font-bold uppercase tracking-[0.2em] text-[10px] h-12 px-10 shadow-xl shadow-success/20">
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
        </div>
    );
};
