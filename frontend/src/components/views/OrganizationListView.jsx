import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Edit,
    Trash2,
    Building2,
    Mail,
    Wallet,
    Activity,
    Shield
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
                    <div className="h-full rounded-card glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col">
                        <div className={`hover-glow ${org.is_active ? 'hover-glow-primary' : 'hover-glow-destructive'}`} />

                        <div className="flex justify-between items-start mb-6 relative z-10 transition-colors duration-300">
                            <Badge className={`rounded-pill px-2.5 py-1 ${org.is_active ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                <div className="flex items-center gap-1.5 uppercase tracking-widest font-black text-[9px]">
                                    {org.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </div>
                            </Badge>
                            <div className="w-10 h-10 rounded-icon bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                <Building2 className="h-5 w-5" />
                            </div>
                        </div>

                        <h3 className="font-bold text-xl mb-1 tracking-tighter relative z-10 truncate">
                            {org.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">
                            <Mail className="w-3 h-3" />
                            {org.contact_email || 'NO_CONTACT_DEFINED'}
                        </div>

                        <div className="space-y-3 mb-8 relative z-10">
                            <div className="flex items-center justify-between p-3 rounded-inner bg-muted/20">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fee Rate</span>
                                <Badge className="rounded-pill bg-primary/10 text-primary font-black text-xs px-3">
                                    {org.ivisit_fee_percentage}%
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-inner bg-primary/5">
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Liquid Wallet</span>
                                </div>
                                <span className={`font-black tracking-tighter ${org.wallet_balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(org.wallet_balance)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-pill ${org.stripe_account_id ? 'bg-success animate-pulse' : 'bg-muted-foreground/30'}`} />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                    {org.stripe_account_id ? 'STRIPE_LIVE' : 'WAITING_INTEGRATION'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(org)}
                                    className="rounded-icon h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary"
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
