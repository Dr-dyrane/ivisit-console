import React from 'react';
import { Button } from '../ui/button';
import {
    Edit,
    Trash2,
    Building2,
    Mail,
    Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';

export const OrganizationListView = ({ organizations, onView, onEdit, onDelete }) => {
    if (!organizations || organizations.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {organizations.map((org, index) => (
                <motion.div
                    key={org.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <div className="h-full rounded-card bg-card/70 p-6 group relative overflow-hidden flex flex-col">
                        <div className="flex justify-between items-start mb-6 relative z-10 transition-colors duration-300">
                            <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-bold text-[9px] ${org.is_active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' : 'bg-destructive/20 text-destructive'}`}>
                                {org.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <div className="w-10 h-10 rounded-icon bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform duration-300">
                                <Building2 className="h-5 w-5" />
                            </div>
                        </div>

                        <h3 className="font-bold text-xl mb-1 relative z-10 truncate">
                            {org.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground mb-6">
                            <Mail className="w-3 h-3" />
                            {org.contact_email || 'No contact defined'}
                        </div>

                        <div className="space-y-3 mb-8 relative z-10">
                            <div className="flex items-center justify-between p-3 rounded-inner bg-muted/20">
                                <span className="text-xs font-bold text-muted-foreground">Fee Rate</span>
                                <span className="inline-flex items-center rounded-pill bg-muted text-muted-foreground font-black text-xs px-3 py-0.5">
                                    {org.ivisit_fee_percentage}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-inner bg-muted">
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs font-bold text-muted-foreground">Liquid Wallet</span>
                                </div>
                                <span className={`font-black ${org.wallet_balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(org.wallet_balance)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-pill ${org.stripe_account_id ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                                <span className="text-[10px] font-black text-muted-foreground">
                                    {org.stripe_account_id ? 'STRIPE_LIVE' : 'WAITING_INTEGRATION'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(org)}
                                    className="rounded-icon h-9 w-9 p-0 hover:bg-muted hover:text-muted-foreground"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(org)}
                                    className="rounded-icon h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
