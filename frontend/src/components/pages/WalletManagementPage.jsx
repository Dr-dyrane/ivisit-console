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
    Wallet,
    AlertCircle,
    Info,
    LockKeyhole,
} from 'lucide-react';
import { buildLoadedLedgerCsv, getWalletPageData } from '../../services/walletService';
import { useRowSelection } from '../../hooks/useRowSelection';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ModalShell } from '../ui/ModalShell';
import { toast } from 'sonner';
import { MobileWallet } from '../mobile/MobileWallet';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { BulkActionBar } from '../common/BulkActionBar';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { WorkspaceStage, DetailRailShell, RailInsetHero, useWayfindingNav } from '../console/WorkspaceStage';
import { SignalPanel } from '../console/SignalPanel';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../console/ActivitySheet';
import { MetricStrip } from '../console/MetricStrip';
import { SkeletonRows, CopyChip, StatusPill, DetailLine, EmptyState, ErrorBanner, LoadErrorState } from '../console/primitives';
import { useListKeyboardNav } from '../../hooks/useListKeyboardNav';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';

const createWalletFilters = () => ({
    ledger: {
        transactionType: 'all',
        dateRange: { start: '', end: '' },
    },
    payments: {
        status: 'all',
        paymentMethod: 'all',
        dateRange: { start: '', end: '' },
    },
});

