import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    DollarSign,
    Search,
    Plus,
    Edit,
    Trash2,
    Ambulance,
    Bed,
    CreditCard,
    Info,
    Stethoscope,
    X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const PricingManagementPage = () => {
    const { profile, isAdmin, isOrgAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [pricing, setPricing] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('services'); // 'services' | 'rooms'

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        type: '',
        description: ''
    });

    const fetchPricing = useCallback(async () => {
        setLoading(true);
        try {
            const table = activeTab === 'services' ? 'service_pricing' : 'room_pricing';

            let query = supabase.from(table).select('*');

            if (isOrgAdmin() && profile.organization_id) {
                query = query.or(`organization_id.eq.${profile.organization_id},and(hospital_id.is.null,organization_id.is.null)`);
            }

            const { data, error } = await query.order('hospital_id', { ascending: false });

            if (error) throw error;
            setPricing(data || []);
        } catch (error) {
            console.error('Error fetching pricing:', error);
            toast.error('Failed to load pricing data');
        } finally {
            setLoading(false);
        }
    }, [activeTab, isOrgAdmin, profile.organization_id]);

    useEffect(() => {
        fetchPricing();
    }, [fetchPricing]);

    const handleSave = async () => {
        try {
            const table = activeTab === 'services' ? 'service_pricing' : 'room_pricing';
            const nameKey = activeTab === 'services' ? 'service_name' : 'room_name';
            const typeKey = activeTab === 'services' ? 'service_type' : 'room_type';
            const priceKey = activeTab === 'services' ? 'base_price' : 'price_per_night';

            const payload = {
                [nameKey]: formData.name,
                [typeKey]: formData.type,
                [priceKey]: parseFloat(formData.price),
                description: formData.description,
                hospital_id: isOrgAdmin() ? profile.organization_id : (isAdmin() ? null : null),
                updated_at: new Date().toISOString()
            };

            let error;
            if (editingItem && (editingItem.hospital_id || isAdmin())) {
                // Update existing override or global price
                const { error: updateError } = await supabase.from(table).update(payload).eq('id', editingItem.id);
                error = updateError;
            } else {
                // Create new override
                const { error: insertError } = await supabase.from(table).insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast.success('Pricing saved successfully');
            setIsModalOpen(false);
            fetchPricing();
        } catch (error) {
            toast.error('Failed to save pricing');
            console.error(error);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.service_name || item.room_name || '',
                price: (item.base_price || item.price_per_night || '').toString(),
                type: item.service_type || item.room_type || '',
                description: item.description || ''
            });
        } else {
            setEditingItem(null);
            setFormData({ name: '', price: '', type: '', description: '' });
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


    const footerContent = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-bold">
                <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-zinc-500 animate-pulse' : 'bg-success'}`} />
                <span>{pricing.length} Active Price Points • {activeTab} View Enabled</span>
            </div>
        </div>
    ), [pricing.length, loading, activeTab]);

    usePageFooter(footerContent, 'status', true);

    const headerActions = useMemo(() => (
        <Button onClick={() => openModal()} className="glass-card-premium h-9 px-3 md:px-4 text-[10px] font-bold tracking-widest uppercase">
            <Plus className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Add Override</span>
        </Button>
    ), []);

    usePageHeader('Pricing Engine', headerActions);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'ambulance': return <Ambulance className="h-4 w-4" />;
            case 'bed': return <Bed className="h-4 w-4" />;
            case 'consultation': return <Stethoscope className="h-4 w-4" />;
            case 'procedure': return <CreditCard className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    return (
        <div className="min-h-screen py-6 md:py-8">
            <div className="pt-2" />

            <div className="flex justify-center md:justify-start mb-6 md:mb-8 px-0 md:px-2">
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
            </div>

            <div className="relative w-full md:max-w-md mb-6 md:mb-8 px-0 md:px-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    placeholder="Search pricing..."
                    className="w-full h-12 bg-muted/20 border-0 rounded-2xl pl-12 pr-6 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-0 md:px-2">
                <AnimatePresence>
                    {filteredPricing.map((item) => (
                        <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Card className="p-6 h-full glass-card-premium border-none shadow-2xl relative group overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.01] hover:shadow-glow">
                                <div className="hover-glow hover-glow-primary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                                <div className="flex justify-between items-start mb-6 relative z-10 transition-colors duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-all duration-300">
                                            {getTypeIcon(item.service_type || item.room_type)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg tracking-tight truncate max-w-[150px] transition-colors duration-300">
                                                {item.service_name || item.room_name}
                                            </h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors duration-300">
                                                {item.service_type || item.room_type}
                                            </p>
                                        </div>
                                    </div>
                                    {item.hospital_id ? (
                                        <Badge className="bg-success text-white border-none text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                                            OVERRIDE
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                                            GLOBAL
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground mb-8 line-clamp-2 relative z-10 flex-1 transition-colors duration-300">
                                    {item.description || 'Standard platform pricing.'}
                                </p>

                                <div className="flex items-end justify-between relative z-10">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 transition-colors duration-300">Fee</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black tracking-tighter transition-colors duration-300">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.base_price || item.price_per_night)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openModal(item)}
                                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Pricing Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[32px] glass-card shadow-2xl border-none">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter">
                            {editingItem ? 'Edit Pricing' : 'New Pricing Override'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Service Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Premium Ambulance"
                                className="rounded-2xl bg-muted/20 border-0 h-12 focus:ring-2 ring-primary/20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type</Label>
                                <Input
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    placeholder="ambulance"
                                    className="rounded-2xl bg-muted/20 border-0 h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price (USD)</Label>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0.00"
                                    className="rounded-2xl bg-muted/20 border-0 h-12"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional details..."
                                className="rounded-2xl bg-muted/20 border-0 h-12"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
                        <Button onClick={handleSave} className="rounded-2xl glass-card-premium font-bold uppercase tracking-widest text-[10px]">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
