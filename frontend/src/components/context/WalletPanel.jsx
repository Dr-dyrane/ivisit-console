import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    CreditCard,
    History,
    ShieldCheck,
    Download,
    Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const WalletPanel = ({ walletData }) => {
    const { wallet, ledger, projection } = walletData;
    const { isAdmin } = useAuth();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: wallet?.currency || 'USD',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const handleTopUp = () => {
        window.dispatchEvent(new CustomEvent('openTopUpModal'));
    };

    const handleWithdraw = () => {
        window.dispatchEvent(new CustomEvent('openWithdrawModal'));
    };

    const handleExport = () => {
        window.dispatchEvent(new CustomEvent('exportLedger'));
    };

    return (
        <div className="space-y-4">
            {/* Balance Overview */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
            >
                <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Capital Assets</h3>
                <div className="bg-black p-6 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Available Funds</p>
                        <h2 className="text-4xl font-black tracking-tighter text-white">
                            {formatCurrency(wallet?.balance)}
                        </h2>
                        <div className="mt-4 flex items-center gap-2">
                            <Badge className="bg-success/20 text-success border-0 text-[10px] font-black uppercase tracking-widest py-0.5 rounded-full px-3">
                                Verified
                            </Badge>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Main Portfolio</span>
                        </div>
                    </div>
                    {/* Glow effect */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-[80px]" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-4 rounded-3xl flex flex-col gap-1 transition-colors hover:bg-white/10 group">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Yields</span>
                        </div>
                        <p className="font-bold text-sm tracking-tight">{formatCurrency(projection || (wallet?.balance * 0.12))}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl flex flex-col gap-1 transition-colors hover:bg-white/10 group">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-3 h-3 text-success group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
                        </div>
                        <p className="font-bold text-sm tracking-tight text-success">Linked</p>
                    </div>
                </div>
            </motion.div>

            {/* Smart Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-2"
            >
                <button
                    onClick={handleTopUp}
                    className="h-16 flex items-center justify-center gap-2 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all group"
                >
                    <Plus className="w-5 h-5 text-primary group-hover:rotate-90 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Inflow</span>
                </button>
                <button
                    onClick={handleWithdraw}
                    className="h-16 flex items-center justify-center gap-2 rounded-3xl bg-secondary/30 dark:bg-white/5 hover:bg-secondary/40 transition-all group"
                >
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Outflow</span>
                </button>
            </motion.div>

            {/* Recent Ledger */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
            >
                <div className="flex items-center justify-between px-1">
                    <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ledger</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40 hover:opacity-100" onClick={handleExport}>
                        <Download className="w-3 h-3" />
                    </Button>
                </div>

                <div className="space-y-1">
                    {ledger?.slice(0, 4).map((item) => (
                        <div key={item.id} className="p-3 rounded-2xl bg-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.transaction_type === 'credit' ? 'bg-success/10 text-success' : 'bg-muted/20'}`}>
                                    {item.transaction_type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4 opacity-60" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate tracking-tight">{item.description}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-xs font-black ${item.transaction_type === 'credit' ? 'text-success' : ''}`}>
                                {item.transaction_type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(item.amount))}
                            </span>
                        </div>
                    ))}
                    {!ledger?.length && (
                        <div className="py-8 text-center bg-white/5 rounded-[2rem] border-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Silent Balance</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Payout Security */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-3xl bg-success/5 flex items-center gap-3"
            >
                <ShieldCheck className="w-5 h-5 text-success" />
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-success">PCI Secure</p>
                    <p className="text-[9px] text-success/60 leading-tight truncate">Encrypted via Stripe Gateway</p>
                </div>
            </motion.div>
        </div>
    );
};