export const WalletManagementPage = () => {
    const { profile, isAdmin, isOrgAdmin } = useAuth();
    const { isMobile } = useNavigation();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [payments, setPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [activeTab, setActiveTab] = useState('ledger');
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [mobileSearch, setMobileSearch] = useState('');
    const [mobileFilters, setMobileFilters] = useState(createWalletFilters);
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
        paymentMethods: 'unavailable',
        financeMetrics: 'unavailable',
    });
    const [financeMetrics, setFinanceMetrics] = useState(null);
    const [financeMetricsStale, setFinanceMetricsStale] = useState(false);
    const hasLoadedRef = useRef(false);
    const financeMetricsRef = useRef(null);
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
            setPaymentMethods((current) => data.readState.paymentMethods === 'failed' ? current : data.paymentMethods);
            setPayments((current) => data.readState.payments === 'failed' ? current : data.payments);
            setHasMore((current) => ({
                ledger: data.readState.ledger === 'failed' ? current.ledger : Boolean(data.hasMore?.ledger),
                payments: data.readState.payments === 'failed' ? current.payments : Boolean(data.hasMore?.payments),
            }));
            let metricsReadState = data.readState.financeMetrics;
            if (data.readState.financeMetrics === 'ready' && data.financeMetrics?.complete) {
                financeMetricsRef.current = data.financeMetrics;
                setFinanceMetrics(data.financeMetrics);
                setFinanceMetricsStale(false);
            } else if (data.readState.financeMetrics === 'failed' && financeMetricsRef.current?.complete) {
                metricsReadState = 'stale';
                setFinanceMetrics(financeMetricsRef.current);
                setFinanceMetricsStale(true);
            } else {
                financeMetricsRef.current = null;
                setFinanceMetrics(null);
                setFinanceMetricsStale(false);
            }
            setReadState({ ...data.readState, financeMetrics: metricsReadState });
            setLoadError(data.partialFailure ? 'Some payment information could not refresh.' : '');
            hasLoadedRef.current = true;
            setHasLoaded(true);
        } catch (error) {
            if (!canUpdateRouteState()) return;
            void error;
            if (financeMetricsRef.current?.complete) {
                setFinanceMetrics(financeMetricsRef.current);
                setFinanceMetricsStale(true);
            }
            setReadState((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [
                key,
                value === 'ready' || (key === 'financeMetrics' && financeMetricsRef.current?.complete)
                    ? 'stale'
                    : value,
            ])));
            setLoadError('Payments could not load. Please try again.');
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
        if (!ledger.length) {
            toast.info('No loaded transactions to export.');
            return;
        }

        const csvContent = buildLoadedLedgerCsv({ ledger, currency: wallet?.currency });
        const objectUrl = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.setAttribute('href', objectUrl);
        link.setAttribute('download', `ivisit_loaded_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
        toast.success(`${ledger.length} loaded transaction${ledger.length === 1 ? '' : 's'} exported.`);
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
        paymentMethods,
        readState,
        hasMore,
        financeMetrics,
        financeMetricsStale,
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
        readState,
        hasMore,
        financeMetrics,
        financeMetricsStale,
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

    const activeMobileFilters = mobileFilters[activeTab];
    const mobileFilterSchema = useMemo(() => {
        const dateFilter = {
            key: 'dateRange',
            type: 'date',
            label: 'Recorded date',
        };

        if (activeTab === 'ledger') {
            return [
                {
                    key: 'transactionType',
                    type: 'select',
                    label: 'Transaction type',
                    options: [
                        { label: 'All transactions', value: 'all' },
                        { label: 'Credit', value: 'credit' },
                        { label: 'Debit', value: 'debit' },
                    ],
                },
                dateFilter,
            ];
        }

        return [
            {
                key: 'status',
                type: 'select',
                label: 'Payment status',
                options: [
                    { label: 'All statuses', value: 'all' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Completed', value: 'completed' },
                    { label: 'Failed', value: 'failed' },
                    { label: 'Refunded', value: 'refunded' },
                    { label: 'Declined', value: 'declined' },
                ],
            },
            {
                key: 'paymentMethod',
                type: 'select',
                label: 'Payment method',
                options: [
                    { label: 'All methods', value: 'all' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'Card', value: 'card' },
                    { label: 'Wallet', value: 'wallet' },
                ],
            },
            dateFilter,
        ];
    }, [activeTab]);
    const handleApplyMobileFilters = useCallback((nextFilters) => {
        setMobileFilters((current) => ({ ...current, [activeTab]: nextFilters }));
    }, [activeTab]);
    const handleClearMobileFilters = useCallback(() => {
        setMobileFilters((current) => ({
            ...current,
            [activeTab]: createWalletFilters()[activeTab],
        }));
    }, [activeTab]);

    const loadedAnalytics = useMemo(() => {
        const byStatus = payments.reduce((counts, payment) => {
            const status = String(payment.status || 'unknown').toLowerCase();
            counts[status] = (counts[status] || 0) + 1;
            return counts;
        }, {});
        const completed = byStatus.completed || 0;
        const needsReview = payments.filter((payment) => !['completed', 'refunded'].includes(String(payment.status || '').toLowerCase())).length;
        const recent = payments.filter((payment) => {
            if (!payment.created_at) return false;
            const createdAt = new Date(payment.created_at);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            return !Number.isNaN(createdAt.getTime()) && createdAt >= cutoff;
        }).length;

        return {
            total: ledger.length + payments.length,
            completed,
            active: completed,
            needsReview,
            recent,
            paymentCount: payments.length,
            lifecycleCount: payments.length,
            byCategory: {
                transactions: ledger.length,
                patient_payments: payments.length,
            },
            byStatus,
            visibleCount: ledger.length + payments.length,
            distributionScope: 'loaded_preview',
            distributionLabel: 'Records currently shown',
        };
    }, [ledger.length, payments]);

    if (isMobile) {
        return (
            <>
            <SEOHead title="Payments" description="Review balance and payment activity." />
                <MobileWallet
                    loading={loading}
                    isFetching={isFetching && !mobileLoadingMore}
                    errorMessage={loadError}
                    hasLoaded={hasLoaded}
                    wallet={wallet}
                    readState={readState}
                    financeMetrics={financeMetrics}
                    financeMetricsStale={financeMetricsStale}
                    ledger={ledger}
                    payments={payments}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    search={mobileSearch}
                    onSearchCommit={setMobileSearch}
                    filters={activeMobileFilters}
                    onOpenFilters={() => setFilterSheetOpen(true)}
                    filterSheetOpen={filterSheetOpen}
                    onClearFilters={handleClearMobileFilters}
                    onOpenStats={() => setAnalyticsModalOpen(true)}
                    statsOpen={analyticsModalOpen}
                    onRefresh={fetchData}
                    hasMore={Boolean(hasMore[activeTab])}
                    isLoadingMore={mobileLoadingMore}
                    onLoadMore={handleMobileLoadMore}
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
                    type="payments"
                    analytics={loadedAnalytics}
                />

                <FilterSheet
                    isOpen={filterSheetOpen}
                    onOpenChange={setFilterSheetOpen}
                    filterSchema={mobileFilterSchema}
                    onApply={handleApplyMobileFilters}
                    initialValues={activeMobileFilters}
                    resetValues={createWalletFilters()[activeTab]}
                    resetLabel="Clear"
                    title={activeTab === 'ledger' ? 'Transaction filters' : 'Payment filters'}
                    viewToggle={null}
                    isMobile={true}
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
                ledger={ledger}
                payments={payments}
                paymentMethods={paymentMethods}
                readState={readState}
                financeMetrics={financeMetrics}
                financeMetricsStale={financeMetricsStale}
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
                search={mobileSearch}
                onSearchCommit={setMobileSearch}
                filters={activeMobileFilters}
                filterSheetOpen={filterSheetOpen}
                onOpenFilters={() => setFilterSheetOpen(true)}
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
                type="payments"
                analytics={loadedAnalytics}
            />

            <FilterSheet
                isOpen={filterSheetOpen}
                onOpenChange={setFilterSheetOpen}
                filterSchema={mobileFilterSchema}
                onApply={handleApplyMobileFilters}
                initialValues={activeMobileFilters}
                resetValues={createWalletFilters()[activeTab]}
                resetLabel="Clear"
                title={activeTab === 'ledger' ? 'Transaction filters' : 'Payment filters'}
                viewToggle={null}
                isMobile={false}
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
    const paymentStatus = String(payment?.status || 'unknown').toLowerCase();
    const paymentStatusLabel = titleCase(paymentStatus);
    const isCompleted = paymentStatus === 'completed';
    const lifecycleTimestamp = isCompleted
        ? payment?.processed_at || payment?.updated_at || payment?.created_at
        : payment?.created_at;
    const lifecycleLabel = isCompleted ? 'Processed' : 'Recorded';
    const receiptLabel = payment?.display_id || payment?.id?.slice(0, 12) || 'Not available';
    const feeValue = payment?.ivisit_fee_amount;
    const hasRecordedFee = feeValue !== null && feeValue !== undefined && Number.isFinite(Number(feeValue));
    const statusClass = paymentStatus === 'completed'
        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
        : paymentStatus === 'failed' || paymentStatus === 'declined'
            ? 'bg-destructive/10 text-destructive'
            : paymentStatus === 'refunded'
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-200'
                : paymentStatus === 'pending'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
                    : 'bg-muted/30 text-muted-foreground';

    return (
        <ModalShell
            isOpen={Boolean(payment)}
            onClose={onClose}
            title="Payment details"
            subtitle={`Receipt ${receiptLabel}`}
            icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
            badge={payment ? (
                <StatusPill label={paymentStatusLabel} className={statusClass} />
            ) : null}
            size="md"
            managed
            className="bg-background"
        >
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 no-scrollbar md:px-6 md:pb-6">
                    <section className="rounded-card bg-foreground/[0.05] p-5 dark:bg-white/[0.07]">
                        <p className="text-sm font-medium text-muted-foreground">Payment amount</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                            {payment ? formatCurrency(payment.amount, payment.currency) : 'Amount unavailable'}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {lifecycleLabel} {formatDate(lifecycleTimestamp)} at {formatTime(lifecycleTimestamp)}
                        </div>
                    </section>

                    <section className="rounded-card bg-muted/25 p-4 md:p-5">
                        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Payment context</h3>
                        <div className="grid gap-2">
                            <ReceiptLine
                                icon={CreditCard}
                                label="Method"
                                value={payment ? titleCase(formatPaymentMethod(payment)) : 'Not available'}
                            />
                            <ReceiptLine
                                icon={ShieldCheck}
                                label="Service"
                                value={payment ? formatPaymentDescription(payment) : 'Not available'}
                            />
                            <ReceiptLine
                                icon={Building}
                                label="Facility"
                                value={facilityName}
                                detail={facilityAddress}
                            />
                            <ReceiptLine
                                icon={Wallet}
                                label="iVisit fee"
                                value={hasRecordedFee ? formatCurrency(feeValue, payment?.currency) : 'Not recorded'}
                            />
                        </div>
                    </section>

                    <section className="rounded-card bg-muted/25 p-4 md:p-5">
                        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Payer</h3>
                        <div className="flex items-center gap-3 rounded-inner bg-background/45 p-4">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-sky-500/14 text-sm font-semibold text-sky-700 dark:text-sky-100">
                                {patientInitials}
                            </span>
                            <div className="min-w-0">
                                <p className="break-words text-sm font-semibold">{patientName}</p>
                                <p className="mt-1 break-words text-xs text-muted-foreground">
                                    {patient?.phone || patient?.email || 'Contact unavailable'}
                                </p>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="flex shrink-0 justify-end bg-muted/15 px-4 py-4 md:px-6">
                    <Button
                        type="button"
                        onClick={onClose}
                        className="rounded-button bg-foreground px-6 text-background hover:bg-foreground/90"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </ModalShell>
    );
};

const ReceiptLine = ({ icon: Icon, label, value, detail }) => (
    <div className="flex items-center gap-3 rounded-inner bg-muted/22 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-icon bg-background/45 text-muted-foreground">
            <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">{label}</span>
            <span className="mt-1 block break-words text-sm font-semibold text-foreground">{value || 'Not available'}</span>
            {detail && <span className="mt-1 block break-words text-xs text-muted-foreground">{detail}</span>}
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

const hasNumericValue = (value) => value !== null
    && value !== undefined
    && String(value).trim() !== ''
    && Number.isFinite(Number(value));

const getAvailableCurrency = (wallet) => {
    const currency = typeof wallet?.currency === 'string' ? wallet.currency.trim().toUpperCase() : '';
    if (!currency) return null;

    try {
        new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(0);
        return currency;
    } catch {
        return null;
    }
};

const matchesDateRange = (value, range = {}) => {
    if (!range.start && !range.end) return true;
    const time = new Date(value || '').getTime();
    if (Number.isNaN(time)) return false;
    const start = range.start ? new Date(`${range.start}T00:00:00`).getTime() : null;
    const end = range.end ? new Date(`${range.end}T23:59:59.999`).getTime() : null;
    return (start === null || time >= start) && (end === null || time <= end);
};

const hasWalletFilters = (filters = {}) => Object.entries(filters).some(([key, value]) => {
    if (key === 'dateRange') return Boolean(value?.start || value?.end);
    return Boolean(value && value !== 'all');
});

const matchesWalletActivity = ({ item, activeTab, filters, normalizedSearch }) => {
    if (!matchesDateRange(item.created_at, filters?.dateRange)) return false;

    if (activeTab === 'ledger') {
        const transactionType = String(item.transaction_type || '').toLowerCase();
        if (filters?.transactionType && filters.transactionType !== 'all' && transactionType !== filters.transactionType) return false;
        if (!normalizedSearch) return true;
        return [
            item.id,
            item.description,
            item.transaction_type,
            item.reference_id,
            item.external_reference,
            item.amount,
        ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    }

    const status = String(item.status || '').toLowerCase();
    const paymentMethod = String(item.payment_method || '').toLowerCase();
    if (filters?.status && filters.status !== 'all' && status !== filters.status) return false;
    if (filters?.paymentMethod && filters.paymentMethod !== 'all' && paymentMethod !== filters.paymentMethod) return false;
    if (!normalizedSearch) return true;
    return [
        item.id,
        item.display_id,
        item.emergency_request_id,
        item.payment_method,
        item.status,
        item.amount,
        item.user_details?.first_name,
        item.user_details?.last_name,
        item.user_details?.email,
        item.user_details?.phone,
        item.emergency_requests?.service_type,
        item.emergency_requests?.hospitals?.name,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
};

const getPaymentSignal = ({ loadError, hasLoaded, wallet, ledger, payments }) => {
    const loadedCount = ledger.length + payments.length;

    if (loadError && !hasLoaded) {
        return {
            icon: AlertCircle,
            tone: 'danger',
            label: 'Load failed',
            headline: 'Payments did not load',
            subhead: 'No payment totals are shown. Try again from the activity list.',
        };
    }

    if (loadError) {
        return {
            icon: AlertCircle,
            tone: 'warning',
            label: 'Refresh failed',
            headline: 'Showing the most recent payment records',
            subhead: 'The latest refresh failed, so visible values may be out of date.',
        };
    }

    if (!wallet && loadedCount === 0) {
        return {
            icon: Wallet,
            tone: 'muted',
            label: 'No payment activity',
            headline: 'No payment records are available',
            subhead: 'This account has no wallet, transactions, or patient payments available.',
        };
    }

    return {
        icon: ShieldCheck,
        tone: 'success',
        label: 'Payment activity',
        headline: `${loadedCount} payment record${loadedCount === 1 ? '' : 's'} available`,
        subhead: 'Review transactions and patient payments. Money changes are unavailable.',
    };
};

const PaymentsDesktopWorkspace = ({
    loading,
    wallet,
    ledger,
    payments,
    paymentMethods,
    readState,
    financeMetrics,
    financeMetricsStale,
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
    search,
    onSearchCommit,
    filters,
    filterSheetOpen,
    onOpenFilters,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [focusedId, setFocusedIdState] = useState(searchParams.get('id'));
    const listScrollRef = useRef(null);
    const { routingPath, handleRailNavigate } = useWayfindingNav();
    const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);
    const signal = getPaymentSignal({ loadError, hasLoaded, wallet, ledger, payments });
    const rawItems = activeTab === 'ledger' ? ledger : payments;
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const filtersActive = hasWalletFilters(filters);
    const isNarrowed = Boolean(normalizedSearch) || filtersActive;
    const activeItems = useMemo(() => rawItems
        .filter((item) => matchesWalletActivity({ item, activeTab, filters, normalizedSearch }))
        .sort((left, right) => {
            const leftTime = new Date(left.created_at || 0).getTime();
            const rightTime = new Date(right.created_at || 0).getTime();
            return sortConfig.direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
        }), [activeTab, filters, normalizedSearch, rawItems, sortConfig.direction]);
    const focusedEntry = activeItems.find((item) => item.id === focusedId) || null;
    const failedEmpty = Boolean(loadError) && rawItems.length === 0;
    const itemNoun = activeTab === 'ledger' ? 'transactions' : 'patient payments';
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
    const {
        selectedIds,
        handleSelectClick,
        handleToggleSelect,
        handleSelectAll,
        clearSelection,
        allSelected,
        someSelected,
    } = useRowSelection(activeItems);

    useEffect(() => {
        clearSelection();
    }, [activeTab, clearSelection, filters, normalizedSearch, pagination.currentPage]);

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
        clearSelection();
        setActiveTab(tab);
        setFocusedIdState(null);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tab);
        nextParams.delete('id');
        setSearchParams(nextParams, { replace: true });
    }, [clearSelection, searchParams, setActiveTab, setSearchParams]);

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
        <>
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
                        paymentMethods={paymentMethods}
                        readState={readState}
                        financeMetrics={financeMetrics}
                        financeMetricsStale={financeMetricsStale}
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
                <PaymentsMetrics
                    loading={loading}
                    wallet={wallet}
                    readState={readState}
                    financeMetrics={financeMetrics}
                    financeMetricsStale={financeMetricsStale}
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
                        search={search}
                        onSearchCommit={onSearchCommit}
                        filters={filters}
                        filterSheetOpen={filterSheetOpen}
                        onOpenFilters={onOpenFilters}
                    />
                )}
                errorBanner={loadError && !failedEmpty ? (
                    <ErrorBanner
                        title="Payments refresh failed"
                        message={`${loadError} Current rows remain visible and may be out of date.`}
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
                            <PaymentsListHeader
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                allSelected={allSelected}
                                someSelected={someSelected}
                                onSelectAll={handleSelectAll}
                            />
                            {activeItems.length === 0 && (
                                <EmptyState
                                    icon={History}
                                    heading={isNarrowed
                                        ? `No matching ${activeTab === 'ledger' ? 'transactions' : 'patient payments'}`
                                        : activeTab === 'ledger' ? 'No transactions available' : 'No patient payments available'}
                                    body={isNarrowed
                                        ? 'Change your search or filters.'
                                        : 'No records are available in this tab for the current account.'}
                                />
                            )}
                            {activeItems.map((item) => (
                                <PaymentRow
                                    key={item.id}
                                    item={item}
                                    activeTab={activeTab}
                                    selected={focusedEntry?.id === item.id}
                                    checked={selectedIds.includes(item.id)}
                                    onFocus={() => setFocusedId(item.id)}
                                    onOpen={() => handleOpen(item)}
                                    onToggleSelect={handleToggleSelect}
                                    onSelectClick={handleSelectClick}
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
            <BulkActionBar selectedCount={selectedIds.length} onClear={clearSelection}>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled
                    className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground disabled:opacity-50"
                    title="Bulk payment actions are unavailable"
                    aria-label="Bulk payment actions are unavailable"
                >
                    <LockKeyhole className="h-5 w-5" />
                </Button>
            </BulkActionBar>
        </>
    );
};

const PaymentsMetrics = ({
    loading,
    wallet,
    readState,
    financeMetrics,
    financeMetricsStale,
}) => {
    const currency = getAvailableCurrency(wallet);
    const balanceAvailable = ['ready', 'stale'].includes(readState?.wallet)
        && currency
        && hasNumericValue(wallet?.balance);
    const ledgerTotalsAvailable = ['ready', 'stale'].includes(readState?.financeMetrics)
        && financeMetrics?.complete === true
        && Boolean(currency)
        && hasNumericValue(financeMetrics?.credits)
        && hasNumericValue(financeMetrics?.debits);
    const metrics = [
        {
            id: 'balance',
            label: 'Balance',
            value: balanceAvailable ? formatCompactCurrency(wallet.balance, currency) : '',
            icon: Wallet,
            toneClass: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
            priority: 0,
            available: Boolean(balanceAvailable),
        },
        {
            id: 'credits',
            label: 'Credits',
            value: ledgerTotalsAvailable ? formatCompactCurrency(financeMetrics.credits, currency) : '',
            icon: ArrowDownLeft,
            toneClass: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
            priority: 1,
            available: ledgerTotalsAvailable,
        },
        {
            id: 'debits',
            label: 'Debits',
            value: ledgerTotalsAvailable ? formatCompactCurrency(financeMetrics.debits, currency) : '',
            icon: ArrowUpRight,
            toneClass: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06] dark:text-slate-200',
            priority: 2,
            available: ledgerTotalsAvailable,
        },
    ];

    const scopeLabel = ledgerTotalsAvailable
        ? financeMetricsStale ? 'Last confirmed ledger totals' : financeMetrics.scopeLabel
        : 'Ledger totals unavailable for this account';

    return (
        <div>
            <MetricStrip
                items={metrics}
                loading={loading}
                max={3}
                dataAttr="data-payment-metric"
            />
            {!loading && <p className="mt-2 text-[11px] font-medium text-muted-foreground">{scopeLabel}</p>}
        </div>
    );
};

const PaymentsToolbar = ({
    activeTab,
    setActiveTab,
    loading,
    isFetching,
    onRefresh,
    search,
    onSearchCommit,
    filters,
    filterSheetOpen,
    onOpenFilters,
}) => (
    <div className="space-y-3">
        <div
            className="grid max-w-lg grid-cols-2 gap-1 rounded-inner bg-muted/30 p-1"
            role="tablist"
            aria-label="Payment activity source"
        >
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
                        role="tab"
                        onClick={() => setActiveTab(item.id)}
                        className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-button px-3 text-sm font-semibold transition-all active:scale-[0.98] ${active ? 'bg-background text-foreground shadow-sm dark:bg-white/[0.10]' : 'text-muted-foreground hover:text-foreground'}`}
                        aria-selected={active}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
        <SheetToolbar
            searchValue={search}
            onSearchCommit={onSearchCommit}
            searchPlaceholder={activeTab === 'ledger' ? 'Search transactions...' : 'Search patient payments...'}
            searchTestId="payments-sheet-search"
            onRefresh={onRefresh}
            refreshing={loading || isFetching}
            refreshNoun="payments"
            onOpenFilters={onOpenFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasWalletFilters(filters)}
        />
    </div>
);

