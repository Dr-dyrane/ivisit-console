
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Lock, ShieldCheck, Key, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { handleAuthError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../../lib/supabase';

const MFA_ERROR_COPY = {
    status: 'Security status is unavailable. Try again.',
    setup: 'Authenticator setup could not start. Try again.',
    session: 'Setup session expired. Start again.',
    code: 'Enter the 6-digit code from your authenticator app.',
    verify: 'Verification failed. Check the code and try again.',
    disable: 'Authenticator removal failed. Try again.',
    missingFactor: 'No authenticator app is connected.',
};

const getTotpFactor = (factors) => {
    const factorList = Array.isArray(factors)
        ? factors
        : [
            ...(Array.isArray(factors?.totp) ? factors.totp : []),
            ...(Array.isArray(factors?.all) ? factors.all : []),
        ];

    return factorList.find((factor) => factor?.factorType === 'totp' || factor?.factor_type === 'totp');
};

// Sub-component for 2FA Logic to keep modal clean
const TwoFactorAuthSection = () => {
    const [status, setStatus] = useState('initial'); // initial, enrolling, verifying, enabled
    const [enrollData, setEnrollData] = useState(null);
    const [auditLoading, setAuditLoading] = useState(true);
    const [mfaAction, setMfaAction] = useState(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState('');

    // Check status on mount
    useEffect(() => {
        checkMfaStatus();
    }, []);

    const checkMfaStatus = async () => {
        setAuditLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (error) throw error;

            if (data.currentLevel === 'aal2' || data.nextLevel === 'aal2') {
                setStatus('enabled');
            } else {
                setStatus('initial');
            }
        } catch (err) {
            setStatus('initial');
            setError(MFA_ERROR_COPY.status);
        } finally {
            setAuditLoading(false);
        }
    };

    const handleStartEnrollment = async () => {
        if (mfaAction) return;
        setError('');
        setMfaAction('enrolling');

        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp'
            });
            if (error) throw error;

            setEnrollData(data);
            setStatus('enrolling');
        } catch (err) {
            setError(MFA_ERROR_COPY.setup);
            handleAuthError(err, 'update');
        } finally {
            setMfaAction(null);
        }
    };

    const handleVerify = async () => {
        if (mfaAction) return;
        setError('');

        if (!enrollData?.id) {
            setStatus('initial');
            setError(MFA_ERROR_COPY.session);
            return;
        }

        if (!/^\d{6}$/.test(verifyCode)) {
            setError(MFA_ERROR_COPY.code);
            return;
        }

        setMfaAction('verifying');

        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId: enrollData.id,
                challengeId: challenge.data.id,
                code: verifyCode
            });

            if (verify.error) throw verify.error;

            toast.success('Two-factor authentication enabled.');
            setStatus('enabled');
            setEnrollData(null);
            setVerifyCode('');
        } catch (err) {
            setError(MFA_ERROR_COPY.verify);
            toast.error(MFA_ERROR_COPY.verify);
        } finally {
            setMfaAction(null);
        }
    };

    const handleDisable = async () => {
        if (mfaAction) return;
        setError('');
        setMfaAction('disabling');

        // Disabling MFA usually requires deleting the factor.
        // Requires listing factors then deleting.
        try {
            const { data: factors, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;

            const totpFactor = getTotpFactor(factors);

            if (totpFactor) {
                const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
                if (error) throw error;
                setStatus('initial');
                toast.success('Two-factor authentication disabled.');
            } else {
                setStatus('initial');
                setError(MFA_ERROR_COPY.missingFactor);
            }
        } catch (err) {
            setError(MFA_ERROR_COPY.disable);
            handleAuthError(err, 'update');
        } finally {
            setMfaAction(null);
        }
    };

    const isSetupPending = mfaAction === 'enrolling';
    const isVerifyPending = mfaAction === 'verifying';
    const isDisablePending = mfaAction === 'disabling';
    const isVerificationReady = /^\d{6}$/.test(verifyCode);

    if (auditLoading) {
        return (
            <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 rounded-inner bg-muted/20 p-4 text-xs font-medium text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking security settings
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-inner bg-muted/20 p-4 shadow-sm transition-all">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${status === 'enabled' ? 'text-success' : 'text-primary'}`} />
                        <span className="text-sm font-bold">Two-factor authentication</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {status === 'enabled' ? 'Your account has two-step protection.' : 'Add an extra layer of security.'}
                    </p>
                </div>

                {status === 'initial' && (
                    <Button
                        size="sm"
                        onClick={handleStartEnrollment}
                        variant="outline"
                        disabled={Boolean(mfaAction)}
                        aria-busy={isSetupPending ? 'true' : undefined}
                        data-state={isSetupPending ? 'pending' : 'ready'}
                        className="h-8 rounded-button text-xs font-semibold"
                    >
                        {isSetupPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : 'Set up'}
                    </Button>
                )}
                {status === 'enabled' && (
                    <Button
                        size="sm"
                        onClick={handleDisable}
                        variant="destructive"
                        disabled={Boolean(mfaAction)}
                        aria-busy={isDisablePending ? 'true' : undefined}
                        data-state={isDisablePending ? 'pending' : 'ready'}
                        className="h-8 rounded-button bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20"
                    >
                        {isDisablePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : 'Disable'}
                    </Button>
                )}
            </div>

            {error && status !== 'enrolling' && (
                <p role="status" aria-live="polite" className="rounded-inner bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                    {error}
                </p>
            )}

            {status === 'enrolling' && enrollData && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-4 rounded-inner bg-muted/30 p-4 shadow-sm"
                >
                    <div className="text-center space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Scan QR code</p>
                        <div className="mx-auto flex w-fit justify-center rounded-inner bg-white p-4 shadow-sm">
                            <QRCodeCanvas value={enrollData.totp.uri} size={140} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono break-all px-4">
                            Setup key: {enrollData.totp.secret}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Enter 6-digit Code</Label>
                        <div className="flex gap-2">
                            <Input
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="h-10 rounded-button bg-background text-center font-mono text-lg shadow-sm"
                                maxLength={6}
                            />
                            <Button
                                onClick={handleVerify}
                                disabled={!isVerificationReady || isVerifyPending}
                                aria-busy={isVerifyPending ? 'true' : undefined}
                                data-state={isVerifyPending ? 'pending' : isVerificationReady ? 'ready' : 'disabled'}
                                className="h-10 rounded-button"
                            >
                                {isVerifyPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Verify'}
                            </Button>
                        </div>
                        {error && <p role="status" aria-live="polite" className="text-xs font-medium text-destructive">{error}</p>}
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
            handleAuthError(error, 'update');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-2 md:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
                        role="dialog"

                        aria-modal="true"

                        className="relative z-10 w-full max-w-md max-h-[calc(100dvh-5rem)] md:max-h-[90vh] overflow-y-auto no-scrollbar rounded-modal bg-background/95 shadow-2xl backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between bg-muted/20 p-3 shadow-[0_18px_42px_rgb(0_0_0/0.06)] md:p-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-icon bg-primary/10 p-2 text-primary">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Security Settings</h2>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                aria-label="Close security settings"
                                className="h-8 w-8 rounded-pill bg-muted/50 p-0 transition-colors hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="p-3 md:p-6 space-y-4 md:space-y-6">

                            {/* Password Change Section */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="mb-2 text-sm font-bold text-muted-foreground">Change password</h3>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">New Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type={showNewPass ? "text" : "password"}
                                            value={passwords.password}
                                            onChange={(e) => setPasswords(p => ({ ...p, password: e.target.value }))}
                                            className="h-12 rounded-button bg-muted/30 pl-10 pr-10 shadow-sm"
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPass(!showNewPass)}
                                            aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
                                            className="absolute right-3 top-3 rounded-pill p-1 text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96]"
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
                                            className="h-12 rounded-button bg-muted/30 pl-10 pr-10 shadow-sm"
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                                            aria-label={showConfirmPass ? 'Hide confirmation password' : 'Show confirmation password'}
                                            className="absolute right-3 top-3 rounded-pill p-1 text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96]"
                                        >
                                            {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    aria-busy={loading ? 'true' : undefined}
                                    data-state={loading ? 'pending' : 'ready'}
                                    className="mt-2 h-12 w-full rounded-button bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                            Updating...
                                        </>
                                    ) : 'Update Password'}
                                </Button>
                            </form>

                            <div className="my-4 h-1 rounded-pill bg-muted/20" />

                            {/* 2FA Section */}
                            <TwoFactorAuthSection />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
