
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Lock, ShieldCheck, Key, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export const SecurityModal = ({ isOpen, onClose }) => {
    const { updatePassword } = useAuth();
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        password: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwords.password !== passwords.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (passwords.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            await updatePassword(passwords.password);

            toast.success("Password updated successfully");
            setPasswords({ password: '', confirmPassword: '' });
            onClose();
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error(error.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-md bg-background/95 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-border/10 flex justify-between items-center bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Security Settings</h2>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-colors p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Password Change Section */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-2">Change Password</h3>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">New Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type="password"
                                            value={passwords.password}
                                            onChange={(e) => setPasswords(p => ({ ...p, password: e.target.value }))}
                                            className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Confirm Password</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type="password"
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                                            className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <Button type="submit" disabled={loading} className="w-full rounded-2xl h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground mt-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                                </Button>
                            </form>

                            <div className="h-px bg-border/20 my-4" />

                            {/* 2FA Placeholder */}
                            <div className="opacity-60 grayscale pointer-events-none">
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-muted/10">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-primary" />
                                            <span className="font-bold text-sm">Two-Factor Auth</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs">Enable</Button>
                                </div>
                                <div className="flex items-center gap-2 mt-2 px-1">
                                    <AlertCircle className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Coming Soon</p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
