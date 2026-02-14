import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    Filter,
    Download,
    CreditCard,
    Building,
    ShieldCheck,
    MoreVertical,
    ExternalLink,
    ChevronRight,
    TrendingUp,
    History
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export const WalletManagementPage = () => {
    const { user, profile, isAdmin, isOrgAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [activeTab, setActiveTab] = useState('history');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Wallet Balance
            if (isAdmin()) {
                const { data: mainWallet } = await supabase.from('ivisit_main_wallet').select('*').single();
                setWallet(mainWallet);
            } else if (isOrgAdmin()) {
                const { data: orgWallet } = await supabase.from('organization_wallets')
                    .select('*')
                    .eq('organization_id', profile.organization_id)
                    .single();
                setWallet(orgWallet);
            }

            // 2. Fetch Ledger History
            let query = supabase.from('wallet_ledger').select('*');

            if (isOrgAdmin()) {
                query = query.eq('organization_id', profile.organization_id);
            }

            const { data: ledgerData, error } = await query.order('created_at', { ascending: false }).limit(50);

            if (error) throw error;
            setLedger(ledgerData || []);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
            toast.error('Failed to load wallet information');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, isOrgAdmin, profile.organization_id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const headerActions = useMemo(() => (
        <div className="flex gap-2">
            <Button
                variant="outline"
                onClick={() => toast.info('Exporting...')}
                className="glass-card h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
            >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
            </Button>
            <Button
                onClick={() => toast.success('Withdrawal requested')}
                className="glass-card-premium h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
            >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw Funds
            </Button>
        </div>
    ), []);

    usePageHeader('Wallet & Billing', headerActions);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet?.currency || 'USD' }).format(amount || 0);
    };

    return (
        <div className="min-h-screen pb-20 pt-4">

            {/* Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <Card className="lg:col-span-2 p-8 bg-black border-none shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Available Balance</p>
                            <h2 className="text-6xl font-black tracking-tighter text-white mb-4">
                                {formatCurrency(wallet?.balance)}
                            </h2>
                            <div className="flex items-center gap-3">
                                <Badge className="bg-success text-white border-none py-1 px-3 rounded-full text-[10px] font-black tracking-widest uppercase">
                                    ACTIVE
                                </Badge>
                                <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                                    <Clock className="w-3.5 h-3.5" />
                                    Last Updated: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleTimeString() : 'Just now'}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="w-full md:w-64 p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Projected (30d)</p>
                                    <p className="text-xl font-bold text-white tracking-tight">+ $4,250.00</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Liquid background effect */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-success/10 rounded-full blur-[80px] pointer-events-none" />
                </Card>

                <Card className="p-8 glass-card-premium border-none shadow-2xl flex flex-col justify-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-inner">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Stripe Payouts</p>
                            <h4 className="font-bold text-lg tracking-tight">Connected Account</h4>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 flex items-center justify-between group cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="text-sm font-semibold tracking-tight">Account Active</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                        </div>

                        <Button className="w-full py-6 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold tracking-widest uppercase text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Withdrawal Settings
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Transaction History */}
            <h3 className="text-2xl font-black tracking-tighter mb-6 flex items-center gap-3 px-2">
                <History className="w-6 h-6 text-primary" />
                Transaction Ledger
            </h3>

            <Card className="glass-card-premium border-none shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-muted/30">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Type</th>
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
                            ) : ledger.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <History className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">No activities recorded yet</p>
                                    </td>
                                </tr>
                            ) : (
                                ledger.map((item) => (
                                    <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-6 py-6 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.transaction_type === 'credit' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                                                    }`}>
                                                    {item.transaction_type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest">
                                                    {item.transaction_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div>
                                                <p className="text-sm font-bold tracking-tight text-foreground">{item.description}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-tighter font-mono">{item.reference_type} ref: {item.reference_id?.slice(0, 8)}</p>
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
                                            <span className={`text-lg font-black tracking-tighter ${item.transaction_type === 'credit' ? 'text-success' : 'text-foreground'
                                                }`}>
                                                {item.transaction_type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(item.amount))}
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
    );
};
