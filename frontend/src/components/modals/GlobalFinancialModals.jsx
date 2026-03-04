import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { CreditCard, ArrowUpRight, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
    createSetupIntent,
    listPaymentMethods as fetchPaymentMethods,
    topUpWallet,
    withdrawFunds,
    setPayoutMethod
} from '../../services/walletService';

const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const canUseStripeInCurrentOrigin =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:';
const stripePromise =
    STRIPE_PUBLISHABLE_KEY && canUseStripeInCurrentOrigin
        ? loadStripe(STRIPE_PUBLISHABLE_KEY)
        : null;

const AddPaymentMethodForm = ({ organizationId, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) {
            toast.error('Stripe is still loading. Please wait.');
            return;
        }

        setLoading(true);
        try {
            const { clientSecret } = await createSetupIntent(organizationId);
            if (!clientSecret) throw new Error('Failed to retrieve security token from gateway.');

            const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                },
            });

            if (error) throw error;

            if (setupIntent?.status === 'succeeded') {
                toast.success('Card added and secured successfully');
                onSuccess();
            } else {
                throw new Error('Verification incomplete. Please try again.');
            }
        } catch (err) {
            console.error('Stripe verify error:', err);
            toast.error(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/10">
                <CardElement options={{
                    style: {
                        base: {
                            fontSize: '16px',
                            color: 'var(--foreground)',
                            '::placeholder': { color: 'var(--muted-foreground)' },
                        },
                    },
                }} />
            </div>
            <Button
                type="submit"
                disabled={!stripe || loading}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold tracking-widest uppercase text-[10px]"
            >
                {loading ? 'Securing...' : 'Verify & Add Card'}
            </Button>
        </form>
    );
};

