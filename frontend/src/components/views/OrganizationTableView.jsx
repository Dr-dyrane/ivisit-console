import React from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import {
    Building2,
    Mail,
    Edit,
    Trash2,
    MoreHorizontal,
    Wallet,
    Globe,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(200px,2fr)_minmax(140px,1fr)_minmax(80px,0.6fr)_minmax(100px,0.7fr)_minmax(140px,1fr)_64px]';

export const OrganizationTableView = ({
    organizations,
    onView,
    onDelete,
    onEdit,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    if (!organizations || organizations.length === 0) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-card bg-background/30 overflow-hidden p-3">
                {/* Header row */}
                <div className={`grid ${GRID_TEMPLATE} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
                    <div className="flex items-center">
                        <Checkbox
                            checked={selectedIds.length === organizations.length && organizations.length > 0}
                            onCheckedChange={(checked) => onSelectAll(checked)}
                            aria-label="Select all"
                        />
                    </div>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Organization</span>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Wallet Balance</span>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Fee %</span>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Status</span>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Stripe Integrated</span>
                    <span className="justify-self-end font-semibold tracking-[0.14em] text-muted-foreground">Actions</span>
                </div>

                {/* Data rows */}
                {organizations.map((org, index) => {
                    const selected = selectedIds.includes(org.id);
                    return (
                        <motion.div
                            key={org.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.02 }}
                            className={`grid ${GRID_TEMPLATE} items-center gap-2 rounded-inner px-3 py-3 transition-colors ${selected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                        >
                            <div className="flex items-center">
                                <Checkbox
                                    checked={selected}
                                    onCheckedChange={(checked) => onSelect(org.id, checked)}
                                    aria-label={`Select organization ${org.name}`}
                                />
                            </div>
                            {/* Organization */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-icon bg-muted flex items-center justify-center shrink-0">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground truncate">
                                            {org.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                        <Mail className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{org.contact_email || 'No contact'}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Wallet Balance */}
                            <div className="flex items-center gap-2 min-w-0">
                                <Wallet className={`h-3.5 w-3.5 shrink-0 ${org.wallet_balance >= 0 ? 'text-emerald-700 dark:text-emerald-200' : 'text-destructive'}`} />
                                <span className={`font-bold truncate ${org.wallet_balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(org.wallet_balance)}
                                </span>
                            </div>
                            {/* Fee % */}
                            <div className="min-w-0">
                                <span className="inline-flex items-center rounded-pill bg-muted text-muted-foreground font-black text-[10px] px-2.5 py-0.5">
                                    {org.ivisit_fee_percentage}%
                                </span>
                            </div>
                            {/* Status */}
                            <div className="min-w-0">
                                {org.is_active ? (
                                    <span className="inline-flex items-center rounded-pill bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 font-bold text-[9px] px-2 py-1">
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-pill bg-destructive/10 text-destructive font-bold text-[9px] px-2 py-1">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            {/* Stripe Integrated */}
                            <div className="flex items-center gap-2 min-w-0">
                                {org.stripe_account_id ? (
                                    <Activity className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-200" />
                                ) : (
                                    <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                                )}
                                <span className="text-xs text-muted-foreground font-black truncate">
                                    {org.stripe_account_id ? 'Connected' : 'Pending'}
                                </span>
                            </div>
                            {/* Actions */}
                            <div className="justify-self-end">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-icon hover:bg-muted/30">
                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/70">
                                        <DropdownMenuItem onClick={() => onView(org)} className="cursor-pointer font-medium text-xs py-2">
                                            <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            Public Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEdit(org)} className="cursor-pointer font-medium text-xs py-2">
                                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            Core Config
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 h-1 rounded-pill bg-muted/40" />
                                        <DropdownMenuItem onClick={() => onDelete(org)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                                            Termination
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};
