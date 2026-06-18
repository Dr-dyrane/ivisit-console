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
    DollarSign,
    Ambulance,
    Bed,
    Clock,
    Eye,
    Trash2,
    Calendar,
    Edit,
    MoreHorizontal,
    Globe,
    Building2,
    Stethoscope,
    CreditCard,
    Info
} from 'lucide-react';

export const PricingTableView = ({
    pricing,
    onView,
    onDelete,
    onEdit,
    selectedIds = [],
    onSelect,
    onSelectAll,
    canEdit
}) => {
    if (!pricing || pricing.length === 0) return null;

    const getTypeIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'ambulance': return <Ambulance className="h-4 w-4" />;
            case 'bed': return <Bed className="h-4 w-4" />;
            case 'consultation': return <Stethoscope className="h-4 w-4" />;
            case 'procedure': return <CreditCard className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    return (
        <div className="bg-background/35 backdrop-blur-xs squircle-lg border-0 shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border/20">
                            <th className="w-12 p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                <Checkbox
                                    checked={selectedIds.length === pricing.length && pricing.length > 0}
                                    onCheckedChange={(checked) => onSelectAll(checked)}
                                    aria-label="Select all"
                                />
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Service / Item
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Price
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Unit
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Scope
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Last Updated
                            </th>
                            <th className="text-right p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pricing.map((item, index) => {
                            const isGlobal = !item.organization_id && !item.hospital_id;
                            const isEditable = canEdit(item);

                            return (
                                <tr
                                    key={item.id}
                                    className={`border-b border-border/10 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-background/20' : 'bg-transparent'
                                        }`}
                                >
                                    <td className="p-4">
                                        <Checkbox
                                            checked={selectedIds.includes(item.id)}
                                            onCheckedChange={(checked) => onSelect(item.id, checked)}
                                            aria-label={`Select item ${item.service_name || item.room_name}`}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 geo-round bg-primary/10 flex items-center justify-center shrink-0">
                                                {getTypeIcon(item.service_type || item.room_type)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-normal text-foreground">
                                                        {item.service_name || item.room_name}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                    {item.service_type || item.room_type}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-bold text-foreground">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.base_price || item.price_per_night || 0)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        {item.unit || item.room_type || 'Per Unit'}
                                    </td>
                                    <td className="p-4">
                                        <Badge className={`geo-sharp border-0 px-2 py-1 ${isGlobal ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'}`}>
                                            <div className="flex items-center gap-1.5 uppercase tracking-tighter font-black text-[9px]">
                                                {isGlobal ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                                {isGlobal ? 'Global' : 'Override'}
                                            </div>
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{new Date(item.updated_at || item.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10">
                                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                                                    <DropdownMenuItem onClick={() => onView(item)} className="cursor-pointer font-medium text-xs py-2">
                                                        <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {isEditable && (
                                                        <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer font-medium text-xs py-2">
                                                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                    )}
                                                    {isEditable && (
                                                        <>
                                                            <DropdownMenuSeparator className="bg-white/5" />
                                                            <DropdownMenuItem onClick={() => onDelete(item)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
