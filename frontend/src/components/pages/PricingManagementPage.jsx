import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter, useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { getPricing, saveServicePricing, saveRoomPricing, deleteServicePricing, deleteRoomPricing } from '../../services/pricingService';
import {
    DollarSign,
    Search,
    Plus,
    Filter,
    LayoutGrid,
    List as ListIcon,
    Table as TableIcon,
    ArrowUpDown,
    Download,
    TrendingUp,
    Globe,
    Building2,
    Calendar,
    BadgeDollarSign,
    Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PricingTableView } from '../views/PricingTableView';
import { PricingListView } from '../views/PricingListView';
import { PricingContextPanel } from '../context/PricingContextPanel';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { Skeleton } from '../ui/skeleton';

export const PricingManagementPage = () => {
    const { profile, isAdmin, isOrgAdmin } = useAuth();
    const { openContextPanel, closeContextPanel } = useLayout();
    const [loading, setLoading] = useState(true);
    const [pricing, setPricing] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('services'); // 'services' | 'rooms'
    const { viewMode, setViewMode } = useViewMode('pricing', 'grid');
    const { currentPage, goToPage, itemsPerPage, setTotalCount } = usePagination(12);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        type: '',
        description: '',
        unit: 'Unit'
    });

    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: null
    });

    const fetchPricing = useCallback(async () => {
        setLoading(true);
        try {
            const orgId = isOrgAdmin() ? profile.organization_id : null;
            const data = await getPricing(activeTab, orgId);
            setPricing(data || []);
            setTotalCount(data?.length || 0);
        } catch (error) {
            console.error('Error fetching pricing:', error);
            toast.error('Failed to load pricing data');
        } finally {
            setLoading(false);
        }
    }, [activeTab, isOrgAdmin, profile.organization_id, setTotalCount]);

    useEffect(() => {
        fetchPricing();
    }, [fetchPricing]);

    // Role-based editing rules
    const canEdit = useCallback((item) => {
        if (isAdmin()) {
            // Admin can only edit Global items
            return !item.organization_id && !item.hospital_id;
        }
        if (isOrgAdmin()) {
            // Org Admin can edit their own overrides OR create a new one based on a global one (handled by upsert)
            // But if it belongs to another org, they can't.
            if (!item.organization_id && !item.hospital_id) return true; // Can override global
            return item.organization_id === profile.organization_id;
        }
        return false;
    }, [isAdmin, isOrgAdmin, profile.organization_id]);

    const handleSave = async () => {
        try {
            const orgId = isOrgAdmin() ? profile.organization_id : null;

            let result;
            if (activeTab === 'services') {
                result = await saveServicePricing({
                    id: editingItem?.id,
                    service_name: formData.name,
                    base_price: parseFloat(formData.price),
                    unit: formData.unit,
                    category: formData.type,
                    organization_id: orgId,
                    metadata: { description: formData.description }
                });
            } else {
                result = await saveRoomPricing({
                    id: editingItem?.id,
                    room_name: formData.name,
                    room_type: formData.type,
                    price_per_night: parseFloat(formData.price),
                    description: formData.description,
                    organization_id: orgId
                });
            }

            toast.success('Pricing saved successfully');
            setIsModalOpen(false);
            fetchPricing();
        } catch (error) {
            toast.error(error.message || 'Failed to save pricing');
            console.error(error);
        }
    };

    const handleDelete = (item) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Delete Pricing',
            description: `Are you sure you want to remove the ${activeTab === 'services' ? 'service' : 'room'} pricing for "${item.service_name || item.room_name}"?`,
            onConfirm: async () => {
                try {
                    if (activeTab === 'services') {
                        await deleteServicePricing(item.id);
                    } else {
                        await deleteRoomPricing(item.id);
                    }
                    toast.success('Pricing deleted successfully');
                    fetchPricing();
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    toast.error(error.message || 'Failed to delete pricing');
                }
            }
        });
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.service_name || item.room_name || '',
                price: (item.base_price || item.price_per_night || '').toString(),
                type: item.service_type || item.room_type || '',
                description: item.description || item.metadata?.description || '',
                unit: item.unit || (activeTab === 'rooms' ? 'Night' : 'Unit')
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                price: '',
                type: activeTab === 'services' ? 'ambulance' : 'standard',
                description: '',
                unit: activeTab === 'services' ? 'Service' : 'Night'
            });
        }
        setIsModalOpen(true);
    };

    const filteredPricing = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return pricing.filter(item =>
            (item.service_name || item.room_name || '').toLowerCase().includes(term) ||
            (item.service_type || item.room_type || '').toLowerCase().includes(term)
        );
    }, [pricing, searchTerm]);

    const paginatedPricing = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPricing.slice(start, start + itemsPerPage);
    }, [filteredPricing, currentPage, itemsPerPage]);

    // Header & Footer
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
            <Button onClick={() => openModal()} className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase">
                <Plus className="w-4 h-4 mr-2" />
                Add Pricing
            </Button>
        </div>
    ), [viewMode, setViewMode]);

    usePageHeader('Pricing Engine', headerActions);

    const footerContent = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
                <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-zinc-500 animate-pulse' : 'bg-success shadow-glow-success'}`} />
                <span>{pricing.length} Active Rules • {viewMode.toUpperCase()} View</span>
            </div>
        </div>
    ), [pricing.length, loading, viewMode]);

    usePageFooter(footerContent, 'status', true);

    /**
     * NOTE (2026-02-16): Removed initial context panel auto-open and 
     * harmonized KPI card layout with Organizations page for containment.
     */

    // Event listener for panel shortcuts
    useEffect(() => {
        const handleOpenAdd = () => openModal();
        window.addEventListener('openPricingModal', handleOpenAdd);
        return () => window.removeEventListener('openPricingModal', handleOpenAdd);
    }, []);

    const avgPrice = pricing.length > 0
        ? pricing.reduce((acc, curr) => acc + (curr.base_price || curr.price_per_night || 0), 0) / pricing.length
        : 0;

    return (
        <div className="min-h-screen py-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min grid-flow-dense mb-8">
                <Card className="col-span-1 geo-block glass-card p-6 flex items-center gap-4 border-l-4 border-l-primary/50 relative overflow-hidden group hover-lift transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="p-3 bg-primary/20 rounded-2xl relative z-10">
                        <BadgeDollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Active Points</p>
                        <h3 className="text-2xl font-black">{pricing.length}</h3>
                    </div>
                </Card>

                <Card className="col-span-1 geo-sharp glass-card-premium p-6 flex flex-col gap-3 group hover-lift transition-all">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-success/20 rounded-xl">
                            <TrendingUp className="h-5 w-5 text-success" />
                        </div>
                        <Badge className="bg-success text-white border-0 text-[8px] font-black tracking-tighter uppercase px-2 py-0.5">Healthy</Badge>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Base Cost</p>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            ${avgPrice.toFixed(2)}
                        </h3>
                    </div>
                </Card>

                <Card className="col-span-1 geo-round glass-card p-6 flex items-center gap-4 bg-gradient-to-br from-info/5 to-transparent border-info/20 overflow-hidden hover-lift transition-all shadow-premium">
                    <div className="p-3 bg-info/20 rounded-full border border-info/30">
                        <Globe className="h-6 w-6 text-info" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-info/60 uppercase tracking-widest">Global coverage</p>
                        <h3 className="text-2xl font-black">
                            {pricing.filter(p => !p.organization_id).length} <span className="text-[10px] text-muted-foreground font-medium uppercase font-sans">Rules</span>
                        </h3>
                    </div>
                </Card>
                <Card className="col-span-1 geo-block glass-card p-6 flex items-center gap-4 bg-white/5 border-dashed hover-lift transition-all">
                    <div className="p-3 bg-white/10 rounded-2xl">
                        <DollarSign className="h-6 w-6 text-white/50" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Revenue</p>
                        <h3 className="text-2xl font-black">Admin</h3>
                    </div>
                </Card>

                <Card className="col-span-1 geo-sharp glass-card-premium p-6 flex flex-col justify-center items-center gap-1 border-t-2 border-t-primary/50 group hover-lift transition-all">
                    <div className="p-2 bg-primary/10 rounded-full mb-1">
                        <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Efficiency</p>
                    <h3 className="text-xl font-black">94%</h3>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex bg-muted/20 p-1 rounded-2xl w-full md:w-fit gap-1">
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${activeTab === 'services' ? 'bg-background shadow-lg text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${activeTab === 'rooms' ? 'bg-background shadow-lg text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Rooms
                    </button>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Filter price points..."
                        className="w-full h-11 bg-muted/20 border-0 rounded-2xl pl-12 pr-6 text-xs font-medium focus:ring-2 ring-primary/20 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

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
                        <Button variant="outline" onClick={() => openModal()} className="rounded-2xl px-8 uppercase tracking-widest text-[10px] font-bold">
                            Initialize First Override
                        </Button>
                    </div>
                ) : viewMode === 'table' ? (
                    <PricingTableView
                        pricing={paginatedPricing}
                        onView={openModal}
                        onEdit={openModal}
                        onDelete={handleDelete}
                        selectedIds={[]}
                        onSelect={() => { }}
                        onSelectAll={() => { }}
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

            {/* Pagination Placeholder */}
            {filteredPricing.length > itemsPerPage && (
                <div className="mt-8 flex justify-center gap-2">
                    {/* Add pagination UI here if needed */}
                </div>
            )}

            {/* Pricing Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[32px] glass-card shadow-2xl border border-white/10 dark:ios-material overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20">
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-primary origin-left" />
                    </div>

                    <DialogHeader className="pt-4">
                        <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Plus className="h-5 w-5 text-primary" />
                            </div>
                            {editingItem ? 'Edit Configuration' : 'System Provisioning'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Identity_Core</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={activeTab === 'services' ? "e.g. Advanced Life Support" : "e.g. ICU Suite"}
                                className="rounded-2xl bg-muted/20 border-0 h-12 focus:ring-2 ring-primary/20 font-bold px-5"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Reference_Type</Label>
                                <Input
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    placeholder={activeTab === 'services' ? "ambulance" : "ward"}
                                    className="rounded-2xl bg-muted/20 border-0 h-12 px-5 text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Unit_Base</Label>
                                <Input
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="Unit"
                                    className="rounded-2xl bg-muted/20 border-0 h-12 px-5 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Economic_Value (USD)</Label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-black">$</span>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0.00"
                                    className="rounded-2xl bg-muted/20 border-0 h-12 pl-10 pr-5 font-black text-xl tracking-tighter"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 opacity-50">Technical_Documentation</Label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the service capabilities or room features..."
                                className="w-full rounded-2xl bg-muted/20 border-0 p-5 min-h-[100px] text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                            />
                        </div>

                        {!isAdmin() && isOrgAdmin() && !editingItem && (
                            <div className="p-4 bg-success/10 rounded-2xl border border-success/20">
                                <p className="text-[10px] font-bold text-success uppercase tracking-widest leading-relaxed">
                                    <Building2 className="w-3 h-3 inline mr-1 mb-0.5" />
                                    This will create a local override for your organization.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-12 px-8">Return</Button>
                        <Button onClick={handleSave} className="rounded-2xl bg-primary text-white font-bold uppercase tracking-[0.2em] text-[10px] h-12 px-10 shadow-xl shadow-primary/20">
                            Apply Changes
                        </Button>
                    </DialogFooter>
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
