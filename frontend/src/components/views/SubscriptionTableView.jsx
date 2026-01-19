import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Users,
    Mail,
    CheckCircle,
    Clock,
    Crown,
    Eye,
    Trash2,
    Calendar,
    Edit
} from 'lucide-react';

export const SubscriptionTableView = ({
    subscribers,
    onView,
    onDelete,
    onEdit,
    getStatusBadge,
    getTypeBadge
}) => {
    if (!subscribers || subscribers.length === 0) return null;

    return (
        <div className="bg-background/35 backdrop-blur-xs squircle-lg border-0 shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border/20">
                            <th className="text-left p-4 font-black text-sm uppercase tracking-wider text-muted-foreground">
                                Subscriber
                            </th>
                            <th className="text-left p-4 font-black text-sm uppercase tracking-wider text-muted-foreground">
                                Type
                            </th>
                            <th className="text-left p-4 font-black text-sm uppercase tracking-wider text-muted-foreground">
                                Status
                            </th>
                            <th className="text-left p-4 font-black text-sm uppercase tracking-wider text-muted-foreground">
                                Joined
                            </th>
                            <th className="text-left p-4 font-black text-sm uppercase tracking-wider text-muted-foreground">
                                Welcome Email
                            </th>
                            <th className="text-left p-4 font-black text-sm uppercase tracking-wider text-muted-foreground">
                                Source
                            </th>
                            <th className="text-right p-4 font-black text-sm uppercase tracking-wider text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {subscribers.map((subscriber, index) => (
                            <tr 
                                key={subscriber.id}
                                className={`border-b border-border/10 hover:bg-muted/20 transition-colors ${
                                    index % 2 === 0 ? 'bg-background/20' : 'bg-transparent'
                                }`}
                            >
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
                                                <span className="font-medium text-foreground">
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
                                    <Badge className={`geo-sharp ${getTypeBadge(subscriber.type)} border-0 font-black editorial-subtitle px-2 py-1`}>
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
                                    <span className="text-sm text-muted-foreground">
                                        {subscriber.source || 'website'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onView(subscriber)}
                                            className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {onEdit && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEdit(subscriber)}
                                                className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(subscriber)}
                                                className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
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
