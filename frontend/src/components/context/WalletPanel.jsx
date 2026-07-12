import React from 'react';
import {
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    BarChart3,
    CreditCard,
    Download,
    History,
    AlertCircle,
    Plus,
    LockKeyhole,
} from 'lucide-react';

export const WalletPanel = ({ walletContext }) => {
    const {
        wallet = null,
        ledger = [],
        payments = [],
        projection = 0,
        paymentMethods = [],
        readState = {},
        hasMore = {},
        counts = {},
        loading = false,
        isFetching = false,
        loadError = '',
        hasLoaded = false,
        roleLabel = 'Hospital admin',
        canManage = false,
    } = walletContext || {};
    const [panelStatus, setPanelStatus] = React.useState('');

    const formatCurrency = (amount, currency = wallet?.currency || 'USD') => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: String(currency || wallet?.currency || 'USD').toUpperCase(),
                maximumFractionDigits: 0
            }).format(amount || 0);
        } catch {
            return 'Amount unavailable';
        }
    };

    const announce = (message) => {
        setPanelStatus(message);
        window.setTimeout(() => setPanelStatus(''), 2200);
    };

    const handleExport = () => {
        if (!ledger.length) {
            announce('No transactions to export yet.');
            return;
        }

        announce('Exporting transactions.');
        window.dispatchEvent(new CustomEvent('exportLedger'));
    };

    const handleStats = () => {
        announce('Opening loaded payment statistics.');
        window.dispatchEvent(new CustomEvent('openWalletAnalytics'));
    };

    const recentActivity = [...ledger.slice(0, 3), ...payments.slice(0, 2)].slice(0, 4);
    const cardState = readState.paymentMethods === 'ready' ? `${paymentMethods.length} returned` : 'Unavailable';
    const balanceLabel = wallet ? formatCurrency(wallet.balance) : loading ? 'Loading' : 'Not returned';
    const transactionsCount = counts.ledger ?? ledger.length;
    const patientPaymentsCount = counts.payments ?? payments.length;

    return (
        <div className="space-y-4">
            {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
            {loadError && (
                <div className="flex items-start gap-3 rounded-card bg-destructive/10 p-4" role="alert">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive/75" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold">Payments refresh failed</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {hasLoaded ? 'Showing preserved loaded records.' : 'No financial values are being inferred.'}
                        </p>
                    </div>
                </div>
            )}
            <div className="space-y-3">
                <h3 className="ml-1 text-sm font-semibold text-muted-foreground">Payments overview</h3>
                <div className="relative overflow-hidden rounded-card surface-card p-5 shadow-[0_4px_12px_rgb(0_0_0/0.07)]">
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Recorded balance</p>
                    <h2 className="text-4xl font-semibold tracking-tight text-foreground">
                        {balanceLabel}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-pill bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-100">
                            {loading ? 'Loading' : isFetching ? 'Updating' : loadError ? 'Saved results' : wallet ? 'Current read' : 'Unavailable'}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">{roleLabel}</span>
                    </div>
                </div>

                <div className="grid gap-2">
                    <div className="flex flex-col gap-1 rounded-inner bg-muted/24 p-4 transition-colors hover:bg-muted/34">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-sky-700 transition-transform dark:text-sky-100" />
                            <span className="text-xs font-medium text-muted-foreground">Projection returned</span>
                        </div>
                        <p className="text-sm font-semibold tracking-tight">
                            {readState.projection === 'ready' ? formatCurrency(projection || 0) : 'Unavailable'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-inner bg-muted/24 p-4 transition-colors hover:bg-muted/34">
                        <div className="flex items-center gap-2">
                            <History className="h-3.5 w-3.5 text-emerald-700 transition-transform dark:text-emerald-100" />
                            <span className="text-xs font-medium text-muted-foreground">Activity loaded</span>
                        </div>
                        <p className="text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-100">{transactionsCount + patientPaymentsCount}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="ml-1 text-sm font-semibold text-muted-foreground">Panel actions</h3>
                <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleStats}
                    className="flex h-14 items-center justify-center gap-2 rounded-inner bg-muted/28 text-muted-foreground transition-all hover:bg-muted/38 active:scale-[0.96]"
                >
                    <BarChart3 className="h-5 w-5 transition-transform" />
                    <span className="text-sm font-semibold">Stats</span>
                </button>
                <button
                    onClick={handleExport}
                    disabled={!ledger.length}
                    className="flex h-14 items-center justify-center gap-2 rounded-inner bg-muted/28 transition-all hover:bg-muted/38 active:scale-[0.96]"
                >
                    <Download className="h-5 w-5 text-muted-foreground transition-transform" />
                    <span className="text-sm font-semibold">Export</span>
                </button>
                </div>
                <p role="status" aria-live="polite" className="min-h-5 px-1 text-xs font-medium text-muted-foreground">
                    {panelStatus || 'Loaded records are read-only. Money and card changes remain unavailable.'}
                </p>
            </div>

            {canManage && (
                <div className="space-y-2">
                    <h3 className="ml-1 text-sm font-semibold text-muted-foreground">Wallet actions</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            disabled
                            aria-describedby="wallet-action-authority"
                            title="Add funds is unavailable until payment confirmation and wallet reflection are proved."
                            className="flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-inner bg-muted/20 px-2 text-muted-foreground opacity-55"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="text-center text-xs font-semibold leading-tight">Add funds</span>
                        </button>
                        <button
                            type="button"
                            disabled
                            aria-describedby="wallet-action-authority"
                            title="Withdraw is unavailable until balance reservation and payout reflection are proved."
                            className="flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-inner bg-muted/20 px-2 text-muted-foreground opacity-55"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="text-center text-xs font-semibold leading-tight">Withdraw</span>
                        </button>
                        <button
                            type="button"
                            disabled
                            aria-describedby="wallet-action-authority"
                            title="Payment cards are unavailable until organization authority is proved."
                            className="flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-inner bg-muted/20 px-2 text-muted-foreground opacity-55"
                        >
                            <CreditCard className="h-4 w-4" />
                            <span className="text-center text-xs font-semibold leading-tight">Payment cards</span>
                        </button>
                    </div>
                    <p id="wallet-action-authority" className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
                        <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        These historical commands remain locked until backend authority and reflected results are proved.
                    </p>
                </div>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-muted-foreground">Loaded route scope</h3>
                    <span className="rounded-pill bg-muted/28 px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {transactionsCount + patientPaymentsCount} loaded
                    </span>
                </div>

                <div className="grid gap-2">
                    <div className="rounded-inner bg-muted/22 p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Transactions loaded</p>
                        <p className="mt-1 text-xl font-semibold">{transactionsCount}</p>
                        {hasMore.ledger && <p className="mt-1 text-[10px] text-muted-foreground">More available on the page</p>}
                    </div>
                    <div className="rounded-inner bg-muted/22 p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Patient payments loaded</p>
                        <p className="mt-1 text-xl font-semibold">{patientPaymentsCount}</p>
                        {hasMore.payments && <p className="mt-1 text-[10px] text-muted-foreground">More available on the page</p>}
                    </div>
                    <div className="rounded-inner bg-muted/22 p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Cards returned</p>
                        <p className="mt-1 text-xl font-semibold">{paymentMethods.length}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="px-1 text-sm font-semibold text-muted-foreground">Recent loaded records</h3>
                <div className="space-y-1">
                    {recentActivity.map((item) => {
                        const isPatientPayment = Boolean(item.payment_method || item.emergency_request_id);
                        const isCredit = isPatientPayment ? item.status === 'completed' : item.transaction_type === 'credit';
                        const description = isPatientPayment
                            ? item.display_id || 'Patient payment'
                            : item.description || 'Transaction';

                        return (
                        <div key={item.id} className="flex items-center justify-between rounded-inner bg-muted/22 p-3 transition-all hover:bg-muted/34">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-icon ${isCredit ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-100' : 'bg-muted/20'}`}>
                                    {isPatientPayment ? <CreditCard className="h-4 w-4" /> : isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4 opacity-60" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold tracking-tight">{description}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-xs font-semibold ${isCredit ? 'text-emerald-700 dark:text-emerald-100' : ''}`}>
                                {!isPatientPayment && (isCredit ? '+' : '-')} {formatCurrency(Math.abs(item.amount), isPatientPayment ? item.currency : wallet?.currency)}
                            </span>
                        </div>
                    );
                    })}
                    {!recentActivity.length && (
                        <div className="rounded-card bg-muted/22 py-8 text-center">
                            <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
