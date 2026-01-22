import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, BarChart3, TrendingUp, Calendar, Clock, CheckCircle, AlertCircle, PlayCircle, Activity } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export const VisitAnalyticsModal = ({ open, onClose, stats }) => {
    const navigate = useNavigate();
    const [recentVisits, setRecentVisits] = React.useState([]);

    React.useEffect(() => {
        if (open) {
            // Fetch latest visits for activity feed
            supabase.from('visits')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5)
                .then(({ data }) => setRecentVisits(data || []))
                .catch(console.error);
        }
    }, [open]);

    if (!stats) return null;

    const getPercentage = (value, total) => (total > 0 ? ((value / total) * 100).toFixed(0) : 0);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
                    >
                        {/* Header Area */}
                        <div className="flex items-center justify-between p-8 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary/20 rounded-2xl">
                                    <BarChart3 className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">Visit Analytics</h2>
                                    <p className="text-sm text-muted-foreground">Overview of patient visits and operational metrics</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                aria-label="Close analytics"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Content Area */}
                        <div className="px-8 pb-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                            {/* KPI Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                                <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        <TrendingUp className="h-4 w-4 text-success" />
                                    </div>
                                    <h3 className="text-2xl font-bold">{stats.total || 0}</h3>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Visits</p>
                                </Card>

                                <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <Clock className="h-5 w-5 text-info" />
                                        <span className="text-xs font-bold text-info">{getPercentage(stats.scheduled, stats.total)}%</span>
                                    </div>
                                    <h3 className="text-2xl font-bold">{stats.scheduled || 0}</h3>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled</p>
                                </Card>

                                <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <PlayCircle className="h-5 w-5 text-warning" />
                                        <span className="text-xs font-bold text-warning">{getPercentage(stats.inProgress, stats.total)}%</span>
                                    </div>
                                    <h3 className="text-2xl font-bold">{stats.inProgress || 0}</h3>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p>
                                </Card>

                                <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <CheckCircle className="h-5 w-5 text-success" />
                                        <span className="text-xs font-bold text-success">{getPercentage(stats.completed, stats.total)}%</span>
                                    </div>
                                    <h3 className="text-2xl font-bold">{stats.completed || 0}</h3>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
                                </Card>

                                <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <AlertCircle className="h-5 w-5 text-destructive" />
                                        <span className="text-xs font-bold text-destructive">{getPercentage(stats.cancelled, stats.total)}%</span>
                                    </div>
                                    <h3 className="text-2xl font-bold">{stats.cancelled || 0}</h3>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Cancelled</p>
                                </Card>
                            </div>

                            {/* Recent Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-info" />
                                        Recent Visits
                                    </h3>
                                    <div className="space-y-3">
                                        {recentVisits.map((visit) => (
                                            <div key={visit.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${visit.status === 'completed' ? 'bg-success' :
                                                        visit.status === 'cancelled' ? 'bg-destructive' :
                                                            visit.status === 'in_progress' ? 'bg-warning' : 'bg-info'
                                                        }`} />
                                                    <div>
                                                        <p className="font-normal text-sm">
                                                            Visit #{visit.id.slice(0, 8)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground capitalize">
                                                            {visit.visit_type || 'General'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold">{visit.status}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(visit.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {recentVisits.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No recent visits found
                                            </p>
                                        )}
                                    </div>
                                </Card>

                                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0 flex flex-col justify-center text-center">
                                    <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <BarChart3 className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Advanced Reports</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Access detailed breakdowns of wait times, doctor performance, and hospital utilization.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            onClose();
                                            navigate('/analytics');
                                        }}
                                        className="w-full max-w-xs mx-auto"
                                    >
                                        Go to Analytics
                                    </Button>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
