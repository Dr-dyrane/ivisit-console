import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { AlertTriangle, Eye, Trash2, MapPin, Clock, ChevronRight, Activity, Siren } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';

export const EmergencyRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    
    // Real-time updates
    const channel = supabase
      .channel('emergency_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, fetchRequests)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load emergency requests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (request) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('emergency_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;
      toast.success('Request deleted');
      fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      critical: 'bg-destructive/20 text-destructive',
      high: 'bg-warning/20 text-warning',
      medium: 'bg-info/20 text-info',
      low: 'bg-success/20 text-success',
    };
    return badges[priority] || badges.medium;
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <PageHeader
        title="Emergency Requests"
        subtitle="Live feed of incoming emergency calls"
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : requests.length === 0 ? (
        <Card className="squircle-lg glass shadow-premium p-12 border-0 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-black text-xl mb-2">No Active Emergencies</h3>
          <p className="text-muted-foreground">All clear for now</p>
        </Card>
      ) : (
        <LayoutGroup>
            <motion.div 
                layout 
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
            >
            {requests.map((req, index) => (
                <motion.div
                layout
                key={req.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="col-span-1"
                >
                <Card className={`h-full squircle-lg glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col ${req.priority === 'critical' ? 'ring-1 ring-destructive/20' : ''}`}>
                    
                    {/* Top Right Icon */}
                    <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                            <div className={`absolute inset-0 ${req.priority === 'critical' ? 'bg-destructive/20' : 'bg-warning/10'} blur-xl rounded-full scale-150`} />
                            <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <Siren className={`h-5 w-5 ${req.priority === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`squircle-sm ${getPriorityBadge(req.priority)} border-0 font-black editorial-subtitle px-2 py-1`}>
                            {req.priority || 'medium'}
                        </Badge>
                        <Badge className="squircle-sm bg-muted text-muted-foreground border-0 px-2 py-1 font-bold">
                             {req.status}
                        </Badge>
                    </div>

                    <h3 className="font-black text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                         {req.emergency_type || 'Unknown Emergency'}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 relative z-10">
                        <Clock className="h-4 w-4 text-info" />
                        <span className="font-medium">{new Date(req.created_at).toLocaleTimeString()}</span>
                    </div>

                    <div className="space-y-3 mb-6 relative z-10">
                        <div className="flex items-start gap-3 text-sm p-3 squircle bg-muted/30">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="font-medium leading-snug truncate-2">{req.location || 'Location shared'}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            ACTIONS
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             {/* Assuming view/edit modals might be added later, for now just delete or placeholder view */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(req)}
                                className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
                </motion.div>
            ))}
            </motion.div>
        </LayoutGroup>
      )}
    </div>
  );
};
