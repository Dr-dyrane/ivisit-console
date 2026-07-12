import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    History,
    RefreshCw,
    Wallet,
    AlertCircle,
    Info,
    LockKeyhole,
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
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { ActivitySheet, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { SkeletonRows, CopyChip, StatusPill, DetailLine, EmptyState, ErrorBanner, LoadErrorState } from '../console/primitives';
import { useListKeyboardNav } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';


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
    const [loadError, setLoadError] = useState('');
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
    const [mobileLimit, setMobileLimit] = useState(20);
    const [hasMore, setHasMore] = useState({ ledger: false, payments: false });
    const [readState, setReadState] = useState({
        wallet: 'unavailable',
        ledger: 'unavailable',
        payments: 'unavailable',
        projection: 'unavailable',
        paymentMethods: 'unavailable',
    });
    const hasLoadedRef = useRef(false);
    const isMountedRef = useRef(false);
    const fetchRequestRef = useRef(0);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            fetchRequestRef.current += 1;
        };
    }, []);

    const fetchData = useCallback(async () => {
        const requestId = fetchRequestRef.current + 1;
        fetchRequestRef.current = requestId;
        const canUpdateRouteState = () => isMountedRef.current && fetchRequestRef.current === requestId;
        if (!canUpdateRouteState()) return;

        if (hasLoadedRef.current) {
            setIsFetching(true);
        } else {
            setLoading(true);
        }
        setLoadError('');
        try {
            const data = await getWalletPageData({
                profile,
                isAdmin: isAdmin(),
                isOrgAdmin: isOrgAdmin(),
                limit: isMobile ? mobileLimit : 50,
            });

            if (!canUpdateRouteState()) return;
            setWallet(data.wallet);
            setLedger((current) => data.readState.ledger === 'failed' ? current : data.ledger);
            setProjection((current) => data.readState.projection === 'failed' ? current : data.projection);
            setPaymentMethods((current) => data.readState.paymentMethods === 'failed' ? current : data.paymentMethods);
            setPayments((current) => data.readState.payments === 'failed' ? current : data.payments);
            setHasMore((current) => ({
                ledger: data.readState.ledger === 'failed' ? current.ledger : Boolean(data.hasMore?.ledger),
                payments: data.readState.payments === 'failed' ? current.payments : Boolean(data.hasMore?.payments),
            }));
            setReadState(data.readState);
            setLoadError(data.partialFailure ? 'Some payment information could not refresh.' : '');
            hasLoadedRef.current = true;
            setHasLoaded(true);
        } catch (error) {
            if (!canUpdateRouteState()) return;
            const message = error?.message || 'Payments could not load. Please try again.';
            setLoadError(message);
            toast.error('Payments could not load. Please try again.');
        } finally {
            if (canUpdateRouteState()) {
                setLoading(false);
                setIsFetching(false);
                setMobileLoadingMore(false);
            }
        }
    }, [isAdmin, isMobile, isOrgAdmin, mobileLimit, profile]);

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
        const handleOpenAnalytics = () => setAnalyticsModalOpen(true);
        window.addEventListener('exportLedger', handleExportEvent);
        window.addEventListener('paymentsDataChanged', handlePaymentsDataChanged);
        window.addEventListener('openWalletAnalytics', handleOpenAnalytics);
        return () => {
            window.removeEventListener('exportLedger', handleExportEvent);
            window.removeEventListener('paymentsDataChanged', handlePaymentsDataChanged);
            window.removeEventListener('openWalletAnalytics', handleOpenAnalytics);
        };
    }, [fetchData, handleExport]);

    const formatCurrency = (amount, currency = wallet?.currency || 'USD') => {
        const safeCurrency = String(currency || wallet?.currency || 'USD').toUpperCase();
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: safeCurrency }).format(amount || 0);
        } catch {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
        }
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
        readState,
        hasMore,
        counts: {
            ledger: ledger.length,
            payments: payments.length,
            cards: paymentMethods.length,
        },
        loading,
        isFetching,
        loadError,
        hasLoaded,
        activeTab,
        roleLabel: isAdmin() ? 'Platform admin' : 'Hospital admin',
        canManage: isAdmin() || isOrgAdmin(),
    }), [
        activeTab,
        isAdmin,
        isOrgAdmin,
        ledger,
        loadError,
        hasLoaded,
        isFetching,
        loading,
        paymentMethods,
        payments,
        projection,
        readState,
        hasMore,
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

    const handleMobileLoadMore = useCallback(() => {
        if (loading || isFetching || mobileLoadingMore || !hasMore[activeTab]) return;
        setMobileLoadingMore(true);
        setMobileLimit((current) => current + 20);
    }, [activeTab, hasMore, isFetching, loading, mobileLoadingMore]);

    const loadedAnalytics = useMemo(() => ({
        total: ledger.length + payments.length,
        active: payments.filter((payment) => payment.status === 'completed').length,
        recent: payments.filter((payment) => {
            if (!payment.created_at) return false;
            const createdAt = new Date(payment.created_at);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            return !Number.isNaN(createdAt.getTime()) && createdAt >= cutoff;
        }).length,
        byCategory: {
            ledger: ledger.length,
            payments: payments.length,
            methods: readState.paymentMethods === 'ready' ? paymentMethods.length : 0,
        },
        visibleCount: ledger.length + payments.length,
        distributionScope: 'loaded_preview',
        distributionLabel: 'Loaded records only',
    }), [ledger.length, paymentMethods.length, payments, readState.paymentMethods]);

    if (isMobile) {
        return (
            <>
                <SEOHead title="Payments" description="Review balance and loaded payment activity." />
                <MobileWallet
                    loading={loading}
                    isFetching={isFetching && !mobileLoadingMore}
                    errorMessage={loadError}
                    hasLoaded={hasLoaded}
                    wallet={wallet}
                    projection={projection}
                    readState={readState}
                    ledger={ledger}
                    payments={payments}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onRefresh={fetchData}
                    hasMore={Boolean(hasMore[activeTab])}
                    isLoadingMore={mobileLoadingMore}
                    onLoadMore={handleMobileLoadMore}
                    onExport={handleExport}
                    onOpenPayment={setSelectedPayment}
                    formatCurrency={formatCurrency}
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
                    analytics={loadedAnalytics}
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
                readState={readState}
                loadError={loadError}
                hasLoaded={hasLoaded}
                isFetching={isFetching}
                roleKind={isAdmin() ? 'admin' : 'org_admin'}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                fetchData={fetchData}
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
                analytics={loadedAnalytics}
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
                                    {formatCurrency(payment.amount, payment.currency)}
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
    success: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:bg-emerald-300/15 dark:text-emerald-100',
    warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:bg-amber-300/15 dark:text-amber-100',
    danger: 'bg-destructive/10 text-destructive shadow-e2',
    info: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:bg-sky-300/15 dark:text-sky-100',
    muted: 'bg-foreground/[0.055] text-muted-foreground shadow-e2 dark:bg-white/[0.06] dark:text-slate-200',
};

const metricToneClass = {
    success: {
        active: 'bg-emerald-500/12 text-emerald-700 shadow-e2 dark:text-emerald-100',
        rest: 'bg-muted/30 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-100',
    },
    info: {
        active: 'bg-sky-500/12 text-sky-700 shadow-e2 dark:text-sky-100',
        rest: 'bg-muted/30 text-muted-foreground hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-100',
    },
    muted: {
        active: 'bg-foreground/[0.08] text-foreground shadow-e2',
        rest: 'bg-muted/30 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
    },
};

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

const getPaymentSignal = ({ loadError, hasLoaded, wallet, ledger, payments }) => {
    const loadedCount = ledger.length + payments.length;

    if (loadError && !hasLoaded) {
        return {
            icon: AlertCircle,
            tone: 'danger',
            label: 'Load failed',
            headline: 'Payments did not load',
            subhead: 'No financial values are being inferred. Retry from the activity sheet.',
        };
    }

    if (loadError) {
        return {
            icon: AlertCircle,
            tone: 'warning',
            label: 'Saved results',
            headline: 'Showing the last loaded payment records',
            subhead: 'The latest refresh failed, so visible values may be out of date.',
        };
    }

    if (!wallet && loadedCount === 0) {
        return {
            icon: Wallet,
            tone: 'muted',
            label: 'No wallet returned',
            headline: 'No payment records are available',
            subhead: 'This role scope returned no wallet, transactions, or patient payments.',
        };
    }

    return {
        icon: ShieldCheck,
        tone: 'success',
        label: 'Read only',
        headline: `${loadedCount} payment record${loadedCount === 1 ? '' : 's'} loaded`,
        subhead: 'Review the latest returned records. Money-changing commands stay unavailable until their consequence is proved.',
    };
};

const PaymentsDesktopWorkspace = ({
    loading,
    wallet,
    projection,
    ledger,
    payments,
    paymentMethods,
    readState,
    loadError,
    hasLoaded,
    isFetching,
    roleKind,
    activeTab,
    setActiveTab,
    fetchData,
    onPaymentOpen,
    formatCurrency,
    formatPaymentMethod,
    formatPaymentDescription,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [focusedId, setFocusedIdState] = useState(searchParams.get('id'));
    const listScrollRef = useRef(null);
    const { routingPath, handleRailNavigate } = useWayfindingNav();
    const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
    const signal = getPaymentSignal({ loadError, hasLoaded, wallet, ledger, payments });
    const rawItems = activeTab === 'ledger' ? ledger : payments;
    const activeItems = useMemo(() => [...rawItems].sort((left, right) => {
        const leftTime = new Date(left.created_at || 0).getTime();
        const rightTime = new Date(right.created_at || 0).getTime();
        return sortConfig.direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
    }), [rawItems, sortConfig.direction]);
    const focusedEntry = activeItems.find((item) => item.id === focusedId) || null;
    const failedEmpty = Boolean(loadError) && activeItems.length === 0;
    const itemNoun = activeTab === 'ledger' ? 'loaded transactions' : 'loaded patient payments';
    const pagination = useMemo(() => ({
        currentPage: 1,
        totalPages: 1,
        totalCount: activeItems.length,
        itemsPerPage: Math.max(activeItems.length, 1),
        prevPage: () => {},
        nextPage: () => {},
        hasPrevPage: false,
        hasNextPage: false,
    }), [activeItems.length]);

    useEffect(() => {
        const requestedTab = searchParams.get('tab');
        if ((requestedTab === 'ledger' || requestedTab === 'payments') && requestedTab !== activeTab) {
            setActiveTab(requestedTab);
        }
    }, [activeTab, searchParams, setActiveTab]);

    useEffect(() => {
        const requestedId = searchParams.get('id');
        if (requestedId && activeItems.some((item) => item.id === requestedId)) {
            setFocusedIdState(requestedId);
            return;
        }
        setFocusedIdState((current) => activeItems.some((item) => item.id === current) ? current : (activeItems[0]?.id || null));
    }, [activeItems, searchParams]);

    const setFocusedId = useCallback((id) => {
        setFocusedIdState(id);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', activeTab);
        if (id) nextParams.set('id', id);
        else nextParams.delete('id');
        setSearchParams(nextParams, { replace: true });
    }, [activeTab, searchParams, setSearchParams]);

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        setFocusedIdState(null);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tab);
        nextParams.delete('id');
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setActiveTab, setSearchParams]);

    const handleOpen = useCallback((item) => {
        setFocusedId(item.id);
        if (activeTab === 'payments') onPaymentOpen(item);
    }, [activeTab, onPaymentOpen, setFocusedId]);

    const handleSort = useCallback(() => {
        setSortConfig((current) => ({
            key: 'created_at',
            direction: current.direction === 'desc' ? 'asc' : 'desc',
        }));
    }, []);

    const handleListKeyDown = useListKeyboardNav({
        items: activeItems,
        focusedItem: focusedEntry,
        setFocusedId,
        onOpen: handleOpen,
        scrollRef: listScrollRef,
        rowAttr: 'data-payment-row',
    });

    return (
        <WorkspaceStage
            moduleRailItems={moduleRailItems}
            activePath="/wallet"
            routingPath={routingPath}
            onRailNavigate={handleRailNavigate}
            rail={(
                <PaymentDetailRail
                    entry={focusedEntry}
                    entryKind={activeTab}
                    loading={loading}
                    wallet={wallet}
                    projection={projection}
                    paymentMethods={paymentMethods}
                    readState={readState}
                    ledgerCount={ledger.length}
                    paymentsCount={payments.length}
                    onOpenReceipt={onPaymentOpen}
                    formatCurrency={formatCurrency}
                    formatPaymentMethod={formatPaymentMethod}
                    formatPaymentDescription={formatPaymentDescription}
                />
            )}
        >
            <SignalPanel signal={signal} loading={loading} toneClassMap={paymentToneClass}>
                <PaymentsMetricStrip
                    wallet={wallet}
                    ledger={ledger}
                    payments={payments}
                    paymentMethods={paymentMethods}
                    activeTab={activeTab}
                    setActiveTab={handleTabChange}
                />
            </SignalPanel>

            <ActivitySheet
                loading={loading}
                isFetching={isFetching}
                failedEmpty={failedEmpty}
                pagination={pagination}
                itemNoun={itemNoun}
                loadingLabel="Loading payment records"
                toolbar={(
                    <PaymentsToolbar
                        activeTab={activeTab}
                        setActiveTab={handleTabChange}
                        loading={loading}
                        isFetching={isFetching}
                        onRefresh={fetchData}
                    />
                )}
                errorBanner={loadError && !failedEmpty ? (
                    <ErrorBanner
                        title="Payments refresh failed"
                        message={`${loadError} Existing rows are preserved and may be out of date.`}
                        onRetry={fetchData}
                        testId="payments-error-state"
                    />
                ) : null}
            >
                <div
                    ref={listScrollRef}
                    tabIndex={0}
                    onKeyDown={handleListKeyDown}
                    aria-label={activeTab === 'ledger' ? 'Transaction history list' : 'Patient payments list'}
                    style={{ outline: 'none' }}
                    className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
                >
                    {loading && <SkeletonRows />}
                    {!loading && failedEmpty && (
                        <LoadErrorState title="Payments did not load" message={loadError} onRetry={fetchData} />
                    )}
                    {!loading && !failedEmpty && (
                        <>
                            <PaymentsListHeader sortConfig={sortConfig} onSort={handleSort} />
                            {activeItems.length === 0 && !loadError && (
                                <EmptyState
                                    icon={History}
                                    heading={activeTab === 'ledger' ? 'No transactions returned' : 'No patient payments returned'}
                                    body="This is an empty result for the current role scope, not a global financial total."
                                />
                            )}
                            {activeItems.map((item) => (
                                <PaymentRow
                                    key={item.id}
                                    item={item}
                                    activeTab={activeTab}
                                    selected={focusedEntry?.id === item.id}
                                    onFocus={() => setFocusedId(item.id)}
                                    onOpen={() => handleOpen(item)}
                                    formatCurrency={formatCurrency}
                                    formatPaymentMethod={formatPaymentMethod}
                                    formatPaymentDescription={formatPaymentDescription}
                                />
                            ))}
                        </>
                    )}
                </div>
            </ActivitySheet>
        </WorkspaceStage>
    );
};

