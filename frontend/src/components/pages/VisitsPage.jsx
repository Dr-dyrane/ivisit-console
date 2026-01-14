import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Calendar, Plus, Edit, Trash2, Eye, User, Hospital, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { VisitModal } from '../modals/VisitModal';

export const VisitsPage = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedVisit(null);
    setModalMode('create');
  };

  const handleView = (visit) => {
    setSelectedVisit(visit);
    setModalMode('view');
  };

  const handleEdit = (visit) => {
    setSelectedVisit(visit);
    setModalMode('edit');
  };

  const handleDelete = async (visit) => {
    if (!window.confirm('Are you sure you want to delete this visit?')) return;

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visit.id);

      if (error) throw error;
      
      toast.success('Visit deleted successfully');
      fetchVisits();
    } catch (error) {
      console.error('Error deleting visit:', error);
      toast.error('Failed to delete visit');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setModalMode(null);
    setSelectedVisit(null);
    if (shouldRefresh) {
      fetchVisits();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-info/20 text-info',
      in_progress: 'bg-warning/20 text-warning',
      completed: 'bg-success/20 text-success',
      cancelled: 'bg-destructive/20 text-destructive',
    };
    return badges[status] || badges.scheduled;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <PageHeader
        title="Visits Management"
        subtitle="Track and manage patient visits"
        action={
          <Button
            onClick={handleCreate}
            className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow flex items-center gap-2"
            data-testid="add-visit-btn"
          >
            <Plus className="h-5 w-5" />
            <span className="font-bold">Schedule Visit</span>
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : visits.length === 0 ? (
        <Card className="squircle-lg glass shadow-premium p-12 border-0 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-black text-xl mb-2">No Visits Yet</h3>
          <p className="text-muted-foreground mb-6">Get started by scheduling the first visit</p>
          <Button onClick={handleCreate} className="squircle bg-primary" data-testid="add-first-visit-btn">
            <Plus className="h-4 w-4 mr-2" />
            Schedule First Visit
          </Button>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="visits-list">
          {visits.map((visit, index) => (
            <motion.div
              key={visit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="squircle-lg glass shadow-premium p-5 border-0 hover-lift group" data-testid={`visit-card-${visit.id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 squircle bg-info/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-7 w-7 text-info" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-black text-lg tracking-tight">
                        Visit #{visit.id?.slice(-6) || 'N/A'}
                      </h3>
                      <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-black editorial-subtitle px-2 py-1`}>
                        {visit.status || 'scheduled'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      {visit.user_id && (
                        <div className="flex items-center gap-1">
                          <User className="icon-secondary" />
                          <span>Patient</span>
                        </div>
                      )}
                      {visit.hospital_id && (
                        <div className="flex items-center gap-1">
                          <Hospital className="icon-secondary" />
                          <span>Hospital</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="icon-secondary" />
                        <span>{formatDate(visit.scheduled_at || visit.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {visit.visit_type && (
                    <Badge className="squircle-sm bg-primary/10 text-primary border-0 px-3 py-1 shrink-0 font-bold">
                      {visit.visit_type}
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(visit)}
                      className="squircle card-action"
                      data-testid={`view-visit-${visit.id}`}
                    >
                      <Eye className="icon-secondary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(visit)}
                      className="squircle card-action"
                      data-testid={`edit-visit-${visit.id}`}
                    >
                      <Edit className="icon-secondary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(visit)}
                      className="squircle text-destructive hover:bg-destructive/10 card-action"
                      data-testid={`delete-visit-${visit.id}`}
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
        <VisitModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          visit={selectedVisit}
          mode={modalMode}
        />
      )}
    </div>
  );
};
