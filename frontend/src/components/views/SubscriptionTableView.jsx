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
    Users,
    Mail,
    CheckCircle,
    Clock,
    Crown,
    Eye,
    Trash2,
    Calendar,
    Edit,
    MoreHorizontal
} from 'lucide-react';

export const SubscriptionTableView = ({
    subscribers,
    onView,
    onDelete,
    onEdit,
    getStatusBadge,
    getTypeBadge,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    if (!subscribers || subscribers.length === 0) return null;

    return (
        <div className="bg-background/35 backdrop-blur-xs squircle-lg border-0 shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border/20">
                            <th className="w-12 p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                <Checkbox
                                    checked={selectedIds.length === subscribers.length && subscribers.length > 0}
                                    onCheckedChange={(checked) => onSelectAll(checked)}
                                    aria-label="Select all"
                                />
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Subscriber
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Type
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Status
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Joined
                            </th>
                            <th className="text-left p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Welcome Email
                            </th>
                            <th className="text-right p-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {subscribers.map((subscriber, index) => (
                            <tr
                                key={subscriber.id}
                                className={`border-b border-border/10 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-background/20' : 'bg-transparent'
                                    }`}
                            >
                                <td className="p-4">
                                    <Checkbox
                                        checked={selectedIds.includes(subscriber.id)}
                                        onCheckedChange={(checked) => onSelect(subscriber.id, checked)}
                                        aria-label={`Select subscriber ${subscriber.email}`}
                                    />
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 geo-round bg-primary/10 flex items-center justify-center shrink-0">
                                            {subscriber.type === 'paid' ? (
                                                <Crown className="h-4 w-4 text-primary" />
                                            ) : (
                                                <Users className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-normal text-foreground">
                                                    {subscriber.email}
                                                </span>
                                                {subscriber.new_user && (
                                                    <Badge variant="ghost" className="p-0 h-auto">
                                                        <Clock className="h-3 w-3 text-warning fill-warning/20" />
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Badge className={`geo-sharp ${getTypeBadge(subscriber.type)} border-0 font-bold editorial-subtitle px-2 py-1`}>
                                        {subscriber.type}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <Badge className={`geo-sharp border-0 px-2 py-1 ${getStatusBadge(subscriber.status)}`}>
                                        {subscriber.status}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                            {subscriber.subscription_date ? new Date(subscriber.subscription_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        {subscriber.welcome_email_sent ? (
                                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                                        ) : (
                                            <Clock className="h-3.5 w-3.5 text-warning" />
                                        )}
                                        <span className="text-sm">
                                            {subscriber.welcome_email_sent ? 'Sent' : 'Pending'}
                                        </span>
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
                                                <DropdownMenuItem onClick={() => onView(subscriber)} className="cursor-pointer font-medium text-xs py-2">
                                                    <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                    View Details
                                                </DropdownMenuItem>
                                                {onEdit && (
                                                    <DropdownMenuItem onClick={() => onEdit(subscriber)} className="cursor-pointer font-medium text-xs py-2">
                                                        <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                )}
                                                {onDelete && (
                                                    <>
                                                        <DropdownMenuSeparator className="bg-white/5" />
                                                        <DropdownMenuItem onClick={() => onDelete(subscriber)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
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
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
