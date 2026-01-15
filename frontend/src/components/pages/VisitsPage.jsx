import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Calendar, Plus, Edit, Trash2, Eye, User, Hospital, Clock, CheckCircle, ChevronRight, MapPin } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
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
        <LayoutGroup>
            <motion.div 
                layout 
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense" 
                data-testid="visits-list"
            >
            {visits.map((visit, index) => (
                <motion.div
                layout
                key={visit.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className="col-span-1"
                >
                <Card className="h-full squircle-lg glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col" data-testid={`visit-card-${visit.id}`}>
                    
                    {/* Top Right Icon */}
                    <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-info/10 blur-xl rounded-full scale-150" />
                            <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <Calendar className="h-5 w-5 text-info" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-black editorial-subtitle px-2 py-1`}>
                            {visit.status || 'scheduled'}
                        </Badge>
                        {visit.visit_type && (
                            <Badge className="squircle-sm bg-primary/10 text-primary border-0 px-2 py-1 font-bold">
                                {visit.visit_type}
                            </Badge>
                        )}
                    </div>

                    <h3 className="font-black text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                        Visit #{visit.id?.slice(-6) || 'N/A'}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 relative z-10">
                        <Clock className="h-4 w-4 text-info" />
                        <span className="font-medium">{formatDate(visit.scheduled_at || visit.created_at)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                        <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-primary" />
                                <p className="text-xs text-muted-foreground font-semibold">Patient</p>
                            </div>
                            <p className="font-bold truncate">{visit.user_id ? 'Linked' : 'Unknown'}</p>
                        </div>
                        <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <Hospital className="h-4 w-4 text-success" />
                                <p className="text-xs text-muted-foreground font-semibold">Hospital</p>
                            </div>
                            <p className="font-bold truncate">{visit.hospital_id ? 'Linked' : 'None'}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            ACTIONS
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(visit)}
                                className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                data-testid={`view-visit-${visit.id}`}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(visit)}
                                className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                data-testid={`edit-visit-${visit.id}`}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(visit)}
                                className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                data-testid={`delete-visit-${visit.id}`}
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