const PAYMENT_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(180px,1.35fr)_minmax(110px,0.75fr)_minmax(110px,0.8fr)_108px_124px_78px]';

const PaymentsListHeader = ({ sortConfig, onSort, allSelected, someSelected, onSelectAll }) => (
    <div className={`grid ${PAYMENT_GRID_COLS_SELECT} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
        <Checkbox
            checked={someSelected ? 'indeterminate' : allSelected}
            onCheckedChange={onSelectAll}
            onClick={(event) => event.stopPropagation()}
            aria-label={allSelected ? 'Clear payment selection' : 'Select all visible payment records'}
            className="h-4 w-4"
        />
        <span>Activity</span>
        <span>Status</span>
        <span>Facility</span>
        <SortableColumnHeader label="Time" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
        <span className="text-right">Amount</span>
        <span className="justify-self-end text-right">Action</span>
    </div>
);

const PaymentRow = ({
    item,
    activeTab,
    selected,
    checked,
    onFocus,
    onOpen,
    onToggleSelect,
    onSelectClick,
    formatCurrency,
    formatPaymentMethod,
    formatPaymentDescription,
}) => {
    const isPayment = activeTab === 'payments';
    const paymentStatus = String(item.status || '').toLowerCase();
    const transactionType = String(item.transaction_type || '').toLowerCase();
    const isCredit = isPayment ? paymentStatus === 'completed' : transactionType === 'credit';
    const Icon = isPayment ? CreditCard : isCredit ? ArrowDownLeft : ArrowUpRight;
    const amountPrefix = !isPayment ? (isCredit ? '+' : '-') : '';
    const label = isPayment ? formatPaymentMethod(item) : titleCase(item.transaction_type || 'transaction');
    const description = isPayment ? formatPaymentDescription(item) : item.description || 'Transaction';
    const subline = isPayment
        ? item.emergency_requests?.hospitals?.name || `ID: ${item.id?.slice(0, 8) || 'payment'}`
        : `Ref: ${item.reference_id?.slice(0, 8) || 'N/A'}`;
    const tone = isPayment
        ? paymentStatus === 'completed'
            ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-100'
            : ['failed', 'declined'].includes(paymentStatus)
                ? 'bg-destructive/10 text-destructive'
                : paymentStatus === 'refunded'
                    ? 'bg-sky-500/12 text-sky-700 dark:text-sky-100'
                    : 'bg-amber-500/12 text-amber-700 dark:text-amber-100'
        : isCredit ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-100' : 'bg-foreground/[0.055] text-muted-foreground';
    const statusTone = isPayment
        ? paymentStatus === 'completed'
            ? paymentToneClass.success
            : ['failed', 'declined'].includes(paymentStatus)
                ? paymentToneClass.danger
                : paymentStatus === 'refunded'
                    ? paymentToneClass.info
                    : paymentToneClass.warning
        : isCredit ? paymentToneClass.success : paymentToneClass.muted;

    return (
        <ListRowShell
            id={item.id}
            dataAttrName="data-payment-row"
            gridCols={PAYMENT_GRID_COLS_SELECT}
            selected={selected}
            onFocus={onFocus}
            onOpen={onOpen}
        >
            <Checkbox
                checked={checked}
                onCheckedChange={(value) => onToggleSelect(item.id, value)}
                onClick={(event) => {
                    onSelectClick(event);
                    event.stopPropagation();
                }}
                aria-label={checked ? `Deselect ${description}` : `Select ${description}`}
                className="h-4 w-4"
            />
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
                <StatusPill label={label} className={statusTone} />
            </div>

            <div className="truncate text-sm font-medium text-muted-foreground">
                {isPayment ? item.emergency_requests?.hospitals?.name || 'Facility unavailable' : 'Account wallet'}
            </div>

            <div className="text-sm font-medium text-muted-foreground">{formatDate(item.created_at)}</div>

            <div className="text-right">
                <div className="text-base font-semibold text-foreground">
                    {amountPrefix} {formatCurrency(Math.abs(Number(item.amount || 0)), isPayment ? item.currency : undefined)}
                </div>
                <div className="mt-1 text-[11px] font-medium text-muted-foreground">{formatTime(item.created_at)}</div>
            </div>

            <span className="justify-self-end inline-flex h-9 items-center gap-1 rounded-pill bg-background/45 px-3 text-xs font-semibold text-muted-foreground shadow-sm transition-all group-hover:bg-foreground group-hover:text-background">
                {isPayment ? 'Receipt' : 'Details'}
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
    paymentMethods,
    readState,
    financeMetrics,
    financeMetricsStale,
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
    const paymentStatus = String(entry?.status || '').toLowerCase();
    const transactionType = String(entry?.transaction_type || '').toLowerCase();
    const isCredit = isPayment ? paymentStatus === 'completed' : transactionType === 'credit';
    const statusLabel = entry
        ? isPayment ? titleCase(entry.status || 'unknown') : titleCase(entry.transaction_type || 'transaction')
        : 'No selection';
    const statusTone = entry
        ? isPayment
            ? ['failed', 'declined'].includes(paymentStatus)
                ? paymentToneClass.danger
                : isCredit
                    ? paymentToneClass.success
                    : paymentStatus === 'refunded'
                        ? paymentToneClass.info
                        : paymentToneClass.warning
            : isCredit ? paymentToneClass.success : paymentToneClass.muted
        : paymentToneClass.muted;
    const description = entry
        ? isPayment ? formatPaymentDescription(entry) : entry.description || 'Transaction'
        : 'No record selected';
    const amount = entry
        ? formatCurrency(Math.abs(Number(entry.amount || 0)), isPayment ? entry.currency : undefined)
        : 'Not selected';
    const facilityLabel = isPayment
        ? entry?.emergency_requests?.hospitals?.name || 'Facility unavailable'
        : 'Account wallet';
    const currency = getAvailableCurrency(wallet);
    const ledgerTotalsAvailable = ['ready', 'stale'].includes(readState?.financeMetrics)
        && financeMetrics?.complete === true
        && Boolean(currency);
    const ledgerScopeLabel = ledgerTotalsAvailable
        ? financeMetricsStale ? 'Last confirmed ledger totals' : financeMetrics.scopeLabel
        : 'Ledger totals unavailable';

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
                    <DetailLine icon={Building} label="Facility" value={facilityLabel} />
                    <DetailLine icon={isPayment ? CreditCard : History} label={isPayment ? 'Method' : 'Reference'} value={isPayment ? titleCase(formatPaymentMethod(entry)) : entry.reference_id || 'Not available'} />
                </div>
            ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-card bg-muted/18 p-6 text-center">
                    <Info className="mb-3 h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No record selected</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose a row to see its payment details.</p>
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
                    <p className="mt-1 text-2xl font-semibold">{wallet ? formatCurrency(wallet.balance) : 'Not available'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Showing {ledgerCount} transactions and {paymentsCount} patient payments, up to 50 in each tab.</p>
                </div>
                <div className="rounded-card bg-background/35 p-4 dark:bg-black/[0.08]">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-inner bg-foreground/[0.045] p-3 dark:bg-white/[0.055]">
                            <p className="text-[11px] font-semibold text-muted-foreground">Credits</p>
                            <p className="mt-1 text-sm font-semibold">{ledgerTotalsAvailable ? formatCurrency(financeMetrics.credits) : 'Unavailable'}</p>
                        </div>
                        <div className="rounded-inner bg-foreground/[0.045] p-3 dark:bg-white/[0.055]">
                            <p className="text-[11px] font-semibold text-muted-foreground">Debits</p>
                            <p className="mt-1 text-sm font-semibold">{ledgerTotalsAvailable ? formatCurrency(financeMetrics.debits) : 'Unavailable'}</p>
                        </div>
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground">{ledgerScopeLabel}</p>
                </div>
                <div className="rounded-inner bg-muted/22 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Saved cards</p>
                    <p className="mt-1 text-sm font-semibold">{readState?.paymentMethods === 'ready' ? paymentMethods.length : 'Unavailable'}</p>
                </div>
            </div>

            <div className="mt-5 rounded-card bg-amber-500/10 p-4 text-amber-800 dark:text-amber-100">
                <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold">Money changes unavailable</p>
                        <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-100/75">Add funds, withdrawals, and card changes are not available for this account.</p>
                    </div>
                </div>
            </div>
        </DetailRailShell>
    );
};
