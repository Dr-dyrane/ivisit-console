import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import ModalShell from '../ui/ModalShell';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { Mail, Shield, Send, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getHospitals } from '../../services/hospitalsService';
import { supabase } from '../../lib/supabase';

export const InviteUserModal = ({ isOpen, onClose, onInviteSuccess }) => {
    const { isAdmin, isOrgAdmin, orgId } = useAuth();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');
    const [organizationId, setOrganizationId] = useState('');
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAdmin() && isOpen) {
            const fetchHospitals = async () => {
                try {
                    const data = await getHospitals({ limit: 100 });
                    setHospitals(data);
                } catch (error) {
                    console.error('Failed to fetch hospitals:', error);
                    handleApiError(error, 'fetch');
                }
            };
            fetchHospitals();
        }
    }, [isAdmin, isOpen]);

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Prepare payload with organization scoping
            const metadata = {};

            // If Org Admin, force their org ID
            if (isOrgAdmin() && orgId) {
                metadata.organization_id = orgId;
            }
            // If Platform Admin and selecting org-scoped role, use selected org
            else if (isAdmin() && (role === 'org_admin' || role === 'provider') && organizationId) {
                metadata.organization_id = organizationId;
            }

            // Call Edge Function
            const { data, error } = await supabase.functions.invoke('invite-user', {
                body: { email, role, metadata }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`Invitation sent to ${email}`);
            if (onInviteSuccess) onInviteSuccess();
            onClose();
        } catch (error) {
            console.error('Invite Error:', error);

            // Fallback for development if Edge Function is not deployed
            if (error.message.includes('FunctionsFetchError') || error.message.includes('Failed to fetch')) {
                toast.error('Invite service unavailable. Please check backend deployment.');
            } else {
                handleApiError(error, 'create');
            }
        } finally {
            setLoading(false);
        }
    };

    const showOrgSelect = isAdmin() && (role === 'org_admin' || role === 'provider');
    const fieldShellClass = 'relative group';
    const fieldIconClass = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors';
    const fieldControlClass = 'pl-10 h-11 bg-muted/30 rounded-button focus-visible:shadow';

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title="Invite User"
            subtitle="Send a secure access link"
            icon={<Send className="w-5 h-5 text-muted-foreground" />}
            className="shadow-sm"
        >
            <div className="p-4 md:p-6">
                <form onSubmit={handleInvite} className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Email Address</Label>
                        <div className={fieldShellClass}>
                            <Mail className={fieldIconClass} />
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="colleague@ivisit.ng"
                                className={fieldControlClass}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Access Role</Label>
                        <div className={fieldShellClass}>
                            <Shield className={fieldIconClass} />
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger className={fieldControlClass}>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="rounded-inner bg-background/95">
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                    <SelectItem value="provider">Provider</SelectItem>
                                    {isAdmin() && (
                                        <>
                                            <SelectItem value="sponsor">Sponsor</SelectItem>
                                            <SelectItem value="org_admin">Organization Admin</SelectItem>
                                            <SelectItem value="admin">Platform Admin</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-1">
                            Admins have full access to all system resources.
                        </p>
                    </div>

                    {showOrgSelect && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                        >
                            <Label className="text-xs font-semibold text-muted-foreground">Organization Assignment</Label>
                            <div className={fieldShellClass}>
                                <Building2 className={fieldIconClass} />
                                <Select value={organizationId} onValueChange={setOrganizationId} required={showOrgSelect}>
                                    <SelectTrigger className={fieldControlClass}>
                                        <SelectValue placeholder="Select organization" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-inner bg-background/95">
                                        {hospitals.map(hospital => (
                                            <SelectItem key={hospital.id} value={hospital.id}>
                                                {hospital.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </motion.div>
                    )}

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-button text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-md"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invitation'}
                        </Button>
                    </div>
                </form>
            </div>
        </ModalShell>
    );
};
