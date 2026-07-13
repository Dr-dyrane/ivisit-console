import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { runWalletRead } from './query';

// PULLBACK NOTE: Payments truth projection
// OLD: Payment KPIs summed whichever ledger rows happened to be loaded by the page.
// NEW: Totals publish only after an exact, bounded, stable scan of the full wallet ledger.
const LEDGER_METRIC_PAGE_SIZE = 1000;
const LEDGER_METRIC_MAX_ROWS = 10000;

const getExactLedgerCount = async (walletId) => {
    const { count } = await runWalletRead(() => supabase
        .from('wallet_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('wallet_id', walletId));
    const numericCount = Number(count);

    if (count === null || count === undefined || !Number.isSafeInteger(numericCount) || numericCount < 0) {
        throw new Error('Wallet ledger count is unavailable.');
    }

    return numericCount;
};

export const getWalletLedgerPreview = async (walletId, limit = 50) => {
    if (!isValidUUID(walletId)) {
        return { rows: [], totalCount: null };
    }

    const safeLimit = Math.max(1, Number(limit) || 50);
    const { data, count } = await runWalletRead(() => supabase
        .from('wallet_ledger')
        .select('*', { count: 'exact' })
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(safeLimit));

    return {
        rows: data || [],
        totalCount: count !== null && count !== undefined && Number.isSafeInteger(Number(count))
            ? Number(count)
            : null,
    };
};

export const getWalletLedgerMetrics = async ({
    walletId,
    pageSize = LEDGER_METRIC_PAGE_SIZE,
    maxRows = LEDGER_METRIC_MAX_ROWS,
} = {}) => {
    if (!isValidUUID(walletId)) {
        throw new Error('Wallet scope is unavailable.');
    }

    const requestedPageSize = Number(pageSize);
    const requestedMaxRows = Number(maxRows);
    const safePageSize = Math.min(1000, Math.max(
        1,
        Number.isSafeInteger(requestedPageSize) ? requestedPageSize : LEDGER_METRIC_PAGE_SIZE,
    ));
    const safeMaxRows = Math.max(
        safePageSize,
        Number.isSafeInteger(requestedMaxRows) && requestedMaxRows > 0
            ? requestedMaxRows
            : LEDGER_METRIC_MAX_ROWS,
    );
    const expectedCount = await getExactLedgerCount(walletId);

    if (expectedCount > safeMaxRows) {
        throw new Error('Wallet ledger is too large for a complete browser projection.');
    }

    let processedCount = 0;
    let credits = 0;
    let debits = 0;
    let creditCount = 0;
    let debitCount = 0;

    while (processedCount < expectedCount) {
        const pageLength = Math.min(safePageSize, expectedCount - processedCount);
        const { data } = await runWalletRead(() => supabase
            .from('wallet_ledger')
            .select('amount, transaction_type')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(processedCount, processedCount + pageLength - 1));
        const rows = data || [];

        if (rows.length !== pageLength) {
            throw new Error('Wallet ledger changed before totals could be confirmed.');
        }

        rows.forEach((row) => {
            const transactionType = String(row?.transaction_type || '').trim().toLowerCase();
            if (transactionType !== 'credit' && transactionType !== 'debit') return;

            const amount = Number(row?.amount);
            if (!Number.isFinite(amount)) {
                throw new Error('Wallet ledger contains an invalid amount.');
            }

            if (transactionType === 'credit') {
                credits += Math.abs(amount);
                creditCount += 1;
                return;
            }

            debits += Math.abs(amount);
            debitCount += 1;
        });

        processedCount += rows.length;
    }

    const confirmedCount = await getExactLedgerCount(walletId);
    if (confirmedCount !== expectedCount || processedCount !== expectedCount) {
        throw new Error('Wallet ledger changed before totals could be confirmed.');
    }

    return {
        basis: 'complete_wallet_ledger_scan',
        scope: 'all_recorded_wallet_entries',
        scopeLabel: 'All recorded ledger entries',
        complete: true,
        rowCount: expectedCount,
        credits,
        debits,
        creditCount,
        debitCount,
    };
};

const protectCsvFormula = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    const text = value === null || value === undefined ? '' : String(value);
    return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
};

const escapeCsvCell = (value) => `"${protectCsvFormula(value).replace(/"/g, '""')}"`;

const formatLedgerCsvDate = (value) => {
    const date = new Date(value || '');
    return Number.isNaN(date.getTime()) ? value || '' : date.toISOString();
};

export const buildLoadedLedgerCsv = ({ ledger = [], currency = 'USD' } = {}) => {
    const rows = [
        ['Date', 'Type', 'Description', 'Amount', 'Currency'],
        ...ledger.map((entry) => [
            formatLedgerCsvDate(entry?.created_at),
            entry?.transaction_type || '',
            entry?.description || '',
            entry?.amount ?? '',
            String(currency || 'USD').toUpperCase(),
        ]),
    ];

    return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
};
