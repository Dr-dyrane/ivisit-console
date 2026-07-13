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
import { Label } from '../ui/label';
import { CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js/pure';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
    createSetupIntent,
    listPaymentMethods as fetchPaymentMethods,
    topUpWallet,
    withdrawFunds
} from '../../services/walletService';

const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const canUseStripeInCurrentOrigin =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:';
const canLoadStripe = Boolean(STRIPE_PUBLISHABLE_KEY && canUseStripeInCurrentOrigin);

const modalSurfaceClass = 'w-[calc(100vw-1rem)] overflow-hidden rounded-sheet bg-card/92 p-0 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.18)] backdrop-blur-2xl sm:max-w-[425px]';
const amountInputClass = 'h-14 w-full rounded-inner bg-muted/30 pl-10 pr-4 text-xl font-semibold text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]';

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
                    <div className="rounded-inner bg-muted/30 p-4 shadow-sm">
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
                        className="h-12 w-full rounded-button bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
                {loading ? 'Saving...' : 'Verify and add card'}
            </Button>
        </form>
    );
};

export const GlobalFinancialModals = () => {
    const { profile, isAdmin } = useAuth();
    const { walletData, fetchWalletData } = usePageData();
    const contextWallet = walletData?.wallet;

    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isBillingOpen, setIsBillingOpen] = useState(false);

    const [amount, setAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
    const [eventWallet, setEventWallet] = useState(null);
    const [stripePromise, setStripePromise] = useState(null);
    const activeWallet = eventWallet || contextWallet;
    const parsedAmount = Number(amount);
    const hasValidAmount = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
    const availableBalance = Number(activeWallet?.balance || 0);
    const exceedsBalance = hasValidAmount && parsedAmount > availableBalance;

    const fetchData = useCallback(async () => {
        if (!profile) return;
        setLoadingPaymentMethods(true);
        try {
            const orgId = isAdmin() ? null : profile.organization_id;
            const methods = await fetchPaymentMethods(orgId, { quiet: true });
            setPaymentMethods(methods || []);
        } catch (error) {
            setPaymentMethods([]);
        } finally {
            setLoadingPaymentMethods(false);
        }
    }, [profile, isAdmin]);

    useEffect(() => {
        const applyEventWallet = (event) => {
            setEventWallet(event.detail?.wallet || null);
        };
        const handleOpenTopUp = (event) => {
            applyEventWallet(event);
            setIsTopUpOpen(true);
        };
        const handleOpenWithdraw = (event) => {
            applyEventWallet(event);
            setIsWithdrawOpen(true);
        };
        const handleOpenBilling = (event) => {
            applyEventWallet(event);
            setIsBillingOpen(true);
        };

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
        if (!isTopUpOpen && !isWithdrawOpen && !isBillingOpen) {
            setEventWallet(null);
            setAmount('');
        }
    }, [isTopUpOpen, isWithdrawOpen, isBillingOpen]);

    useEffect(() => {
        if (isTopUpOpen || isWithdrawOpen || isBillingOpen) {
            fetchData();
        }
    }, [isTopUpOpen, isWithdrawOpen, isBillingOpen, fetchData]);

    useEffect(() => {
        if (!isBillingOpen || !canLoadStripe || stripePromise) return;
        setStripePromise(loadStripe(STRIPE_PUBLISHABLE_KEY));
    }, [isBillingOpen, stripePromise]);

    const handleTopUp = async (e) => {
        e.preventDefault();
        if (!hasValidAmount) {
            toast.error('Enter an amount above 0.');
            return;
        }

        if (paymentMethods.length === 0) {
            toast.error('Add a card before adding funds.');
            return;
        }

        setProcessing(true);
        try {
            const orgId = isAdmin() ? null : profile.organization_id;
            await topUpWallet(parsedAmount, 'Add funds', orgId);
            toast.success('Funds added.');
            setIsTopUpOpen(false);
            setAmount('');
            fetchWalletData();
            window.dispatchEvent(new CustomEvent('paymentsDataChanged'));
        } catch (error) {
            toast.error(error.message || 'Add funds failed.');
        } finally {
            setProcessing(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!hasValidAmount) {
            toast.error('Enter an amount above 0.');
            return;
        }

        if (exceedsBalance) {
            toast.error('Amount is above the available balance.');
            return;
        }

        setProcessing(true);
        try {
            const orgId = isAdmin() ? null : profile.organization_id;
            await withdrawFunds(parsedAmount, 'Withdraw funds', orgId);
            toast.success('Withdrawal started.');
            setIsWithdrawOpen(false);
            setAmount('');
            fetchWalletData();
            window.dispatchEvent(new CustomEvent('paymentsDataChanged'));
        } catch (error) {
            toast.error(error.message || 'Withdrawal failed');
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: activeWallet?.currency || 'USD' }).format(val || 0);
    };

    return (
        <>
            {/* Add funds modal */}
            <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogContent className={modalSurfaceClass}>
                    <div className="p-6 md:p-8">
                    <div className="mx-auto mb-5 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">Add funds</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Add funds with a saved card.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleTopUp} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="ml-1 text-sm font-medium text-muted-foreground">Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className={amountInputClass}
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter className="mt-8">
                                <Button
                                    type="submit"
                                    disabled={processing || !hasValidAmount || paymentMethods.length === 0}
                        className="h-12 w-full rounded-button bg-emerald-500 text-sm font-semibold text-white shadow-[0_18px_56px_rgba(16,185,129,0.24)] transition-all hover:bg-emerald-600 active:scale-[0.98]"
                                >
                                    {processing ? 'Adding...' : 'Add funds'}
                                </Button>
                            </DialogFooter>
                            {!hasValidAmount && amount.trim() !== '' && !processing && (
                                <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
                                    Enter an amount above 0.
                                </p>
                            )}
                            {paymentMethods.length === 0 && !processing && (
                                <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
                                    Add a card before adding funds.
                                </p>
                            )}
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Withdraw Modal */}
            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogContent className={modalSurfaceClass}>
                    <div className="p-6 md:p-8">
                    <div className="mx-auto mb-5 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">Withdraw</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Withdraw available funds.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleWithdraw} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="ml-1 text-sm font-medium text-muted-foreground">Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className={amountInputClass}
                                        required
                                    />
                                </div>
                                <p className="ml-1 text-xs text-muted-foreground">Available: {formatCurrency(activeWallet?.balance)}</p>
                            </div>
                            <DialogFooter className="mt-8">
                                <Button
                                    type="submit"
                                    disabled={processing || !hasValidAmount || exceedsBalance}
                        className="h-12 w-full rounded-button bg-muted text-sm font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-[0.98]"
                                >
                                    {processing ? 'Withdrawing...' : 'Withdraw'}
                                </Button>
                            </DialogFooter>
                            {!hasValidAmount && amount.trim() !== '' && !processing && (
                                <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
                                    Enter an amount above 0.
                                </p>
                            )}
                            {exceedsBalance && !processing && (
                                <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
                                    Amount is above the available balance.
                                </p>
                            )}
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Billing Management Modal */}
            <Dialog open={isBillingOpen} onOpenChange={setIsBillingOpen}>
                <DialogContent className={`${modalSurfaceClass} sm:max-w-[500px]`}>
                    <div className="p-6 md:p-8">
                    <div className="mx-auto mb-5 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">Payment cards</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Manage saved cards.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-muted-foreground">Saved cards</Label>
                                <div className="grid gap-3">
                                    {loadingPaymentMethods ? (
                                <div className="h-20 animate-pulse rounded-inner bg-muted/10" />
                                    ) : paymentMethods.map(pm => (
                                <div key={pm.id} className="flex items-center justify-between gap-3 rounded-inner bg-muted/16 p-4 transition-all hover:bg-muted/26">
                                            <div className="flex items-center gap-3">
                                                <CreditCard className="h-5 w-5 text-muted-foreground transition-colors" />
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{pm.card?.brand || 'Card'} **** {pm.card?.last4}</p>
                                                    <p className="text-xs text-muted-foreground">Expires {pm.card?.exp_month}/{pm.card?.exp_year}</p>
                                                </div>
                                            </div>
                                            <span className="rounded-pill bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">Primary</span>
                                        </div>
                                    ))}
                                    {!loadingPaymentMethods && paymentMethods.length === 0 && (
                            <div className="rounded-inner bg-muted/16 py-6 text-center">
                                            <p className="text-sm font-medium text-muted-foreground">No saved cards</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-medium text-muted-foreground">Add card</Label>
                                {canLoadStripe ? (
                                    stripePromise ? (
                                        <Elements stripe={stripePromise}>
                                            <AddPaymentMethodForm
                                                organizationId={isAdmin() ? null : profile?.organization_id}
                                                onSuccess={() => {
                                                    fetchData();
                                                    toast.success('Card added.');
                                                }}
                                            />
                                        </Elements>
                                    ) : (
                        <div className="rounded-inner bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                                            Card setup is loading.
                                        </div>
                                    )
                                ) : (
                        <div className="rounded-inner bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
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
