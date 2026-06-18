import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { getPricing, saveServicePricing, saveRoomPricing, deleteServicePricing, deleteRoomPricing } from '../../services/pricingService';
import { PaginationControls } from '../ui/PaginationControls';
import {
    DollarSign,
    Search,
    Plus,
    Trash2,
    LayoutGrid,
    List as ListIcon,
    Table as TableIcon,
    TrendingUp,
    Globe,
    Building2,
    BadgeDollarSign,
    Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { motion, LayoutGroup } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PricingTableView } from '../views/PricingTableView';
import { PricingListView } from '../views/PricingListView';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { Skeleton } from '../ui/skeleton';
import { MobilePricing } from '../mobile/MobilePricing';

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
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const fetchPricing = useCallback(async () => {
        setLoading(true);
        try {
            const orgId = isOrgAdmin() ? profile.organization_id : null;
            let data;
            if (activeTab === 'all') {
                const [services, rooms] = await Promise.all([
                    getPricing('services', orgId),
                    getPricing('rooms', orgId),
                ]);
                data = [
                    ...(services || []).map(s => ({ ...s, _pricingType: 'service' })),
                    ...(rooms || []).map(r => ({ ...r, _pricingType: 'room' })),
                ];
            } else {
                const raw = await getPricing(activeTab, orgId);
                const pType = activeTab === 'services' ? 'service' : 'room';
                data = (raw || []).map(item => ({ ...item, _pricingType: pType }));
            }
            setPricing(data);
            pagination.setTotalCount(data.length);
        } catch (error) {
            console.error('Error fetching pricing:', error);
            toast.error('Failed to load pricing data');
        } finally {
            setLoading(false);
        }
    }, [activeTab, isOrgAdmin, profile.organization_id, pagination.setTotalCount]);

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

            // Determine save type: use item's type when editing in 'all' view, else use active tab
            const saveType = editingItem?._pricingType || (activeTab === 'rooms' ? 'room' : 'service');
            let result;
            if (saveType === 'service') {
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
        const itemType = item._pricingType || (activeTab === 'rooms' ? 'room' : 'service');
        setConfirmationModal({
            isOpen: true,
            title: 'Delete Pricing',
            description: `Are you sure you want to remove the ${itemType} pricing for "${item.service_name || item.room_name}"?`,
            onConfirm: async () => {
                try {
                    if (itemType === 'service') {
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
                unit: item.unit || (item._pricingType === 'room' ? 'Night' : 'Unit')
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                price: '',
                type: (activeTab === 'all' || activeTab === 'services') ? 'ambulance' : 'standard',
                description: '',
                unit: (activeTab === 'all' || activeTab === 'services') ? 'Service' : 'Night'
            });
        }
        setIsModalOpen(true);
    };

    const filteredPricing = useMemo(() => {
        let result = pricing;

        // Apply KPI Filter
        if (kpiFilter === 'global') {
            result = result.filter(item => !item.organization_id && !item.hospital_id);
        } else if (kpiFilter === 'override') {
            result = result.filter(item => item.organization_id || item.hospital_id);
        }

        const term = searchTerm.toLowerCase();
        if (term) {
            result = result.filter(item =>
                (item.service_name || item.room_name || '').toLowerCase().includes(term) ||
                (item.service_type || item.room_type || '').toLowerCase().includes(term)
            );
        }
        return result;
    }, [pricing, searchTerm, kpiFilter]);

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

    const paginatedPricing = useMemo(() => {
        pagination.setTotalCount(filteredPricing.length);
        const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
        return filteredPricing.slice(start, start + pagination.itemsPerPage);
    }, [filteredPricing, pagination]);

    // Header & Footer
    const headerActions = useMemo(() => (
        <Button onClick={() => openModal()} className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase">
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing
        </Button>
    ), []);

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
                <span>Page {pagination.currentPage} of {pagination.totalPages} • {filteredPricing.length} Rules</span>
            </div>
        </div>
    ), [pagination.currentPage, pagination.totalPages, filteredPricing.length]);

    usePageFooter(footerContent, 'pagination', !loading && pricing.length > 0);

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

    if (isMobile) {
        return (
            <div className="min-h-screen">
                <MobilePricing
                    pricing={paginatedPricing}
                    allPricing={pricing}
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

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[425px] rounded-[24px] md:rounded-[32px] glass-card shadow-2xl border border-white/5 overflow-hidden max-h-[calc(100dvh-5rem)] md:max-h-[90vh] overflow-y-auto mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))] p-2 md:p-6">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20">
                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-primary origin-left shadow-glow-primary" />
                        </div>

                        <DialogHeader className="pt-5 md:pt-6">
                            <DialogTitle className="text-xl md:text-2xl font-black tracking-tight md:tracking-tighter flex items-center gap-2.5 md:gap-3">
                                <div className="p-2 md:p-2.5 bg-primary/20 rounded-2xl shadow-glow-primary/20">
                                    <Plus className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="leading-tight">{editingItem ? 'Entity Config' : 'Item Provisioning'}</span>
                                    <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Economic_Module</span>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 md:space-y-6 py-5 md:py-8">
                            <div className="space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary ml-1 md:ml-4 opacity-70">Identity_Core</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={activeTab === 'services' ? 'e.g. Advanced Life Support' : 'e.g. ICU Suite'}
                                    className="ios-input-well rounded-2xl h-11 md:h-12 focus:ring-2 ring-primary/20 font-semibold md:font-bold px-4 md:px-6 border-0 text-[12px] md:text-[13px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 md:ml-4 opacity-50">Reference_Type</Label>
                                    <Input
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        placeholder={activeTab === 'services' ? 'ambulance' : 'ward'}
                                        className="ios-input-well rounded-2xl h-11 md:h-12 px-4 md:px-6 text-[11px] md:text-xs font-mono border-0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 md:ml-4 opacity-50">Unit_Base</Label>
                                    <Input
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="Unit"
                                        className="ios-input-well rounded-2xl h-11 md:h-12 px-4 md:px-6 text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary ml-1 md:ml-4 opacity-70">Economic_Value (USD)</Label>
                                <div className="relative group">
                                    <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-primary font-black group-focus-within:scale-125 transition-transform text-base md:text-lg">$</span>
                                    <Input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                        className="ios-input-well rounded-2xl h-12 md:h-14 pl-9 md:pl-12 pr-4 md:pr-6 font-black text-xl md:text-2xl tracking-tight md:tracking-tighter border-0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 md:ml-4 opacity-50">Technical_Documentation</Label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the service capabilities or room features..."
                                    className="ios-input-well w-full rounded-2xl p-4 md:p-6 min-h-[110px] md:min-h-[120px] text-[12px] md:text-sm focus:ring-2 ring-primary/20 outline-none transition-all border-0 resize-none"
                                />
                            </div>
                        </div>

                        {!isAdmin() && isOrgAdmin() && !editingItem && (
                            <div className="p-3 md:p-4 bg-success/10 rounded-2xl border border-success/20">
                                <p className="text-[9px] md:text-[10px] font-bold text-success uppercase tracking-widest leading-relaxed">
                                    <Building2 className="w-3 h-3 inline mr-1 mb-0.5" />
                                    This will create a local override for your organization.
                                </p>
                            </div>
                        )}

                        <DialogFooter className="gap-2 md:gap-3 pt-2 flex-col sm:flex-row">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto rounded-2xl font-bold uppercase tracking-widest text-[9px] md:text-[10px] h-11 md:h-12 px-6 md:px-8">Return</Button>
                            <Button onClick={handleSave} className="w-full sm:w-auto rounded-2xl bg-primary text-white font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px] h-11 md:h-12 px-8 md:px-10 shadow-xl shadow-primary/20">
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

                <AnalyticsModal
                    open={analyticsModalOpen}
                    onClose={() => setAnalyticsModalOpen(false)}
                    type="generic"
                    analytics={{
                        total: pricing.length,
                        active: pricing.length,
                        recent: pricing.filter(item => {
                            if (!item.updated_at) return false;
                            const d = new Date(item.updated_at);
                            const cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - 30);
                            return d >= cutoff;
                        }).length,
                        byCategory: {
                            global: pricing.filter(item => !item.organization_id && !item.hospital_id).length,
                            override: pricing.filter(item => item.organization_id || item.hospital_id).length
                        }
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
                                <h3 className="text-3xl font-black">{pricing.length}</h3>
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
                                    ${(pricing.reduce((acc, curr) => acc + (curr.base_price || curr.price_per_night || 0), 0) / (pricing.length || 1)).toFixed(2)}
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
                                    {pricing.filter(p => !p.organization_id).length} <span className="text-[10px] text-muted-foreground font-medium uppercase font-sans">Rules</span>
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
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Revenue Unit</p>
                                <h3 className="text-3xl font-black">Admin</h3>
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
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={(checked) => handleSelectAll(checked, paginatedPricing)}
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

            {/* Pricing Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[425px] rounded-[24px] md:rounded-[32px] glass-card shadow-2xl border border-white/5 overflow-hidden max-h-[calc(100dvh-5rem)] md:max-h-[90vh] overflow-y-auto mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))] p-2 md:p-6">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20">
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-full bg-primary origin-left shadow-glow-primary" />
                    </div>

                    <DialogHeader className="pt-5 md:pt-6">
                        <DialogTitle className="text-xl md:text-2xl font-black tracking-tight md:tracking-tighter flex items-center gap-2.5 md:gap-3">
                            <div className="p-2 md:p-2.5 bg-primary/20 rounded-2xl shadow-glow-primary/20">
                                <Plus className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="leading-tight">{editingItem ? 'Entity Config' : 'Item Provisioning'}</span>
                                <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Economic_Module</span>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 md:space-y-6 py-5 md:py-8">
                        <div className="space-y-2">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary ml-1 md:ml-4 opacity-70">Identity_Core</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={activeTab === 'services' ? "e.g. Advanced Life Support" : "e.g. ICU Suite"}
                                className="ios-input-well rounded-2xl h-11 md:h-12 focus:ring-2 ring-primary/20 font-semibold md:font-bold px-4 md:px-6 border-0 text-[12px] md:text-[13px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 md:ml-4 opacity-50">Reference_Type</Label>
                                <Input
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    placeholder={activeTab === 'services' ? "ambulance" : "ward"}
                                    className="ios-input-well rounded-2xl h-11 md:h-12 px-4 md:px-6 text-[11px] md:text-xs font-mono border-0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 md:ml-4 opacity-50">Unit_Base</Label>
                                <Input
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="Unit"
                                    className="ios-input-well rounded-2xl h-11 md:h-12 px-4 md:px-6 text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary ml-1 md:ml-4 opacity-70">Economic_Value (USD)</Label>
                            <div className="relative group">
                                <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-primary font-black group-focus-within:scale-125 transition-transform text-base md:text-lg">$</span>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0.00"
                                    className="ios-input-well rounded-2xl h-12 md:h-14 pl-9 md:pl-12 pr-4 md:pr-6 font-black text-xl md:text-2xl tracking-tight md:tracking-tighter border-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 md:ml-4 opacity-50">Technical_Documentation</Label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the service capabilities or room features..."
                                className="ios-input-well w-full rounded-2xl p-4 md:p-6 min-h-[110px] md:min-h-[120px] text-[12px] md:text-sm focus:ring-2 ring-primary/20 outline-none transition-all border-0 resize-none"
                            />
                        </div>
                    </div>

                    {!isAdmin() && isOrgAdmin() && !editingItem && (
                        <div className="p-3 md:p-4 bg-success/10 rounded-2xl border border-success/20">
                            <p className="text-[9px] md:text-[10px] font-bold text-success uppercase tracking-widest leading-relaxed">
                                <Building2 className="w-3 h-3 inline mr-1 mb-0.5" />
                                This will create a local override for your organization.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 md:gap-3 pt-2 flex-col sm:flex-row">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto rounded-2xl font-bold uppercase tracking-widest text-[9px] md:text-[10px] h-11 md:h-12 px-6 md:px-8">Return</Button>
                        <Button onClick={handleSave} className="w-full sm:w-auto rounded-2xl bg-primary text-white font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px] h-11 md:h-12 px-8 md:px-10 shadow-xl shadow-primary/20">
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

            <AnalyticsModal
                open={analyticsModalOpen}
                onClose={() => setAnalyticsModalOpen(false)}
                type="generic"
                analytics={{
                    total: pricing.length,
                    active: pricing.length,
                    recent: pricing.filter(item => {
                        if (!item.updated_at) return false;
                        const d = new Date(item.updated_at);
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - 30);
                        return d >= cutoff;
                    }).length,
                    byCategory: {
                        global: pricing.filter(item => !item.organization_id && !item.hospital_id).length,
                        override: pricing.filter(item => item.organization_id || item.hospital_id).length
                    }
                }}
            />

            <BulkActionBar
                selectedCount={selectedIds.length}
                onClear={() => setSelectedIds([])}
            >
                {(isAdmin() || isOrgAdmin()) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setConfirmationModal({
                                isOpen: true,
                                title: 'Delete Selected Pricing Rules',
                                description: `Are you sure you want to delete ${selectedIds.length} pricing rules? This action cannot be undone.`,
                                onConfirm: async () => {
                                    try {
                                        const selectedItems = filteredPricing.filter(item => selectedIds.includes(item.id));
                                        await Promise.all(selectedItems.map(item => (
                                            activeTab === 'services'
                                                ? deleteServicePricing(item.id)
                                                : deleteRoomPricing(item.id)
                                        )));
                                        toast.success(`${selectedIds.length} pricing rules deleted`);
                                        setSelectedIds([]);
                                        fetchPricing();
                                        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                                    } catch (error) {
                                        toast.error(error.message || 'Failed to delete selected pricing rules');
                                    }
                                },
                                variant: 'destructive',
                                confirmLabel: 'Delete All'
                            });
                        }}
                        className="h-10 w-10 rounded-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all"
                        title="Delete Selected"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                )}
            </BulkActionBar>
        </div >
    );
};