const PaymentsMetricStrip = ({
    wallet,
    ledger,
    payments,
    paymentMethods,
    activeTab,
    setActiveTab,
}) => {
    const metrics = [
        {
            id: 'balance',
            label: 'Balance',
            value: wallet ? formatCompactCurrency(wallet.balance, wallet.currency || 'USD') : 'Not returned',
            icon: Wallet,
            tone: 'info',
            tab: 'ledger',
            onClick: () => setActiveTab('ledger'),
        },
        {
            id: 'ledger',
            label: 'Transactions loaded',
            value: ledger.length,
            icon: History,
            tone: 'muted',
            tab: 'ledger',
            onClick: () => setActiveTab('ledger'),
        },
        {
            id: 'payments',
            label: 'Payments loaded',
            value: payments.length,
            icon: ShieldCheck,
            tone: 'success',
            tab: 'payments',
            onClick: () => setActiveTab('payments'),
        },
        {
            id: 'cards',
            label: 'Cards returned',
            value: paymentMethods.length,
            icon: CreditCard,
            tone: paymentMethods.length > 0 ? 'success' : 'muted',
            onClick: () => {},
        },
    ];

    return (
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
                                disabled={item.id === 'cards'}
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
    );
};

const PaymentsToolbar = ({
    activeTab,
    setActiveTab,
    loading,
    isFetching,
    onRefresh,
}) => (
    <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 rounded-inner bg-muted/30 p-1">
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
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
        <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading || isFetching}
            className="h-12 w-12 shrink-0 rounded-button bg-muted/30 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 disabled:opacity-60"
            aria-label={isFetching ? 'Refreshing payments' : 'Refresh payments'}
        >
            <RefreshCw className={`h-4 w-4 ${loading || isFetching ? 'animate-spin' : ''}`} />
        </Button>
    </div>
);