export const GlobalFinancialModals = () => {
    const { profile, isAdmin } = useAuth();
    const { walletData, fetchWalletData } = usePageData();
    const { wallet } = walletData;

    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isBillingOpen, setIsBillingOpen] = useState(false);

    const [amount, setAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

    const fetchData = useCallback(async () => {
        if (!profile) return;
        setLoadingPaymentMethods(true);
        try {
            const orgId = isAdmin() ? null : profile.organization_id;
            const methods = await fetchPaymentMethods(orgId);
            setPaymentMethods(methods || []);
        } catch (error) {
            console.error('Error fetching billing data:', error);
        } finally {
            setLoadingPaymentMethods(false);
        }
    }, [profile, isAdmin]);

    useEffect(() => {
        const handleOpenTopUp = () => setIsTopUpOpen(true);
        const handleOpenWithdraw = () => setIsWithdrawOpen(true);
        const handleOpenBilling = () => setIsBillingOpen(true);

        window.addEventListener('openTopUpModal', handleOpenTopUp);
        window.addEventListener('openWithdrawModal', handleOpenWithdraw);
        window.addEventListener('openBillingModal', handleOpenBilling);

        return () => {
            window.removeEventListener('openTopUpModal', handleOpenTopUp);
            window.removeEventListener('openWithdrawModal', handleOpenWithdraw);
            window.removeEventListener('openBillingModal', handleOpenBilling);
        };
    }, []);

    useEffect(() => {
        if (isTopUpOpen || isWithdrawOpen || isBillingOpen) {
            fetchData();
        }
    }, [isTopUpOpen, isWithdrawOpen, isBillingOpen, fetchData]);

    const handleTopUp = async (e) => {
        e.preventDefault();
        if (!amount || isNaN(amount)) return;
        setProcessing(true);
        try {
            const orgId = isAdmin() ? null : profile.organization_id;
            await topUpWallet(Number(amount), 'Wallet Top-up', orgId);
            toast.success('Wallet topped up successfully');
            setIsTopUpOpen(false);
            setAmount('');
            fetchWalletData();
        } catch (error) {
            toast.error(error.message || 'Top up failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!amount || isNaN(amount)) return;
        setProcessing(true);
        try {
            const orgId = isAdmin() ? null : profile.organization_id;
            await withdrawFunds(Number(amount), 'Manual Withdrawal', orgId);
            toast.success('Withdrawal initiated successfully');
            setIsWithdrawOpen(false);
            setAmount('');
            fetchWalletData();
        } catch (error) {
            toast.error(error.message || 'Withdrawal failed');
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet?.currency || 'USD' }).format(val || 0);
    };

    return (
        <>
            {/* Top Up Modal */}
            <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogContent className="squircle-3xl glass-card border-border/10 p-0 overflow-hidden sm:max-w-[425px]">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">Top Up Wallet</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium font-sans">
                                Add funds to your organization's wallet via secured payment card.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleTopUp} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Funding Amount (USD)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold opacity-50 text-foreground">$</span>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="py-6 pl-10 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary font-bold text-xl text-foreground"
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter className="mt-8">
                                <Button
                                    type="submit"
                                    disabled={processing || !amount || (paymentMethods.length === 0)}
                                    className="w-full py-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold tracking-widest uppercase text-xs transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {processing ? 'Processing...' : 'Complete Funding'}
                                </Button>
                            </DialogFooter>
                            {paymentMethods.length === 0 && !processing && (
                                <p className="text-center text-[10px] text-destructive font-bold uppercase tracking-widest mt-2">
                                    Please add a payment card in billing settings first
                                </p>
                            )}
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Withdraw Modal */}
            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogContent className="squircle-3xl glass-card border-border/10 p-0 overflow-hidden sm:max-w-[425px]">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">Withdraw Funds</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium font-sans">
                                Funds will be transferred to your primary payout method instantly.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleWithdraw} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Amount to Withdraw</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold opacity-50 text-foreground">$</span>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="py-6 pl-10 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary font-bold text-xl text-foreground"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground ml-1">Available: {formatCurrency(wallet?.balance)}</p>
                            </div>
                            <DialogFooter className="mt-8">
                                <Button
                                    type="submit"
                                    disabled={processing || !amount || Number(amount) > (wallet?.balance || 0)}
                                    className="w-full py-6 rounded-2xl bg-muted text-foreground hover:bg-muted/80 font-bold tracking-widest uppercase text-xs transition-all"
                                >
                                    {processing ? 'Processing...' : 'Confirm Withdrawal'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Billing Management Modal */}
            <Dialog open={isBillingOpen} onOpenChange={setIsBillingOpen}>
                <DialogContent className="squircle-3xl glass-card border-border/10 p-0 overflow-hidden sm:max-w-[500px]">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">Billing & Payments</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium font-sans">
                                Manage cards and secure transaction gateways.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Methods</Label>
                                <div className="grid gap-3">
                                    {loadingPaymentMethods ? (
                                        <div className="h-20 animate-pulse bg-muted/10 rounded-2xl" />
                                    ) : paymentMethods.map(pm => (
                                        <div key={pm.id} className="p-4 rounded-2xl bg-muted/10 border border-border/10 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <CreditCard className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                <div>
                                                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">{pm.card?.brand} •••• {pm.card?.last4}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">Exp: {pm.card?.exp_month}/{pm.card?.exp_year}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">Primary</Badge>
                                        </div>
                                    ))}
                                    {!loadingPaymentMethods && paymentMethods.length === 0 && (
                                        <div className="py-6 text-center bg-muted/10 rounded-2xl border border-dashed border-border/20">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No methods found</p>
                                        </div>
                                    )}
                                </div>
                            </div>


                            <Separator className="bg-border/10" />

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Secure New Source</Label>
                                {stripePromise ? (
                                    <Elements stripe={stripePromise}>
                                        <AddPaymentMethodForm
                                            organizationId={isAdmin() ? null : profile?.organization_id}
                                            onSuccess={() => {
                                                fetchData();
                                                toast.success('New source verified.');
                                            }}
                                        />
                                    </Elements>
                                ) : (
                                    <div className="rounded-2xl border border-border/20 bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground">
                                        Card setup is available only over HTTPS.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

const Badge = ({ children, className, variant = "default" }) => (
    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${variant === 'outline' ? 'border-border/20 text-muted-foreground' : 'bg-primary text-primary-foreground'} ${className}`}>
        {children}
    </span>
);
