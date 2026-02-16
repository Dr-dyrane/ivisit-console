import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { getOrganizations, saveOrganization, deleteOrganization } from '../../services/organizationsService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { TableSkeleton } from '../ui/skeleton';
import { Building2, Plus, Edit, Trash2, Globe, Mail, DollarSign, Activity, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useLayout } from '../../contexts/LayoutContext';

export const OrganizationsPage = () => {
    const { isAdmin } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
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
        } catch (error) {
            handleApiError(error, 'fetch');
        } finally {
            setLoading(false);
        }
    }, []);

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

    const headerActions = useMemo(() => (
        isAdmin() && (
            <Button onClick={handleCreate} className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase">
                <Plus className="h-4 w-4 mr-2" />
                ADD ORGANIZATION
            </Button>
        )
    ), [isAdmin]);

    usePageHeader("Organizations", headerActions);

    // Event listener for FAB action
    useEffect(() => {
        const handleOpenModal = () => handleCreate();
        window.addEventListener('openOrganizationModal', handleOpenModal);
        return () => window.removeEventListener('openOrganizationModal', handleOpenModal);
    }, [handleCreate]);

    // Right Panel Context
    const { openContextPanel, closeContextPanel } = useLayout();
    useEffect(() => {
        // Optional: Trigger panel on mount or specific action
        // openContextPanel('organizations'); 
        return () => closeContextPanel();
    }, [openContextPanel, closeContextPanel]);

    return (
        <div className="min-h-screen py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="geo-block glass-card p-6 flex items-center gap-4 border-l-4 border-l-primary/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="p-3 bg-primary/20 rounded-2xl relative z-10">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Active Partners</p>
                        <h3 className="text-2xl font-black">{organizations.filter(o => o.is_active).length}</h3>
                    </div>
                </Card>

                <Card className="geo-sharp glass-card-premium p-6 flex flex-col gap-3 group hover:border-success/30 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-success/20 rounded-xl">
                            <Activity className="h-5 w-5 text-success" />
                        </div>
                        <Badge className="bg-success text-white border-0 text-[8px] font-black tracking-tighter">LIVE</Badge>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network Health</p>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            98.2% <span className="text-[10px] text-success font-normal">↑ 2%</span>
                        </h3>
                    </div>
                </Card>

                <Card className="geo-round glass-card p-6 flex items-center gap-4 bg-gradient-to-br from-info/5 to-transparent border-info/20 overflow-hidden">
                    <div className="p-3 bg-info/20 rounded-full border border-info/30">
                        <DollarSign className="h-6 w-6 text-info" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-info/60 uppercase tracking-widest">Revenue Fee</p>
                        <h3 className="text-2xl font-black">2.5% <span className="text-[10px] text-muted-foreground font-medium uppercase font-sans">Avg</span></h3>
                    </div>
                </Card>

                <Card className="geo-block glass-card p-6 flex items-center gap-4 bg-white/5 border-dashed">
                    <div className="p-3 bg-white/10 rounded-2xl">
                        <CheckCircle className="h-6 w-6 text-white/50" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verified Orgs</p>
                        <h3 className="text-2xl font-black">{organizations.length}</h3>
                    </div>
                </Card>
            </div>

            {loading ? (
                <TableSkeleton rows={5} />
            ) : (
                <Card className="geo-sharp glass-card-premium overflow-hidden border-0">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="hover:bg-transparent border-0">
                                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Organization Name</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Contact</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Stripe ID</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Fee %</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                                <TableHead className="text-right font-bold uppercase tracking-wider text-[10px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.map((org) => (
                                <TableRow key={org.id} className="hover:bg-white/5 border-white/5 transition-colors group">
                                    <TableCell className="font-bold text-foreground/90 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {org.name[0]}
                                            </div>
                                            {org.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                                            <Mail className="h-3 w-3" />
                                            {org.contact_email || 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                                        {org.stripe_account_id || 'NOT CONNECTED'}
                                    </TableCell>
                                    <TableCell className="font-bold text-primary">
                                        {org.ivisit_fee_percentage}%
                                    </TableCell>
                                    <TableCell>
                                        {org.is_active ? (
                                            <Badge className="bg-success/20 text-success border-0 font-bold text-[10px]">ACTIVE</Badge>
                                        ) : (
                                            <Badge className="bg-destructive/20 text-destructive border-0 font-bold text-[10px]">INACTIVE</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(org)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(org)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Org Modal */}
            {isModalOpen && selectedOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10 w-full max-w-md bg-background/95 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl border border-white/10"
                    >
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Building2 className="text-primary" />
                            {selectedOrg.id ? 'Edit Organization' : 'New Organization'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Organization Name</Label>
                                <Input
                                    value={selectedOrg.name}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, name: e.target.value })}
                                    className="rounded-2xl bg-white/5 border-0 h-12"
                                    placeholder="Enter organization name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Contact Email</Label>
                                <Input
                                    value={selectedOrg.contact_email}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, contact_email: e.target.value })}
                                    className="rounded-2xl bg-white/5 border-0 h-12"
                                    placeholder="admin@org.com"
                                    type="email"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Fee Percentage (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={selectedOrg.ivisit_fee_percentage}
                                        onChange={(e) => setSelectedOrg({ ...selectedOrg, ivisit_fee_percentage: e.target.value })}
                                        className="rounded-2xl bg-white/5 border-0 h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Status</Label>
                                    <div className="flex h-12 items-center gap-4 px-4 rounded-2xl bg-white/5 border-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrg.is_active}
                                            onChange={(e) => setSelectedOrg({ ...selectedOrg, is_active: e.target.checked })}
                                            className="w-5 h-5 accent-primary"
                                        />
                                        <span className="text-sm font-medium">Active</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Stripe Account ID (Pricing)</Label>
                                <Input
                                    value={selectedOrg.stripe_account_id}
                                    onChange={(e) => setSelectedOrg({ ...selectedOrg, stripe_account_id: e.target.value })}
                                    className="rounded-2xl bg-white/5 border-0 h-12 font-mono text-xs"
                                    placeholder="acct_..."
                                />
                                <p className="text-[10px] opacity-40 italic">Link this to enable automated payouts and fee splits.</p>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl">Cancel</Button>
                                <Button type="submit" className="flex-1 rounded-2xl font-bold">SAVE CHANGES</Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

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