const PAYMENT_GRID_COLS = 'grid-cols-[minmax(180px,1.35fr)_minmax(110px,0.75fr)_minmax(110px,0.8fr)_108px_124px_78px]';

const PaymentsListHeader = ({ sortConfig, onSort }) => (
    <div className={`grid ${PAYMENT_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
        <span>Activity</span>
        <span>Status</span>
        <span>Scope</span>
        <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
        <span className="text-right">Amount</span>
        <span className="justify-self-end text-right">Action</span>
    </div>
);

const PaymentRow = ({
    item,
    activeTab,
    selected,
    onFocus,
    onOpen,
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
    const statusTone = isPayment
        ? item.status === 'completed' ? paymentToneClass.success : item.status === 'failed' ? paymentToneClass.danger : paymentToneClass.warning
        : isCredit ? paymentToneClass.success : paymentToneClass.muted;

    return (
        <ListRowShell
            id={item.id}
            dataAttrName="data-payment-row"
            gridCols={PAYMENT_GRID_COLS}
            selected={selected}
            onFocus={onFocus}
            onOpen={onOpen}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill ${tone}`}>
                    <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-foreground">{description}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{subline}</span>
                </span>
            </div>

            <div className="min-w-0">
                <span className={`inline-flex max-w-full rounded-pill px-3 py-1 text-xs font-semibold ${statusTone}`}>
                    <span className="truncate">{label}</span>
                </span>
            </div>

            <div className="truncate text-sm font-medium text-muted-foreground">
                {isPayment ? item.emergency_requests?.hospitals?.name || 'Current role scope' : 'Wallet ledger'}
            </div>

            <div className="text-sm font-medium text-muted-foreground">{formatDate(item.created_at)}</div>

            <div className="text-right">
                <div className="text-base font-semibold text-foreground">
                    {amountPrefix} {formatCurrency(Math.abs(Number(item.amount || 0)), isPayment ? item.currency : undefined)}
                </div>
                <div className="mt-1 text-[11px] font-medium text-muted-foreground">{formatTime(item.created_at)}</div>
            </div>

            <span className="justify-self-end inline-flex h-9 items-center gap-1 rounded-pill bg-background/45 px-3 text-xs font-semibold text-muted-foreground shadow-sm transition-all group-hover:bg-foreground group-hover:text-background">
                {isPayment ? 'Receipt' : 'Read only'}
                {isPayment && <ArrowRight className="h-3.5 w-3.5" />}
            </span>
        </ListRowShell>
    );
};

