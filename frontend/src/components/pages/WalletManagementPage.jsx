import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter, usePageShell } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRight,
    Clock,
    CreditCard,
    Building,
    ShieldCheck,
    TrendingUp,
    History,
    RefreshCw,
    Wallet,
    Loader2
} from 'lucide-react';
import { getWalletPageData } from '../../services/walletService';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "../ui/dialog";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileWallet } from '../mobile/MobileWallet';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { SEOHead } from '../common/SEOHead';


export const WalletManagementPage = () => {
    const { profile, isAdmin, isOrgAdmin } = useAuth();
    const { isMobile } = useNavigation();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [projection, setProjection] = useState(0);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [payments, setPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [activeTab, setActiveTab] = useState('ledger');
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getWalletPageData({
                profile,
                isAdmin: isAdmin(),
                isOrgAdmin: isOrgAdmin(),
                limit: 50,
            });

            setWallet(data.wallet);
            setLedger(data.ledger);
            setProjection(data.projection);
            setPaymentMethods(data.paymentMethods);
            setPayments(data.payments);
        } catch (error) {
            toast.error('Payments could not load. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [profile, isAdmin, isOrgAdmin]);

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
        link.setAttribute("download", `ivisit_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Transactions exported.');
    }, [ledger, wallet?.currency]);

    const handleTopUpTrigger = () => {
        window.dispatchEvent(new CustomEvent('openTopUpModal', { detail: { wallet } }));
    };

    const handleWithdrawTrigger = () => {
        window.dispatchEvent(new CustomEvent('openWithdrawModal', { detail: { wallet } }));
    };

    const handleBillingTrigger = () => {
        window.dispatchEvent(new CustomEvent('openBillingModal', { detail: { wallet } }));
    };

    const headerActions = useMemo(() => (
        <span className="hidden md:inline-flex items-center rounded-pill bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {isAdmin() ? 'Platform admin' : 'Hospital admin'}
        </span>
    ), [isAdmin]);

    usePageHeader('Payments', headerActions);

    usePageFooter(null, 'status', false);
    usePageShell({ bleed: true, hideFab: true });

    // Context Panel & FAB Event Listeners
    useEffect(() => {
        const handleExportEvent = () => handleExport();
        const handlePaymentsDataChanged = () => fetchData();
        window.addEventListener('exportLedger', handleExportEvent);
        window.addEventListener('paymentsDataChanged', handlePaymentsDataChanged);
        return () => {
            window.removeEventListener('exportLedger', handleExportEvent);
            window.removeEventListener('paymentsDataChanged', handlePaymentsDataChanged);
        };
    }, [fetchData, handleExport]);

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

    const walletPanelContext = useMemo(() => ({
        wallet,
        ledger: ledger.slice(0, 4),
        payments: payments.slice(0, 4),
        projection,
        paymentMethods,
        counts: {
            ledger: ledger.length,
            payments: payments.length,
            cards: paymentMethods.length,
        },
        loading,
        activeTab,
        roleLabel: isAdmin() ? 'Platform admin' : 'Hospital admin',
        canManage: isAdmin() || isOrgAdmin(),
    }), [
        activeTab,
        isAdmin,
        isOrgAdmin,
        ledger,
        loading,
        paymentMethods,
        payments,
        projection,
        wallet,
    ]);

    const publishWalletRouteContext = useCallback(() => {
        if (typeof window === 'undefined') return;

        window.dispatchEvent(new CustomEvent('walletRouteContextUpdated', {
            detail: walletPanelContext,
        }));
    }, [walletPanelContext]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        publishWalletRouteContext();
        window.addEventListener('requestWalletRouteContext', publishWalletRouteContext);

        return () => {
            window.removeEventListener('requestWalletRouteContext', publishWalletRouteContext);
        };
    }, [publishWalletRouteContext]);

    if (isMobile) {
        return (
            <>
                <SEOHead title="Payments" description="Review balance, cards, and payment activity." />
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
                    onOpenBilling={handleBillingTrigger}
                    onOpenPayment={setSelectedPayment}
                    onViewAnalytics={() => setAnalyticsModalOpen(true)}
                    formatCurrency={formatCurrency}
                    isAdmin={isAdmin()}
                    isOrgAdmin={isOrgAdmin()}
                />

                <PaymentReceiptDialog
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                    formatCurrency={formatCurrency}
                    formatPaymentMethod={formatPaymentMethod}
                    formatPaymentDescription={formatPaymentDescription}
                />

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
            </>
        );
    }

    return (
        <div className="min-h-[calc(100dvh-3rem)]">
            <SEOHead title="Payments" description="Review balance, cards, and payment activity." />
            <PaymentsDesktopWorkspace
                loading={loading}
                wallet={wallet}
                projection={projection}
                ledger={ledger}
                payments={payments}
                paymentMethods={paymentMethods}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                fetchData={fetchData}
                onTopUp={handleTopUpTrigger}
                onWithdraw={handleWithdrawTrigger}
                onBilling={handleBillingTrigger}
                onPaymentOpen={setSelectedPayment}
                formatCurrency={formatCurrency}
                formatPaymentMethod={formatPaymentMethod}
                formatPaymentDescription={formatPaymentDescription}
            />

            <PaymentReceiptDialog
                payment={selectedPayment}
                onClose={() => setSelectedPayment(null)}
                formatCurrency={formatCurrency}
                formatPaymentMethod={formatPaymentMethod}
                formatPaymentDescription={formatPaymentDescription}
            />

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

const PaymentReceiptDialog = ({
    payment,
    onClose,
    formatCurrency,
    formatPaymentMethod,
    formatPaymentDescription,
}) => {
    const patient = payment?.user_details;
    const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(' ') || 'Patient unavailable';
    const patientInitials = [patient?.first_name?.[0], patient?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'P';
    const facilityName = payment?.emergency_requests?.hospitals?.name || 'Facility unavailable';
    const facilityAddress = payment?.emergency_requests?.hospitals?.address || 'Location unavailable';

    return (
        <AnimatePresence>
            {payment && (
                <Dialog open={Boolean(payment)} onOpenChange={onClose}>
                    <DialogContent className="w-[calc(100vw-1rem)] overflow-hidden rounded-modal bg-card/92 p-0 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.18)] backdrop-blur-2xl sm:max-w-[440px]">
                        <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto p-5 no-scrollbar md:p-6">
                            <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <span className="inline-flex items-center gap-2 rounded-pill bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-100">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {payment.status || 'Ready'}
                                    </span>
                                    <DialogTitle className="mt-4 text-2xl font-semibold tracking-tight">
                                        Payment details
                                    </DialogTitle>
                                    <DialogDescription className="mt-1 text-sm text-muted-foreground">
                                        Receipt {payment.id?.slice(0, 12) || 'not available'}
                                    </DialogDescription>
                                </div>
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-sky-500/12 text-sky-700 dark:text-sky-100">
                                    <CreditCard className="h-5 w-5" />
                                </span>
                            </div>

                            <div className="mt-5 rounded-card bg-background/42 p-5 dark:bg-white/[0.05]">
                                <div className="text-sm font-medium text-muted-foreground">Amount</div>
                                <div className="mt-2 text-4xl font-semibold tracking-tight">
                                    {formatCurrency(payment.amount)}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDate(payment.created_at)} at {formatTime(payment.created_at)}
                                </div>
                            </div>

                            <div className="mt-4 grid gap-2">
                                <ReceiptLine
                                    icon={CreditCard}
                                    label="Method"
                                    value={titleCase(formatPaymentMethod(payment))}
                                />
                                <ReceiptLine
                                    icon={ShieldCheck}
                                    label="Service"
                                    value={formatPaymentDescription(payment)}
                                />
                                <ReceiptLine
                                    icon={Building}
                                    label="Facility"
                                    value={facilityName}
                                    detail={facilityAddress}
                                />
                            </div>

                            {patient && (
                                <div className="mt-4 flex items-center gap-3 rounded-inner bg-muted/22 p-4">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/14 text-sm font-semibold text-sky-700 dark:text-sky-100">
                                        {patientInitials}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold">{patientName}</div>
                                        <div className="mt-1 truncate text-xs text-muted-foreground">
                                            {patient.phone || patient.email || 'Contact unavailable'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 rounded-inner bg-muted/20 p-4">
                                <div className="flex items-center justify-between text-sm font-medium">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(payment.amount)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Fee</span>
                                    <span>Included</span>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
};

const ReceiptLine = ({ icon: Icon, label, value, detail }) => (
    <div className="flex items-center gap-3 rounded-inner bg-muted/22 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-icon bg-background/45 text-muted-foreground">
            <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">{label}</span>
            <span className="mt-1 block truncate text-sm font-semibold text-foreground">{value || 'Not available'}</span>
            {detail && <span className="mt-1 block truncate text-xs text-muted-foreground">{detail}</span>}
        </span>
    </div>
);

const paymentToneClass = {
    success: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:bg-emerald-300/15 dark:text-emerald-100',
    warning: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:bg-amber-300/15 dark:text-amber-100',
    info: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:bg-sky-300/15 dark:text-sky-100',
    muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06] dark:text-slate-200',
};

const metricToneClass = {
    success: {
        active: 'bg-emerald-500/14 text-emerald-700 shadow-[0_18px_54px_rgba(16,185,129,0.18)] dark:text-emerald-100',
        rest: 'bg-muted/30 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-100',
    },
    info: {
        active: 'bg-sky-500/14 text-sky-700 shadow-[0_18px_54px_rgba(14,165,233,0.18)] dark:text-sky-100',
        rest: 'bg-muted/30 text-muted-foreground hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-100',
    },
    muted: {
        active: 'bg-foreground/[0.08] text-foreground shadow-[0_18px_54px_rgba(0,0,0,0.12)]',
        rest: 'bg-muted/30 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
    },
};

const PaymentsAtlasLayer = () => (
    <div className="absolute inset-0 overflow-hidden bg-background">
        <div
            className="absolute inset-0 opacity-[0.32] dark:opacity-[0.24]"
            style={{
                backgroundImage:
                    'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--success) / 0.08) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--info) / 0.08) 64% 67%, transparent 67%)',
                backgroundSize: '260px 180px, 340px 240px, 420px 280px',
                backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
            }}
        />
        <div
            className="absolute inset-0"
            style={{
                background:
                    'linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%), linear-gradient(90deg, hsl(var(--success) / 0.08), transparent 36%, hsl(var(--info) / 0.08))',
            }}
        />
    </div>
);

const formatDate = (value) => {
    if (!value) return 'No date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No date';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (value) => {
    if (!value) return 'No time';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No time';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const titleCase = (value) => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCompactCurrency = (amount, currency = 'USD') => {
    const value = Number(amount || 0);
    const compact = Math.abs(value) >= 10000;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 0,
    }).format(value);
};

const getPaymentSignal = ({ loading, wallet, paymentMethods, payments }) => {
    if (loading && !wallet) {
        return {
            icon: Loader2,
            spin: true,
            tone: 'muted',
            label: 'Loading',
            headline: 'Payments are loading',
            subhead: 'Balance, cards, and recent activity will appear here.',
        };
    }

    if (paymentMethods.length === 0) {
        return {
            icon: CreditCard,
            tone: 'warning',
            label: 'Cards needed',
            headline: 'Add a card to keep payments ready',
            subhead: 'Add a saved card before adding funds.',
        };
    }

    if (payments.length > 0) {
        return {
            icon: ShieldCheck,
            tone: 'success',
            label: 'Ready',
            headline: `${payments.length} patient payment${payments.length === 1 ? '' : 's'}`,
            subhead: 'Open patient payments or review transactions from the sheet.',
        };
    }

    return {
        icon: Wallet,
        tone: 'info',
        label: 'Ready',
        headline: 'Balance is ready',
        subhead: 'Review transactions, add funds, or manage saved cards.',
    };
};

const PaymentsDesktopWorkspace = ({
    loading,
    wallet,
    projection,
    ledger,
    payments,
    paymentMethods,
    activeTab,
    setActiveTab,
    fetchData,
    onTopUp,
    onWithdraw,
    onBilling,
    onPaymentOpen,
    formatCurrency,
    formatPaymentMethod,
    formatPaymentDescription,
}) => {
    const signal = getPaymentSignal({ loading, wallet, paymentMethods, payments });
    const activeItems = activeTab === 'ledger' ? ledger : payments;

    return (
        <section className="relative min-h-[calc(100dvh-3rem)] overflow-hidden bg-background text-foreground">
            <PaymentsAtlasLayer />

            <div className="relative z-10 flex min-h-[calc(100dvh-3rem)] w-full min-w-0 flex-col gap-5 px-4 pb-8 pt-20 sm:px-5 md:pt-24 lg:h-[calc(100dvh-3rem)] lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28">
                <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:self-stretch">
                    <PaymentsSignalPanel
                        signal={signal}
                        wallet={wallet}
                        projection={projection}
                        ledger={ledger}
                        payments={payments}
                        paymentMethods={paymentMethods}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onBilling={onBilling}
                        formatCurrency={formatCurrency}
                    />

                    <PaymentsSheet
                        loading={loading}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        activeItems={activeItems}
                        fetchData={fetchData}
                        onPaymentOpen={onPaymentOpen}
                        formatCurrency={formatCurrency}
                        formatPaymentMethod={formatPaymentMethod}
                        formatPaymentDescription={formatPaymentDescription}
                    />
                </section>

                <PaymentDetailRail
                    wallet={wallet}
                    projection={projection}
                    paymentMethods={paymentMethods}
                    onTopUp={onTopUp}
                    onWithdraw={onWithdraw}
                    onBilling={onBilling}
                    formatCurrency={formatCurrency}
                />
            </div>
        </section>
    );
};

const PaymentsSignalPanel = ({
    signal,
    wallet,
    projection,
    ledger,
    payments,
    paymentMethods,
    activeTab,
    setActiveTab,
    onBilling,
    formatCurrency,
}) => {
    const SignalIcon = signal.icon;
    const metrics = [
        {
            id: 'balance',
            label: 'Balance',
            value: formatCompactCurrency(wallet?.balance || 0, wallet?.currency || 'USD'),
            icon: Wallet,
            tone: 'info',
            tab: 'ledger',
            onClick: () => setActiveTab('ledger'),
        },
        {
            id: 'ledger',
            label: 'Transactions',
            value: ledger.length,
            icon: History,
            tone: 'muted',
            tab: 'ledger',
            onClick: () => setActiveTab('ledger'),
        },
        {
            id: 'payments',
            label: 'Patient payments',
            value: payments.length,
            icon: ShieldCheck,
            tone: 'success',
            tab: 'payments',
            onClick: () => setActiveTab('payments'),
        },
        {
            id: 'cards',
            label: 'Cards',
            value: paymentMethods.length,
            icon: CreditCard,
            tone: paymentMethods.length > 0 ? 'success' : 'muted',
            onClick: onBilling,
        },
    ];

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42 }}
            className="flex min-h-[270px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[330px]"
        >
            <div className="min-w-0">
                <div className="max-w-2xl">
                    <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${paymentToneClass[signal.tone] || paymentToneClass.muted}`}>
                        <SignalIcon className={`h-4 w-4 ${signal.spin ? 'animate-spin' : ''}`} />
                        {signal.label}
                    </div>
                    <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
                        {signal.headline}
                    </h1>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                        {signal.subhead}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-pill bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/[0.06]">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Next 30 days {formatCurrency(projection || 0)}
                    </div>
                </div>

                <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
                    {metrics.map((item) => {
                        const Icon = item.icon;
                        const active = item.tab ? activeTab === item.tab : false;
                        const tone = metricToneClass[item.tone] || metricToneClass.muted;

                        return (
                            <motion.button
                                key={item.id}
                                type="button"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={item.onClick}
                                className={`group min-h-[78px] rounded-inner px-3 py-3 text-left transition-[background,box-shadow,transform] duration-200 ${active ? tone.active : tone.rest}`}
                                aria-pressed={active}
                            >
                                <span className="flex items-start justify-between gap-2">
                                    <span className="min-w-0">
                                        <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
                                        <span className="mt-1 block truncate text-2xl font-semibold tracking-normal text-foreground">{item.value}</span>
                                    </span>
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/45 transition-transform group-hover:scale-105">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </motion.section>
    );
};

const PaymentsSheet = ({
    loading,
    activeTab,
    setActiveTab,
    activeItems,
    fetchData,
    onPaymentOpen,
    formatCurrency,
    formatPaymentMethod,
    formatPaymentDescription,
}) => (
    <div className="flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet">
        <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />

        <div className="flex items-center gap-3">
            <div className="flex flex-1 rounded-inner bg-muted/30 p-1">
                {[
                    { id: 'ledger', label: 'Transaction History', icon: History },
                    { id: 'payments', label: 'Patient Payments', icon: ShieldCheck },
                ].map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveTab(item.id)}
                            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-button px-3 text-sm font-semibold transition-all active:scale-[0.98] ${active ? 'bg-background text-foreground shadow-sm dark:bg-white/[0.10]' : 'text-muted-foreground hover:text-foreground'}`}
                            aria-pressed={active}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={fetchData}
                className="h-12 w-12 rounded-button bg-muted/30 text-muted-foreground shadow-sm transition-all hover:bg-sky-500/10 hover:text-sky-700 active:scale-95 dark:hover:text-sky-100"
                aria-label="Refresh payments"
            >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
        </div>

        <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
            <span>{loading ? 'Loading payments' : `${activeItems.length} ${activeTab === 'ledger' ? 'transactions' : 'patient payments'}`}</span>
            <span>{activeTab === 'ledger' ? 'Balance activity' : 'Patient receipts'}</span>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
            {loading && <PaymentSkeletonRows />}

            {!loading && activeItems.length === 0 && (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-muted/16 p-10 text-center">
                    <History className="mb-4 h-12 w-12 text-muted-foreground/65" />
                    <h3 className="text-xl font-semibold">No {activeTab === 'ledger' ? 'transactions' : 'patient payments'} yet</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                        {activeTab === 'ledger' ? 'Add funds or wait for payment activity.' : 'Completed patient payments will appear here.'}
                    </p>
                </div>
            )}

            {!loading && activeItems.length > 0 && (
                <AnimatePresence mode="popLayout">
                    {activeItems.map((item, index) => (
                        <PaymentRow
                            key={item.id}
                            item={item}
                            index={index}
                            activeTab={activeTab}
                            onPaymentOpen={onPaymentOpen}
                            formatCurrency={formatCurrency}
                            formatPaymentMethod={formatPaymentMethod}
                            formatPaymentDescription={formatPaymentDescription}
                        />
                    ))}
                </AnimatePresence>
            )}
        </div>
    </div>
);

const PaymentSkeletonRows = () => (
    <div className="space-y-2">
        {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-[78px] rounded-inner bg-muted/20 shimmer" />
        ))}
    </div>
);

const PaymentRow = ({
    item,
    index,
    activeTab,
    onPaymentOpen,
    formatCurrency,
    formatPaymentMethod,
    formatPaymentDescription,
}) => {
    const isPayment = activeTab === 'payments';
    const isCredit = isPayment ? item.status === 'completed' : item.transaction_type === 'credit';
    const Icon = isPayment ? CreditCard : isCredit ? ArrowDownLeft : ArrowUpRight;
    const amountPrefix = !isPayment ? (isCredit ? '+' : '-') : '';
    const label = isPayment ? formatPaymentMethod(item) : titleCase(item.transaction_type || 'transaction');
    const description = isPayment ? formatPaymentDescription(item) : item.description || 'Transaction';
    const subline = isPayment
        ? item.emergency_requests?.hospitals?.name || `ID: ${item.id?.slice(0, 8) || 'payment'}`
        : `Ref: ${item.reference_id?.slice(0, 8) || 'N/A'}`;
    const tone = isPayment
        ? item.status === 'completed' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-100' : 'bg-amber-500/12 text-amber-700 dark:text-amber-100'
        : isCredit ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-100' : 'bg-foreground/[0.055] text-muted-foreground';
    const content = (
        <>
            <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill ${tone}`}>
                    <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-foreground">{description}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{subline}</span>
                </span>
            </div>

            <div className="hidden min-w-0 items-center gap-2 md:flex">
                <span className={`inline-flex max-w-full rounded-pill px-3 py-1 text-xs font-semibold ${tone}`}>
                    <span className="truncate">{label}</span>
                </span>
            </div>

            <div className="hidden text-sm font-medium text-muted-foreground md:block">
                {formatDate(item.created_at)}
            </div>

            <div className="text-right">
                <div className="text-base font-semibold text-foreground">
                    {amountPrefix} {formatCurrency(Math.abs(Number(item.amount || 0)))}
                </div>
                <div className="mt-1 text-[11px] font-medium text-muted-foreground">{formatTime(item.created_at)}</div>
            </div>

            <span className="hidden h-9 items-center gap-1 rounded-pill bg-background/45 px-3 text-xs font-semibold text-muted-foreground shadow-sm transition-all group-hover:bg-foreground group-hover:text-background md:inline-flex">
                {isPayment ? 'Details' : 'Logged'}
                {isPayment && <ArrowRight className="h-3.5 w-3.5" />}
            </span>
        </>
    );

    if (isPayment) {
        return (
            <motion.button
                type="button"
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.2) }}
                onClick={() => onPaymentOpen(item)}
                className="group mb-2 grid min-h-[78px] w-full grid-cols-[minmax(150px,1.2fr)_minmax(110px,0.7fr)_96px_120px_82px] items-center gap-2 rounded-inner bg-muted/22 px-4 py-3 text-left transition-all duration-200 hover:bg-muted/34 hover:shadow-[0_18px_54px_rgba(0,0,0,0.10)] active:scale-[0.995]"
            >
                {content}
            </motion.button>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.2) }}
            className="group mb-2 grid min-h-[78px] grid-cols-[minmax(150px,1.2fr)_minmax(110px,0.7fr)_96px_120px_82px] items-center gap-2 rounded-inner bg-muted/22 px-4 py-3 transition-all duration-200 hover:bg-muted/34"
        >
            {content}
        </motion.div>
    );
};

