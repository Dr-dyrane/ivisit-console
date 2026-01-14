import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { AlertTriangle, Plus, Edit, Trash2, Eye, User, MapPin, Clock, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';

export const EmergencyRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  useEffect(() => {
    fetchRequests();
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
      console.error('Error fetching emergency requests:', error);
      toast.error('Failed to load emergency requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedRequest(null);
    setModalMode('create');
  };

  const handleView = (request) => {
    setSelectedRequest(request);
    setModalMode('view');
  };

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setModalMode('edit');
  };

  const handleDelete = async (request) => {
    if (!window.confirm('Are you sure you want to delete this emergency request?')) return;

    try {
      const { error } = await supabase
        .from('emergency_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;
      
      toast.success('Emergency request deleted successfully');
      fetchRequests();
    } catch (error) {
      console.error('Error deleting emergency request:', error);
      toast.error('Failed to delete emergency request');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setModalMode(null);
    setSelectedRequest(null);
    if (shouldRefresh) {
      fetchRequests();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning/20 text-warning',
      dispatched: 'bg-info/20 text-info',
      en_route: 'bg-primary/20 text-primary',
      arrived: 'bg-success/20 text-success',
      completed: 'bg-success/20 text-success',
      cancelled: 'bg-destructive/20 text-destructive',
    };
    return badges[status] || badges.pending;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      critical: 'bg-destructive text-destructive-foreground',
      high: 'bg-warning text-warning-foreground',
      medium: 'bg-info text-info-foreground',
      low: 'bg-muted text-muted-foreground',
    };
    return badges[priority] || badges.medium;
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 md:pl-24">
      <PageHeader
        title="Emergency Requests"
        subtitle="Monitor and manage emergency response requests"
        action={
          <Button
            onClick={handleCreate}
            className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow flex items-center gap-2"
            data-testid="add-emergency-btn"
          >
            <Plus className="h-5 w-5" />
            <span className="font-bold">New Request</span>
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : requests.length === 0 ? (
        <Card className="squircle-lg glass shadow-premium p-12 border-0 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-black text-xl mb-2">No Emergency Requests</h3>
          <p className="text-muted-foreground mb-6">No active emergency requests at this time</p>
          <Button onClick={handleCreate} className="squircle bg-primary" data-testid="add-first-emergency-btn">
            <Plus className="h-4 w-4 mr-2" />
            Create Test Request
          </Button>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="emergency-requests-list">
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="squircle-lg glass shadow-premium p-5 border-0 hover-lift group" data-testid={`emergency-card-${request.id}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 squircle flex items-center justify-center shrink-0 ${
                    request.priority === 'critical' ? 'bg-destructive/20' : 'bg-warning/10'
                  }`}>
                    <AlertTriangle className={`h-7 w-7 ${
                      request.priority === 'critical' ? 'text-destructive' : 'text-warning'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-black text-lg tracking-tight">
                        Emergency #{request.id?.slice(-6) || 'N/A'}
                      </h3>
                      <Badge className={`squircle-sm ${getPriorityBadge(request.priority)} border-0 font-black editorial-subtitle px-2 py-1`}>
                        {request.priority || 'MEDIUM'}
                      </Badge>
                      <Badge className={`squircle-sm ${getStatusBadge(request.status)} border-0 font-black editorial-subtitle px-2 py-1`}>
                        {request.status || 'pending'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      {request.user_id && (
                        <div className="flex items-center gap-1">
                          <User className="icon-secondary" />
                          <span>Requester</span>
                        </div>
                      )}
                      {request.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="icon-secondary" />
                          <span className="truncate max-w-[200px]">{request.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="icon-secondary" />
                        <span>{formatTime(request.created_at)}</span>
                      </div>
                    </div>
                    
                    {request.emergency_type && (
                      <p className="text-sm text-primary font-semibold mt-1">{request.emergency_type}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(request)}
                      className="squircle card-action"
                      data-testid={`view-emergency-${request.id}`}
                    >
                      <Eye className="icon-secondary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(request)}
                      className="squircle card-action"
                      data-testid={`edit-emergency-${request.id}`}
                    >
                      <Edit className="icon-secondary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(request)}
                      className="squircle text-destructive hover:bg-destructive/10 card-action"
                      data-testid={`delete-emergency-${request.id}`}
                    >
                      <Trash2 className="icon-secondary" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {modalMode && (
        <EmergencyRequestModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          request={selectedRequest}
          mode={modalMode}
        />
      )}
    </div>
  );
};
