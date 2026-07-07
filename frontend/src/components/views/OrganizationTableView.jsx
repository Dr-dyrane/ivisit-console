import React from 'react';
import { Badge } from '../ui/badge';
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
    ShieldCheck,
    Stripe,
    Globe,
    Activity
} from 'lucide-react';

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
        <div className="bg-background/35 backdrop-blur-xs rounded-card shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-muted/12">
                            <th className="w-12 p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                <Checkbox
                                    checked={selectedIds.length === organizations.length && organizations.length > 0}
                                    onCheckedChange={(checked) => onSelectAll(checked)}
                                    aria-label="Select all"
                                />
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Organization
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Wallet Balance
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Fee %
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Status
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Stripe Integrated
                            </th>
                            <th className="text-right p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {organizations.map((org, index) => (
                            <tr
                                key={org.id}
                                className={`hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-background/20' : 'bg-transparent'
                                    }`}
                            >
                                <td className="p-4">
                                    <Checkbox
                                        checked={selectedIds.includes(org.id)}
                                        onCheckedChange={(checked) => onSelect(org.id, checked)}
                                        aria-label={`Select organization ${org.name}`}
                                    />
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-icon bg-primary/10 flex items-center justify-center shrink-0">
                                            <Building2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {org.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                                <Mail className="w-3 h-3" />
                                                {org.contact_email || 'No contact'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Wallet className={`h-3.5 w-3.5 ${org.wallet_balance >= 0 ? 'text-success' : 'text-destructive'}`} />
                                        <span className={`font-bold ${org.wallet_balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(org.wallet_balance)}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Badge className="rounded-pill bg-primary/10 text-primary font-black text-[10px]">
                                        {org.ivisit_fee_percentage}%
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    {org.is_active ? (
                                        <Badge className="rounded-pill bg-success/20 text-success font-bold uppercase tracking-widest text-[9px] px-2 py-1">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge className="rounded-pill bg-destructive/10 text-destructive font-bold uppercase tracking-widest text-[9px] px-2 py-1">
                                            Inactive
                                        </Badge>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {org.stripe_account_id ? (
                                            <Activity className="h-3.5 w-3.5 text-success" />
                                        ) : (
                                            <Activity className="h-3.5 w-3.5 text-muted-foreground/30" />
                                        )}
                                        <span className="text-xs text-muted-foreground uppercase font-black tracking-tighter">
                                            {org.stripe_account_id ? 'Connected' : 'Pending'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-icon hover:bg-white/10">
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/70 backdrop-blur-xl shadow-premium">
                                                <DropdownMenuItem onClick={() => onView(org)} className="cursor-pointer font-medium text-xs py-2">
                                                    <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                    Public Profile
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onEdit(org)} className="cursor-pointer font-medium text-xs py-2">
                                                    <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                    Core Config
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="my-1 h-1 rounded-pill bg-white/5" />
                                                <DropdownMenuItem onClick={() => onDelete(org)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                    Termination
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
