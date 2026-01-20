"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { X, Mail, Shield, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const InviteUserModal = ({ isOpen, onClose, onInviteSuccess }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');
    const [loading, setLoading] = useState(false);

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Call Edge Function
            const { data, error } = await supabase.functions.invoke('invite-user', {
                body: { email, role }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`Invitation sent to ${email}`);
            if (onInviteSuccess) onInviteSuccess();
            onClose();
        } catch (error) {
            console.error('Invite Error:', error);
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => onClose()}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="relative z-10 w-full max-w-md bg-background rounded-3xl shadow-xl border border-border/10 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-border/10 flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <Send className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight">Invite User</h2>
                                    <p className="text-xs text-muted-foreground">Send a secure access link</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onClose()}
                                className="hover:bg-muted text-muted-foreground rounded-full w-8 h-8"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5">
                            <form onSubmit={handleInvite} className="space-y-5">

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Email Address</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="colleague@ivisit.ng"
                                            className="pl-10 h-11 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Access Role</Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                        <Select value={role} onValueChange={setRole}>
                                            <SelectTrigger className="pl-10 h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/50 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className='rounded-xl border-border/50 shadow-lg'>
                                                <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                                                <SelectItem value="provider">Provider (Healthcare)</SelectItem>
                                                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground ml-1">
                                        *Admins have full access to all system resources.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 rounded-xl text-sm font-semibold uppercase tracking-wider bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invitation'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
