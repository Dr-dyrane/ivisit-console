
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Lock, ShieldCheck, Key, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../../lib/supabase';

// Sub-component for 2FA Logic to keep modal clean
const TwoFactorAuthSection = () => {
    const [status, setStatus] = useState('initial'); // initial, enrolling, verifying, enabled
    const [enrollData, setEnrollData] = useState(null);
    const [auditLoading, setAuditLoading] = useState(true);
    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState('');

    // Check status on mount
    useEffect(() => {
        checkMfaStatus();
    }, []);

    const checkMfaStatus = async () => {
        setAuditLoading(true);
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!error && data) {
            if (data.currentLevel === 'aal2' || data.nextLevel === 'aal2') {
                setStatus('enabled');
            } else {
                setStatus('initial');
            }
        }
        setAuditLoading(false);
    };

    const handleStartEnrollment = async () => {
        setError('');
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp'
            });
            if (error) throw error;

            setEnrollData(data);
            setStatus('enrolling');
        } catch (err) {
            setError(err.message);
            toast.error("Failed to start enrollment");
        }
    };

    const handleVerify = async () => {
        setError('');
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId: enrollData.id,
                challengeId: challenge.data.id,
                code: verifyCode
            });

            if (verify.error) throw verify.error;

            toast.success("Two-Factor Authentication Enabled!");
            setStatus('enabled');
            setEnrollData(null);
        } catch (err) {
            setError(err.message);
            toast.error("Invalid Code");
        }
    };

    const handleDisable = async () => {
        // Disabling MFA usually requires deleting the factor.
        // Requires listing factors then deleting.
        try {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const totpFactor = factors.find(f => f.factorType === 'totp');

            if (totpFactor) {
                const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
                if (error) throw error;
                setStatus('initial');
                toast.success("2FA Disabled");
            }
        } catch (err) {
            toast.error("Failed to disable 2FA");
        }
    };

    if (auditLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-muted/10 transition-all">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${status === 'enabled' ? 'text-success' : 'text-primary'}`} />
                        <span className="font-bold text-sm">Two-Factor Auth</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {status === 'enabled' ? 'Your account is secured with 2FA' : 'Add an extra layer of security'}
                    </p>
                </div>

                {status === 'initial' && (
                    <Button size="sm" onClick={handleStartEnrollment} variant="outline" className="rounded-xl h-8 text-xs font-semibold">
                        Setup
                    </Button>
                )}
                {status === 'enabled' && (
                    <Button size="sm" onClick={handleDisable} variant="destructive" className="rounded-xl h-8 text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 border-0">
                        Disable
                    </Button>
                )}
            </div>

            {status === 'enrolling' && enrollData && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-4 rounded-2xl bg-muted/30 space-y-4 border border-border/20"
                >
                    <div className="text-center space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Scan QR Code</p>
                        <div className="flex justify-center bg-white p-4 rounded-xl w-fit mx-auto shadow-sm">
                            <QRCodeCanvas value={enrollData.totp.uri} size={140} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono break-all px-4">
                            Secret: {enrollData.totp.secret}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Enter 6-digit Code</Label>
                        <div className="flex gap-2">
                            <Input
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value)}
                                placeholder="000 000"
                                className="font-mono text-center tracking-widest text-lg h-10 rounded-xl bg-background"
                                maxLength={6}
                            />
                            <Button onClick={handleVerify} disabled={verifyCode.length !== 6} className="h-10 rounded-xl">Verify</Button>
                        </div>
                        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export const SecurityModal = ({ isOpen, onClose }) => {
    const { updatePassword } = useAuth();
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

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
                        className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar bg-background/95 backdrop-blur-xl rounded-[32px] shadow-2xl"
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
                                            type={showNewPass ? "text" : "password"}
                                            value={passwords.password}
                                            onChange={(e) => setPasswords(p => ({ ...p, password: e.target.value }))}
                                            className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary pr-10"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPass(!showNewPass)}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Confirm Password</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type={showConfirmPass ? "text" : "password"}
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                                            className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary pr-10"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button type="submit" disabled={loading} className="w-full rounded-2xl h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground mt-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                                </Button>
                            </form>

                            <div className="h-px bg-border/20 my-4" />

                            {/* 2FA Section */}
                            <TwoFactorAuthSection />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
