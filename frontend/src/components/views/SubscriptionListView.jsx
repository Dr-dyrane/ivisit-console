import React from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';

export const SubscriptionListView = ({
    subscribers,
    onView,
    onDelete,
    onEdit,
    getStatusBadge,
    getTypeBadge,
    isMobile
}) => {
    if (!subscribers || subscribers.length === 0) return null;

    return (
        <div className="space-y-4">
            <AnimatePresence mode="popLayout">
                {subscribers.map((subscriber, index) => (
                    <motion.div
                        layout
                        key={subscriber.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div className="bg-background/30 rounded-card p-0 transition-colors group overflow-hidden hover:bg-muted/30">
                            <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 relative">
                                {/* Status Strip */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${subscriber.status === 'active' ? 'bg-emerald-500/60' :
                                    subscriber.status === 'unsubscribed' ? 'bg-destructive' :
                                        subscriber.status === 'pending' ? 'bg-amber-500/60' : 'bg-muted'
                                    }`} />

                                {/* Main Content */}
                                <div className="flex-1 space-y-3 md:space-y-0 md:pl-4">

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                                        {/* Subscriber Info */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-icon bg-muted flex items-center justify-center shrink-0">
                                                {subscriber.type === 'paid' ? (
                                                    <Crown className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <Users className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg text-foreground line-clamp-1">
                                                        {subscriber.email}
                                                    </h3>
                                                    {subscriber.new_user && (
                                                        <Clock className="h-3 w-3 text-amber-700 dark:text-amber-200 fill-amber-500/20 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                                    <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${getTypeBadge(subscriber.type)}`}>
                                                        {subscriber.type}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-pill bg-muted-foreground/30" />
                                                    <span>{subscriber.new_user ? 'New subscriber' : 'Member'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meta Data Grid (Tablet/Desktop) */}
                                        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 ${isMobile ? 'w-full bg-muted/30 p-3 rounded-inner' : ''}`}>

                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.14em]">Joined</span>
                                                    <span className="text-sm font-normal">
                                                        {subscriber.subscription_date ? new Date(subscriber.subscription_date).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.14em]">Welcome</span>
                                                    <span className="text-sm font-normal">
                                                        {subscriber.welcome_email_sent ? 'Sent' : 'Pending'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col md:items-end">
                                                    <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.14em] mb-1">Status</span>
                                                    <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(subscriber.status)}`}>
                                                        {subscriber.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={`flex items-center gap-2 ${isMobile ? 'justify-end pt-3 mt-2' : 'md:pl-4'}`}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onView(subscriber)}
                                        className="rounded-button h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                        {onEdit && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEdit(subscriber)}
                                                className="rounded-button h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(subscriber)}
                                                className="rounded-button h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
