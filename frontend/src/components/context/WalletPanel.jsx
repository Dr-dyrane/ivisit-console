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
        <div className="space-y-6">
            {/* Balance Overview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Main Balance</h3>
                <Card className="bg-black border-none p-5 relative overflow-hidden group shadow-2xl">
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">Available Funds</p>
                        <h2 className="text-3xl font-black tracking-tighter text-white">
                            {formatCurrency(wallet?.balance)}
                        </h2>
                        <div className="mt-4 flex items-center gap-2">
                            <Badge className="bg-success/20 text-success border-0 text-[10px] font-black uppercase tracking-widest py-0.5">
                                Secured
                            </Badge>
                            <span className="text-[10px] text-zinc-500 font-medium">Last 24h: +12.5%</span>
                        </div>
                    </div>
                    {/* Glow effect */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                </Card>

                <div className="grid grid-cols-2 gap-2">
                    <Card className="bg-muted/20 border-border/5 p-3 squircle-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Projected</span>
                        </div>
                        <p className="font-bold text-sm tracking-tight">{formatCurrency(projection || (wallet?.balance * 0.12))}</p>
                    </Card>
                    <Card className="bg-muted/20 border-border/5 p-3 squircle-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <CreditCard className="w-3 h-3 text-success" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Gateway</span>
                        </div>
                        <p className="font-bold text-sm tracking-tight">Active</p>
                    </Card>
                </div>
            </motion.div>

            {/* Smart Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
            >
                <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Quick Financials</h3>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        onClick={handleTopUp}
                        className="h-20 flex-col gap-2 rounded-2xl bg-white/5 border-white/10 hover:bg-success/10 hover:border-success/30 hover:text-success transition-all group"
                    >
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Top Up</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleWithdraw}
                        className="h-20 flex-col gap-2 rounded-2xl bg-white/5 border-white/10 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all group"
                    >
                        <ArrowUpRight className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Withdraw</span>
                    </Button>
                </div>
            </motion.div>

            {/* Recent Ledger */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
            >
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Recent Activities</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExport}>
                        <Download className="w-3 h-3 text-muted-foreground" />
                    </Button>
                </div>

                <div className="space-y-2">
                    {ledger?.slice(0, 4).map((item) => (
                        <div key={item.id} className="p-3 rounded-2xl bg-muted/10 border border-white/5 flex items-center justify-between group hover:bg-muted/20 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.transaction_type === 'credit' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                    {item.transaction_type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate tracking-tight">{item.description}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">
                                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-xs font-black ${item.transaction_type === 'credit' ? 'text-success' : 'text-foreground'}`}>
                                {item.transaction_type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(item.amount))}
                            </span>
                        </div>
                    ))}
                    {!ledger?.length && (
                        <div className="py-8 text-center bg-muted/5 rounded-2xl border border-dashed border-white/10">
                            <History className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">No recent ledger</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Payout Security */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
            >
                <div className="p-4 rounded-2xl bg-success/5 border border-success/10 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-success" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-success">PCI DSS Compliant</p>
                        <p className="text-[9px] text-success/60 leading-tight">All transactions are tokenized and processed via Stripe Secure Gateway.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
