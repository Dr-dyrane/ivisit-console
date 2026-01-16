import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { usePagination } from '../../hooks/usePagination';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/PaginationControls';
import { useAuth } from '../../contexts/AuthContext';
import { EmergencyDetailsModal } from '../modals/EmergencyDetailsModal';
import { withTimeout } from '../../lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  MapPin,
  Clock,
  Phone,
  User,
  Navigation,
  Activity,
  Eye,
  Trash2,
  RefreshCw,
  Filter,
  Siren,
  Shield,
  Zap
} from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';

export const EmergencyRequestsPage = () => {
  const { isAdmin, isProvider } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const pagination = usePagination(20);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      const { count } = await supabase
        .from('emergency_requests')
        .select('*', { count: 'exact', head: true });

      pagination.setTotalCount(count || 0);

      const { data, error } = await withTimeout(
        supabase
          .from('emergency_requests')
          .select('*')
          .range(pagination.paginationRange.start, pagination.paginationRange.end)
          .order('created_at', { ascending: false }),
        8000,
        'Failed to load emergency requests - timeout'
      );

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching emergency requests:', error);
      toast.error(error.message || 'Failed to load emergency requests');
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  useEffect(() => {
    fetchRequests();

    // Real-time updates
    const channel = supabase
      .channel('emergency_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, fetchRequests)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchRequests]);

  const headerActions = React.useMemo(() => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={fetchRequests}
        className="glass squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        RELOAD
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="glass squircle-full h-9 w-9 p-0"
      >
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  ), [fetchRequests]);

  usePageHeader('Emergency Logs', headerActions);

  const pendingCount = React.useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 uppercase tracking-widest text-[10px] font-black text-destructive">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>Live Buffer: {pendingCount} Active</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-black">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} Requests</span>
      </div>
    </div>
  ), [pendingCount, pagination.currentPage, pagination.totalPages, pagination.totalCount]);

  usePageFooter(footerContent, 'status', !loading && requests.length > 0);

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

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
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
    <div className="min-h-screen bg-background px-0 md:px-12 py-6 md:py-8 pt-6">

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
                <Card className={`h-full geo-arrow glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col ${req.priority === 'critical' ? 'ring-1 ring-destructive/20' : ''}`}>

                  {/* Top Right Icon */}
                  <div className="absolute top-0 right-0 p-5 z-20">
                    <div className="relative">
                      <div className={`absolute inset-0 ${req.priority === 'critical' ? 'bg-destructive/20' : 'bg-warning/10'} blur-xl rounded-full scale-150`} />
                      <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                        <Siren className={`h-5 w-5 ${req.priority === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Badge className={`geo-sharp ${getPriorityBadge(req.priority)} border-0 font-black editorial-subtitle px-3 py-1`}>
                      {req.priority || 'medium'}
                    </Badge>
                    <Badge className="geo-sharp bg-muted text-muted-foreground border-0 px-2 py-1 font-bold">
                      {req.status}
                    </Badge>
                  </div>

                  <h3 className="font-black text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                    {req.emergency_type || 'Unknown Emergency'}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 relative z-10">
                    <Clock className="h-4 w-4 text-info" />
                    <span className="font-medium">{req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Just now'}</span>
                  </div>

                  <div className="space-y-3 mb-6 relative z-10">
                    <div className="flex items-start gap-3 text-sm p-3 geo-sharp bg-muted/30">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="font-medium leading-snug truncate-2">{req.location || 'Location shared'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      ACTIONS
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-12">
                      {/* Assuming view/edit modals might be added later, for now just delete or placeholder view */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(req)}
                        className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(isAdmin || isProvider) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(req)}
                          className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </LayoutGroup>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
        loading={loading}
      />

      {/* Emergency Details Modal */}
      <EmergencyDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
      />
    </div>
  );
};
