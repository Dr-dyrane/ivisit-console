import React from 'react';
import {
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    CreditCard,
    ShieldCheck,
    Download,
    History,
    AlertCircle,
    LockKeyhole,
} from 'lucide-react';

export const WalletPanel = ({ walletContext }) => {
    const {
        wallet = null,
        ledger = [],
        payments = [],
        projection = 0,
        paymentMethods = [],
        counts = {},
        loading = false,
        isFetching = false,
        loadError = '',
        hasLoaded = false,
        roleLabel = 'Hospital admin',
    } = walletContext || {};
    const [panelStatus, setPanelStatus] = React.useState('');

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: wallet?.currency || 'USD',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const announce = (message) => {
        setPanelStatus(message);
        window.setTimeout(() => setPanelStatus(''), 2200);
    };

    const handleTopUp = () => {
        announce('Add funds is unavailable until the payment consequence is proved.');
    };

    const handleWithdraw = () => {
        announce('Withdraw is unavailable until the payout consequence is proved.');
    };

    const handleCards = () => {
        announce('Card changes are unavailable until setup authority is proved.');
    };

    const handleExport = () => {
        if (!ledger.length) {
            announce('No transactions to export yet.');
            return;
        }

        announce('Exporting transactions.');
        window.dispatchEvent(new CustomEvent('exportLedger'));
    };

    const recentActivity = [...ledger.slice(0, 3), ...payments.slice(0, 2)].slice(0, 4);
    const cardState = `${paymentMethods.length} returned`;
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
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Available balance</p>
                    <h2 className="text-4xl font-semibold tracking-tight text-foreground">
                        {balanceLabel}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-pill bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-100">
                            {loading ? 'Loading' : isFetching ? 'Updating' : loadError ? 'Saved results' : 'Current read'}
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
                        <p className="text-sm font-semibold tracking-tight">{formatCurrency(projection || 0)}</p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-inner bg-muted/24 p-4 transition-colors hover:bg-muted/34">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-emerald-700 transition-transform dark:text-emerald-100" />
                            <span className="text-xs font-medium text-muted-foreground">Cards returned</span>
                        </div>
                        <p className="text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-100">{cardState}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="ml-1 text-sm font-semibold text-muted-foreground">Panel actions</h3>
                <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleTopUp}
                    aria-disabled="true"
                    className="flex h-14 items-center justify-center gap-2 rounded-inner bg-muted/28 text-muted-foreground transition-all hover:bg-muted/38 active:scale-[0.96]"
                >
                    <LockKeyhole className="h-5 w-5 transition-transform" />
                    <span className="text-sm font-semibold">Add funds</span>
                </button>
                <button
                    onClick={handleWithdraw}
                    aria-disabled="true"
                    className="flex h-14 items-center justify-center gap-2 rounded-inner bg-muted/28 transition-all hover:bg-muted/38 active:scale-[0.96]"
                >
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform" />
                    <span className="text-sm font-semibold">Withdraw</span>
                </button>
                <button
                    onClick={handleCards}
                    aria-disabled="true"
                    className="flex h-14 items-center justify-center gap-2 rounded-inner bg-muted/28 transition-all hover:bg-muted/38 active:scale-[0.96]"
                >
                    <CreditCard className="h-5 w-5 text-muted-foreground transition-transform" />
                    <span className="text-sm font-semibold">Manage cards</span>
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
                    {panelStatus || 'Money and card changes are unavailable pending authority proof.'}
                </p>
            </div>

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
                    </div>
                    <div className="rounded-inner bg-muted/22 p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Patient payments loaded</p>
                        <p className="mt-1 text-xl font-semibold">{patientPaymentsCount}</p>
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
                                {!isPatientPayment && (isCredit ? '+' : '-')} {formatCurrency(Math.abs(item.amount))}
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

            <div className="flex items-center gap-3 rounded-card bg-muted/24 p-4">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold">{cardState}</p>
                    <p className="truncate text-xs leading-tight text-muted-foreground">Read-only provider response</p>
                </div>
            </div>
        </div>
    );
};