const PaymentDetailRail = ({
    wallet,
    projection,
    paymentMethods,
    onTopUp,
    onWithdraw,
    onBilling,
    formatCurrency,
}) => (
    <aside className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />

        <div className="mb-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Payment actions</h2>
                    <p className="mt-1 text-sm text-muted-foreground">One action at a time.</p>
                </div>
                <span className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${paymentMethods.length > 0 ? paymentToneClass.success : paymentToneClass.warning}`}>
                    {paymentMethods.length > 0 ? 'Cards ready' : 'Cards needed'}
                </span>
            </div>

            <div className="mt-5 rounded-card bg-background/42 p-5 dark:bg-white/[0.05]">
                <div className="text-sm font-medium text-muted-foreground">Available balance</div>
                <div className="mt-2 text-4xl font-semibold tracking-tight">{formatCurrency(wallet?.balance || 0)}</div>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {wallet?.updated_at ? formatTime(wallet.updated_at) : 'just now'}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <Button
                className="h-12 rounded-button bg-emerald-500 text-white font-semibold shadow-[0_18px_56px_rgba(16,185,129,0.24)] transition-all hover:bg-emerald-600 active:scale-[0.98]"
                onClick={onTopUp}
            >
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Add funds
            </Button>
            <Button
                variant="ghost"
                className="h-12 rounded-button bg-muted/30 font-semibold text-foreground transition-all hover:bg-muted/45 active:scale-[0.98]"
                onClick={onWithdraw}
            >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
            </Button>
        </div>

        <Button
            variant="ghost"
            className="mt-3 h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-sky-500/10 hover:text-sky-700 active:scale-[0.98] dark:hover:text-sky-100"
            onClick={onBilling}
        >
            <CreditCard className="mr-2 h-4 w-4" />
            {paymentMethods.length > 0 ? 'Manage cards' : 'Link card'}
            <ChevronRightIcon />
        </Button>

        <div className="mt-5 rounded-card bg-background/35 p-4 dark:bg-black/[0.08]">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold">Saved cards</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{paymentMethods.length} ready</p>
                </div>
                <span className="rounded-pill bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Cards
                </span>
            </div>

            <div className="mt-3 space-y-2">
                {paymentMethods.length === 0 && (
                    <div className="rounded-inner bg-muted/22 px-4 py-5 text-center text-sm font-medium text-muted-foreground">
                        No saved cards
                    </div>
                )}
                {paymentMethods.map((method) => (
                    <div key={method.id} className="group flex items-center justify-between gap-3 rounded-inner bg-muted/22 px-4 py-3">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{method.card?.brand || 'Card'} **** {method.card?.last4}</div>
                            <div className="mt-1 text-xs text-muted-foreground">Expires {method.card?.exp_month}/{method.card?.exp_year}</div>
                        </div>
                        <span className="shrink-0 rounded-pill bg-background/55 px-3 py-1 text-[11px] font-semibold text-muted-foreground dark:bg-white/[0.06]">
                            Saved
                        </span>
                    </div>
                ))}
            </div>
        </div>

        <div className="mt-5 rounded-card bg-background/35 p-4 dark:bg-black/[0.08]">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-100">
                    <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                    <div className="text-sm font-semibold">Next 30 days</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatCurrency(projection || 0)} projected</div>
                </div>
            </div>
        </div>
    </aside>
);

const ChevronRightIcon = () => (
    <ArrowRight className="ml-auto h-4 w-4" />
);
