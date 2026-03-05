import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { supabase } from '../../lib/supabase';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CreditCard,
    Building,
    ShieldCheck,
    MoreVertical,
    TrendingUp,
    History,
    RefreshCw
} from 'lucide-react';
import {
    getProjectedRevenue,
    getOrgStripeStatus,
    listPaymentMethods,
    deletePaymentMethod,
    backfillMissingFeeLedger
} from '../../services/walletService';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileWallet } from '../mobile/MobileWallet';
import { AnalyticsModal } from '../modals/AnalyticsModal';


export const WalletManagementPage = () => {
    const { profile, isAdmin, isOrgAdmin } = useAuth();
    const { isMobile } = useNavigation();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [projection, setProjection] = useState(0);
    const [orgInfo, setOrgInfo] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [payments, setPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [activeTab, setActiveTab] = useState('ledger');
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Main Wallet or Org Wallet based on role
            let walletData;
            if (isAdmin()) {
                const { data: mainWallet } = await supabase.from('ivisit_main_wallet').select('*').single();
                walletData = mainWallet;
            } else {
                const { data: orgWallet } = await supabase.from('organization_wallets').select('*').eq('organization_id', profile.organization_id).single();
                walletData = orgWallet;
            }
            setWallet(walletData);

            // 2. Fetch Billing Details (Admin vs Org Admin)
            if (isAdmin()) {
                // For Platform Admins: Fetch personal saved cards for platform funding
                const methods = await listPaymentMethods(null);
                setPaymentMethods(methods);
                setOrgInfo({ stripe_customer_id: profile?.stripe_customer_id, is_platform: true });
            } else if (profile.organization_id) {
                // For Organization Admins: Fetch org stripe status and saved cards
                const status = await getOrgStripeStatus(profile.organization_id);
                setOrgInfo(status);
                const methods = await listPaymentMethods(profile.organization_id);
                setPaymentMethods(methods);
            }

            // 3. Fetch 30d Projection
            const proj = await getProjectedRevenue(isAdmin() ? null : profile.organization_id);
            setProjection(proj);

            // 4. Fetch Ledger History (Credits & Debits)
            // Note: wallet_ledger is linked via wallet_id, not organization_id directly.
            // This ensures multi-tenant isolation and platform-wide ledger support.
            let query = supabase.from('wallet_ledger').select('*');
            if (walletData?.id) {
                query = query.eq('wallet_id', walletData.id);
            }

            const { data: ledgerData, error } = await query.order('created_at', { ascending: false }).limit(50);
            if (error) throw error;
            setLedger(ledgerData || []);

            // 5. Fetch Payments
            let payQuery = supabase.from('payments').select(`
                *,
                emergency_requests (
                    id,
                    service_type,
                    created_at,
                    hospitals (
                        name,
                        address
                    )
                )
            `);
            if (isOrgAdmin()) {
                payQuery = payQuery.eq('organization_id', profile.organization_id);
            }
            const { data: payData } = await payQuery.order('created_at', { ascending: false }).limit(50);

            // Enrich with user details manually since profiles are separate
            const enrichedPayments = await Promise.all((payData || []).map(async (p) => {
                const userId = p.user_id; // Direct user_id from payments table
                if (!userId) return p;
                const { data: userData } = await supabase.from('profiles').select('first_name, last_name, phone, email').eq('id', userId).single();
                return { ...p, user_details: userData };
            }));

            setPayments(enrichedPayments);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
            // toast.error('Connection to Stripe timed out. Showing last synced balance.');
        } finally {
            setLoading(false);
        }
    }, [profile.organization_id, isAdmin, isOrgAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExport = useCallback(() => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Date,Type,Description,Amount,Currency\n"
            + ledger.map(e => `${new Date(e.created_at).toLocaleString()},${e.transaction_type},${e.description},${e.amount},${wallet?.currency}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ivisit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Ledger exported successfully');
    }, [ledger, wallet?.currency]);

    const handleDeleteMethod = async (id) => {
        try {
            await deletePaymentMethod(profile.organization_id, id);
            toast.success('Card removed successfully');
            fetchData();
        } catch (error) {
            toast.error(error.message);
        }
    };


    const handleTopUpTrigger = () => {
        window.dispatchEvent(new CustomEvent('openTopUpModal'));
    };

    const handleWithdrawTrigger = () => {
        window.dispatchEvent(new CustomEvent('openWithdrawModal'));
    };

    const headerActions = useMemo(() => (
        <div className="flex gap-2">
            {(isOrgAdmin() || isAdmin()) && (
                <Button
                    onClick={handleTopUpTrigger}
                    className="glass-card-premium h-9 px-3 md:px-4 text-[10px] font-bold tracking-widest uppercase bg-success/20 hover:bg-success/30 border-success/30 text-success"
                    title={isAdmin() ? 'Credit Main' : 'Top Up'}
                >
                    <ArrowUpRight className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">{isAdmin() ? 'Credit Main' : 'Top Up'}</span>
                </Button>
            )}
            <Button
                onClick={handleWithdrawTrigger}
                className="glass-card-premium h-9 px-3 md:px-4 text-[10px] font-bold tracking-widest uppercase"
                title="Withdraw Funds"
            >
                <ArrowUpRight className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Withdraw Funds</span>
            </Button>
        </div>
    ), [isAdmin, isOrgAdmin]);

    usePageHeader('Wallet & Billing', headerActions);

    const footerContent = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5  uppercase tracking-widest text-[10px] font-bold">
                <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-zinc-500 animate-pulse' : 'bg-success'}`} />
                <span>{ledger.length} Transactions Recorded • Live Balance Active</span>
            </div>
        </div>
    ), [ledger.length, loading]);

    usePageFooter(footerContent, 'status', true);

    // Context Panel & FAB Event Listeners
    useEffect(() => {
        const handleExportEvent = () => handleExport();
        window.addEventListener('exportLedger', handleExportEvent);
        return () => {
            window.removeEventListener('exportLedger', handleExportEvent);
        };
    }, [handleExport]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet?.currency || 'USD' }).format(amount || 0);
    };
    const formatServiceTypeLabel = (serviceType) => {
        if (!serviceType || typeof serviceType !== 'string') return null;
        return serviceType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };
    const formatPaymentMethod = (payment) => payment?.payment_method || 'unknown';
    const formatPaymentDescription = (payment) => {
        const serviceLabel = formatServiceTypeLabel(payment?.emergency_requests?.service_type);
        if (serviceLabel) return `${serviceLabel} service`;
        if (payment?.display_id) return `Payment ${payment.display_id}`;
        if (payment?.emergency_request_id) return 'Emergency service payment';
        return 'Service payment';
    };

    const backfillLedger = useCallback(async () => {
        try {
            const { added } = await backfillMissingFeeLedger(profile.organization_id);

            if (added > 0) {
                console.log(`Self-healing: Backfilled ${added} missing fee entries.`);
                fetchData();
            }
        } catch (e) {
            console.error("Backfill error:", e);
        }
    }, [profile.organization_id, fetchData]);

    // Auto-run backfill on mount for org admins
    useEffect(() => {
        if (isOrgAdmin()) {
            backfillLedger();
        }
    }, [isOrgAdmin, backfillLedger]);

    if (isMobile) {
        return (
            <div className="min-h-screen">
                <MobileWallet
                    loading={loading}
                    wallet={wallet}
                    projection={projection}
                    paymentMethods={paymentMethods}
                    ledger={ledger}
                    payments={payments}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onRefresh={fetchData}
                    onTopUp={handleTopUpTrigger}
                    onWithdraw={handleWithdrawTrigger}
                    onOpenBilling={() => window.dispatchEvent(new CustomEvent('openBillingModal'))}
                    onOpenPayment={setSelectedPayment}
                    onViewAnalytics={() => setAnalyticsModalOpen(true)}
                    formatCurrency={formatCurrency}
                    isAdmin={isAdmin()}
                    isOrgAdmin={isOrgAdmin()}
                />

                <AnimatePresence>
                    {selectedPayment && (
                        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
                            <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[425px] glass-card-premium border-none p-0 overflow-hidden max-h-[calc(100dvh-5rem)] md:max-h-[85vh] overflow-y-auto no-scrollbar rounded-[24px] md:rounded-[32px] mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-5 md:p-6 flex flex-col items-center justify-center border-b border-border/10">
                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg mb-4">
                                        <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-primary" />
                                    </div>
                                    <DialogTitle className="text-xl md:text-2xl font-black tracking-tight md:tracking-tighter text-center">Payment Complete</DialogTitle>
                                    <DialogDescription className="text-center font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                                        Transaction ID: {selectedPayment.id?.slice(0, 12)}
                                    </DialogDescription>
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tight md:tracking-tighter mt-4">
                                        {formatCurrency(selectedPayment.amount)}
                                    </h2>
                                </div>

                                <div className="p-4 md:p-6 space-y-5 md:space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Date</Label>
                                            <p className="font-bold text-xs md:text-sm">
                                                {new Date(selectedPayment.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Time</Label>
                                            <p className="font-bold text-xs md:text-sm">
                                                {new Date(selectedPayment.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Method</Label>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-3 h-3 text-muted-foreground" />
                                                <p className="font-bold text-xs md:text-sm capitalize">{formatPaymentMethod(selectedPayment)}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 uppercase tracking-widest text-[9px] md:text-[10px]">
                                                {selectedPayment.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    <Separator className="bg-border/10" />

                                    {selectedPayment.user_details && (
                                        <div className="space-y-3">
                                            <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">Patient / Payer</Label>
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/5">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {selectedPayment.user_details.first_name?.[0]}{selectedPayment.user_details.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-xs md:text-sm">{selectedPayment.user_details.first_name} {selectedPayment.user_details.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">{selectedPayment.user_details.phone || selectedPayment.user_details.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">Service Details</Label>
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/5">
                                            <Building className="w-4 h-4 text-muted-foreground mt-1" />
                                            <div>
                                                <p className="font-bold text-xs md:text-sm capitalize mb-0.5">
                                                    {selectedPayment.emergency_requests?.service_type?.replace(/_/g, ' ') || 'Emergency Service'}
                                                </p>
                                                <p className="text-xs font-medium text-foreground/80">{selectedPayment.emergency_requests?.hospitals?.name || 'Unknown Hospital'}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{selectedPayment.emergency_requests?.hospitals?.address || 'Location Unavailable'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 -mx-4 md:-mx-6 -mb-4 md:-mb-6 p-4 md:p-6 mt-4 border-t border-border/10">
                                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(selectedPayment.amount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span>Platform Fee (2.5%)</span>
                                            <span>Included</span>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </AnimatePresence>

                <AnalyticsModal
                    open={analyticsModalOpen}
                    onClose={() => setAnalyticsModalOpen(false)}
                    type="generic"
                    analytics={{
                        total: ledger.length + payments.length,
                        active: (wallet?.balance || 0) > 0 ? 1 : 0,
                        recent: payments.filter(p => {
                            if (!p.created_at) return false;
                            const d = new Date(p.created_at);
                            const cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - 30);
                            return d >= cutoff;
                        }).length,
                        byCategory: {
                            ledger: ledger.length,
                            payments: payments.length,
                            methods: paymentMethods.length
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-6 md:py-8">
            <div className="pt-2" />


            {/* Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 px-0 md:px-2">
                <Card className="lg:col-span-2 p-8 bg-card border-none shadow-2xl relative overflow-hidden group hover:shadow-glow transition-all duration-300 hover:scale-[1.01]">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Available Balance</p>
                            <h2 className="text-6xl font-black tracking-tighter text-foreground mb-4">
                                {formatCurrency(wallet?.balance)}
                            </h2>
                            <div className="flex items-center gap-3">
                                <Badge className="bg-success text-white border-none py-1 px-3 rounded-full text-[10px] font-black tracking-widest uppercase">
                                    ACTIVE
                                </Badge>
                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    <Clock className="w-3.5 h-3.5" />
                                    Last Updated: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleTimeString() : 'Just now'}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="w-full p-4 rounded-3xl bg-muted/10 backdrop-blur-xl border border-border/10 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Projected (30d)</p>
                                    <p className="text-xl font-bold text-foreground tracking-tight">
                                        + {formatCurrency(projection)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Liquid background effect */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none opacity-50 dark:opacity-100" />
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-success/10 rounded-full blur-[80px] pointer-events-none opacity-50 dark:opacity-100" />
                </Card>

                <Card className="p-8 glass-card-premium border-none shadow-2xl flex flex-col justify-center gap-6 group hover:shadow-glow transition-all duration-300 hover:scale-[1.01]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center text-foreground shadow-inner">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Stripe Billing</p>
                            <h4 className="font-bold text-lg tracking-tight">Financial Hub</h4>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${orgInfo?.stripe_account_id ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                                    <span className="text-sm font-semibold tracking-tight">
                                        {orgInfo?.stripe_account_id ? 'Payouts Enabled' : 'Setup Required'}
                                    </span>
                                </div>
                                {orgInfo?.payout_method_last4 && (
                                    <Badge variant="outline" className="text-[10px] bg-background/50 border-border/10 uppercase tracking-tighter">
                                        {orgInfo.payout_method_brand} •••• {orgInfo.payout_method_last4}
                                    </Badge>
                                )}
                            </div>

                            {paymentMethods.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Saved Methods</p>
                                    <div className="flex flex-wrap gap-2">
                                        {paymentMethods.map(pm => (
                                            <div key={pm.id} className="flex items-center gap-2 bg-background/50 rounded-lg px-2 py-1 border border-border/10 group relative">
                                                <span className="text-[10px] font-mono text-muted-foreground">•••• {pm.card?.last4}</span>
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeleteMethod(pm.id)}
                                                >
                                                    <MoreVertical className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full py-6 rounded-2xl bg-primary text-primary-foreground font-bold tracking-widest uppercase text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                            onClick={() => window.dispatchEvent(new CustomEvent('openBillingModal'))}
                        >
                            {paymentMethods.length > 0 ? 'Manage Billing' : 'Link Payment Card'}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Tab Header */}
            <div className="flex items-center justify-between mb-6 px-4">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={` font-bold tracking-tighter flex items-center gap-3 transition-all ${activeTab === 'ledger' ? 'text-primary scale-105' : 'text-muted-foreground opacity-50 hover:opacity-100'}`}
                    >
                        <History className="w-4 h-4" />
                        Transaction Ledger
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={` font-bold tracking-tighter flex items-center gap-3 transition-all ${activeTab === 'payments' ? 'text-primary scale-105' : 'text-muted-foreground opacity-50 hover:opacity-100'}`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Service Payments
                    </button>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchData} className="h-8 w-8 p-0 rounded-full hover:bg-primary/10">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="px-0 md:px-2">
                <Card className="glass-card-premium border-none shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-muted/30">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{activeTab === 'ledger' ? 'Type' : 'Method'}</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-6 py-6 h-12" />
                                        </tr>
                                    ))
                                ) : (activeTab === 'ledger' ? ledger : payments).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">No {activeTab} recorded yet</p>
                                        </td>
                                    </tr>
                                ) : (
                                    (activeTab === 'ledger' ? ledger : payments).map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-muted/20 transition-colors group cursor-pointer"
                                            onClick={() => {
                                                if (activeTab === 'payments') {
                                                    setSelectedPayment(item);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'ledger'
                                                        ? (item.transaction_type === 'credit' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')
                                                        : (item.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')
                                                        }`}>
                                                        {activeTab === 'ledger' ? (
                                                            item.transaction_type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />
                                                        ) : (
                                                            <CreditCard className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest">
                                                        {activeTab === 'ledger' ? item.transaction_type : formatPaymentMethod(item)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div>
                                                    <p className="text-sm font-bold tracking-tight text-foreground">
                                                        {activeTab === 'ledger' ? item.description : formatPaymentDescription(item)}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter font-mono">
                                                        {activeTab === 'ledger' ? `Ref: ${item.reference_id?.slice(0, 8) || 'N/A'}` : `ID: ${item.id.slice(0, 8)}`}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <p className="text-xs font-bold text-muted-foreground">
                                                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-tight">
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap text-right">
                                                <span className={`text-lg font-black tracking-tighter ${activeTab === 'ledger'
                                                    ? (item.transaction_type === 'credit' ? 'text-success' : 'text-foreground')
                                                    : 'text-foreground'
                                                    }`}>
                                                    {activeTab === 'ledger' ? (item.transaction_type === 'credit' ? '+' : '-') : ''} {formatCurrency(Math.abs(item.amount))}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Footer info */}
                <div className="mt-8 flex items-center gap-2 px-4 opacity-50">
                    <ShieldCheck className="w-4 h-4 text-success" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">End-to-end encrypted transactions by iVisit Gateway</span>
                </div>

            </div>

            {/* Receipt Modal */}
            <AnimatePresence>
                {selectedPayment && (
                    <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
                        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[425px] glass-card-premium border-none p-0 overflow-hidden max-h-[calc(100dvh-5rem)] md:max-h-[85vh] overflow-y-auto no-scrollbar rounded-[24px] md:rounded-[32px] mt-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-5 md:p-6 flex flex-col items-center justify-center border-b border-border/10">
                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg mb-4">
                                    <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-primary" />
                                </div>
                                <DialogTitle className="text-xl md:text-2xl font-black tracking-tight md:tracking-tighter text-center">Payment Complete</DialogTitle>
                                <DialogDescription className="text-center font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                                    Transaction ID: {selectedPayment.id?.slice(0, 12)}
                                </DialogDescription>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight md:tracking-tighter mt-4">
                                    {formatCurrency(selectedPayment.amount)}
                                </h2>
                            </div>

                            <div className="p-4 md:p-6 space-y-5 md:space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Date</Label>
                                        <p className="font-bold text-xs md:text-sm">
                                            {new Date(selectedPayment.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Time</Label>
                                        <p className="font-bold text-xs md:text-sm">
                                            {new Date(selectedPayment.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Method</Label>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-3 h-3 text-muted-foreground" />
                                            <p className="font-bold text-xs md:text-sm capitalize">{formatPaymentMethod(selectedPayment)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
                                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 uppercase tracking-widest text-[9px] md:text-[10px]">
                                            {selectedPayment.status}
                                        </Badge>
                                    </div>
                                </div>

                                <Separator className="bg-border/10" />

                                {/* User Details Section */}
                                {selectedPayment.user_details && (
                                    <div className="space-y-3">
                                        <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">Patient / Payer</Label>
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/5">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {selectedPayment.user_details.first_name?.[0]}{selectedPayment.user_details.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs md:text-sm">{selectedPayment.user_details.first_name} {selectedPayment.user_details.last_name}</p>
                                                <p className="text-xs text-muted-foreground">{selectedPayment.user_details.phone || selectedPayment.user_details.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">Service Details</Label>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/5">
                                        <Building className="w-4 h-4 text-muted-foreground mt-1" />
                                        <div>
                                            <p className="font-bold text-xs md:text-sm capitalize mb-0.5">
                                                {selectedPayment.emergency_requests?.service_type?.replace(/_/g, ' ') || 'Emergency Service'}
                                            </p>
                                            <p className="text-xs font-medium text-foreground/80">{selectedPayment.emergency_requests?.hospitals?.name || 'Unknown Hospital'}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{selectedPayment.emergency_requests?.hospitals?.address || 'Location Unavailable'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 -mx-4 md:-mx-6 -mb-4 md:-mb-6 p-4 md:p-6 mt-4 border-t border-border/10">
                                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(selectedPayment.amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span>Platform Fee (2.5%)</span>
                                        <span>Included</span>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>

            <AnalyticsModal
                open={analyticsModalOpen}
                onClose={() => setAnalyticsModalOpen(false)}
                type="generic"
                analytics={{
                    total: ledger.length + payments.length,
                    active: (wallet?.balance || 0) > 0 ? 1 : 0,
                    recent: payments.filter(p => {
                        if (!p.created_at) return false;
                        const d = new Date(p.created_at);
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - 30);
                        return d >= cutoff;
                    }).length,
                    byCategory: {
                        ledger: ledger.length,
                        payments: payments.length,
                        methods: paymentMethods.length
                    }
                }}
            />
        </div>
    );
};