const PaymentDetailRail = ({
    entry,
    entryKind,
    loading,
    wallet,
    projection,
    paymentMethods,
    readState,
    ledgerCount,
    paymentsCount,
    onOpenReceipt,
    formatCurrency,
    formatPaymentMethod,
    formatPaymentDescription,
}) => {
    if (loading) {
        return (
            <DetailRailShell>
                <div className="space-y-3">
                    <div className="h-24 animate-pulse rounded-modal bg-muted/30" />
                    <div className="h-14 animate-pulse rounded-card bg-muted/25" />
                    <div className="h-14 animate-pulse rounded-card bg-muted/25" />
                    <div className="h-14 animate-pulse rounded-card bg-muted/25" />
                </div>
            </DetailRailShell>
        );
    }

    const isPayment = entryKind === 'payments';
    const isCredit = isPayment ? entry?.status === 'completed' : entry?.transaction_type === 'credit';
    const statusLabel = entry
        ? isPayment ? titleCase(entry.status || 'unknown') : titleCase(entry.transaction_type || 'transaction')
        : 'Read only';
    const statusTone = entry
        ? isPayment && entry.status === 'failed' ? paymentToneClass.danger : isCredit ? paymentToneClass.success : paymentToneClass.muted
        : paymentToneClass.muted;
    const description = entry
        ? isPayment ? formatPaymentDescription(entry) : entry.description || 'Transaction'
        : 'No record selected';
    const amount = entry
        ? formatCurrency(Math.abs(Number(entry.amount || 0)), isPayment ? entry.currency : undefined)
        : 'Not selected';
    const scopeLabel = isPayment
        ? entry?.emergency_requests?.hospitals?.name || 'Current role scope'
        : 'Wallet ledger';

    return (
        <DetailRailShell>
            <RailInsetHero>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold tracking-tight">{isPayment ? 'Payment details' : 'Transaction details'}</h2>
                        {entry?.id && (
                            <div className="mt-1 flex min-w-0 items-center gap-1">
                                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={entry.id}>{entry.id}</p>
                                <CopyChip value={entry.id} label="Copy payment record ID" />
                            </div>
                        )}
                        <div className="mt-4">
                            <StatusPill label={statusLabel} className={statusTone} />
                        </div>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-sky-700 dark:text-sky-100">
                        {isPayment ? <CreditCard className="h-5 w-5" /> : <History className="h-5 w-5" />}
                    </span>
                </div>
                <div className="mt-5 rounded-card bg-background/45 p-4 dark:bg-white/[0.05]">
                    <p className="text-xs font-medium text-muted-foreground">Amount</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">{amount}</p>
                    <p className="mt-2 truncate text-sm font-medium text-muted-foreground">{description}</p>
                </div>
            </RailInsetHero>

            {entry ? (
                <div className="space-y-3">
                    <DetailLine icon={Clock} label="Recorded" value={`${formatDate(entry.created_at)} at ${formatTime(entry.created_at)}`} />
                    <DetailLine icon={Building} label="Scope" value={scopeLabel} />
                    <DetailLine icon={isPayment ? CreditCard : History} label={isPayment ? 'Method' : 'Reference'} value={isPayment ? titleCase(formatPaymentMethod(entry)) : entry.reference_id || 'Not returned'} />
                </div>
            ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-card bg-muted/18 p-6 text-center">
                    <Info className="mb-3 h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No record selected</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose a loaded row to inspect its source fields.</p>
                </div>
            )}

            {isPayment && entry && (
                <Button
                    onClick={() => onOpenReceipt(entry)}
                    className="mt-5 h-12 w-full rounded-card bg-foreground text-sm font-semibold text-background shadow-e2-strong transition-all hover:bg-foreground/90 active:scale-95"
                >
                    <Info className="mr-2 h-4 w-4" />
                    Open receipt
                    <ArrowRight className="ml-auto h-4 w-4 opacity-70" />
                </Button>
            )}

            <div className="mt-5 space-y-3">
                <div className="rounded-card bg-background/35 p-4 dark:bg-black/[0.08]">
                    <p className="text-xs font-medium text-muted-foreground">Recorded balance</p>
                    <p className="mt-1 text-2xl font-semibold">{wallet ? formatCurrency(wallet.balance) : 'Not returned'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{ledgerCount} transactions and {paymentsCount} patient payments loaded, up to 50 per source.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-inner bg-muted/22 p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Projection returned</p>
                        <p className="mt-1 text-sm font-semibold">{readState?.projection === 'ready' ? formatCurrency(projection || 0) : 'Unavailable'}</p>
                    </div>
                    <div className="rounded-inner bg-muted/22 p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Cards returned</p>
                        <p className="mt-1 text-sm font-semibold">{readState?.paymentMethods === 'ready' ? paymentMethods.length : 'Unavailable'}</p>
                    </div>
                </div>
            </div>

            <div className="mt-5 rounded-card bg-amber-500/10 p-4 text-amber-800 dark:text-amber-100">
                <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold">Money changes unavailable</p>
                        <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-100/75">Add funds, withdraw, and card changes stay locked until receiver authority and reflected app consequences are proved.</p>
                    </div>
                </div>
            </div>
        </DetailRailShell>
    );
};
