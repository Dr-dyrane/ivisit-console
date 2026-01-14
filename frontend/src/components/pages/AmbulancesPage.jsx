import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Ambulance, Plus, Edit, Trash2, Eye, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AmbulanceModal } from '../modals/AmbulanceModal';

export const AmbulancesPage = () => {
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  useEffect(() => {
    fetchAmbulances();
  }, []);

  const fetchAmbulances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ambulances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAmbulances(data || []);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
      toast.error('Failed to load ambulances');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAmbulance(null);
    setModalMode('create');
  };

  const handleView = (ambulance) => {
    setSelectedAmbulance(ambulance);
    setModalMode('view');
  };

  const handleEdit = (ambulance) => {
    setSelectedAmbulance(ambulance);
    setModalMode('edit');
  };

  const handleDelete = async (ambulance) => {
    if (!confirm(`Are you sure you want to delete ${ambulance.call_sign}?`)) return;

    try {
      const { error } = await supabase
        .from('ambulances')
        .delete()
        .eq('id', ambulance.id);

      if (error) throw error;
      
      toast.success('Ambulance deleted successfully');
      fetchAmbulances();
    } catch (error) {
      console.error('Error deleting ambulance:', error);
      toast.error('Failed to delete ambulance');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setModalMode(null);
    setSelectedAmbulance(null);
    if (shouldRefresh) {
      fetchAmbulances();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-success/20 text-success border-success/30',
      en_route: 'bg-warning/20 text-warning border-warning/30',
      busy: 'bg-destructive/20 text-destructive border-destructive/30',
      maintenance: 'bg-muted text-muted-foreground',
    };
    return badges[status] || badges.available;
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <PageHeader
        title="Fleet Management"
        subtitle="Manage ambulance fleet and assignments"
        action={
          <Button
            onClick={handleCreate}
            className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-bold">Add Ambulance</span>
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {ambulances.map((ambulance, index) => (
            <motion.div
              key={ambulance.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="squircle-lg glass shadow-premium p-6 border-0 hover-lift group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 squircle bg-success/10 flex items-center justify-center">
                    <Ambulance className="h-7 w-7 text-success" />
                  </div>
                  <Badge className={`squircle-sm ${getStatusBadge(ambulance.status)} border font-black editorial-subtitle`}>
                    {ambulance.status}
                  </Badge>
                </div>

                <h3 className="font-black text-xl mb-2 tracking-tight group-hover:text-primary transition-colors">
                  {ambulance.call_sign}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-semibold">
                    <span className="text-muted-foreground">Type:</span> {ambulance.type}
                  </p>
                  <p className="text-sm font-semibold">
                    <span className="text-muted-foreground">Vehicle:</span> {ambulance.vehicle_number}
                  </p>
                  <p className="text-sm font-semibold">
                    <span className="text-muted-foreground">Hospital:</span> {ambulance.hospital}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 squircle bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <p className="text-xs text-muted-foreground font-semibold">Rating</p>
                    </div>
                    <p className="font-black text-lg">{ambulance.rating}</p>
                  </div>
                  <div className="p-3 squircle bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-info" />
                      <p className="text-xs text-muted-foreground font-semibold">ETA</p>
                    </div>
                    <p className="font-black text-lg">{ambulance.eta || 'N/A'}</p>
                  </div>
                </div>

                {ambulance.crew && ambulance.crew.length > 0 && (
                  <div className="mb-4 p-3 squircle bg-primary/5">
                    <p className="text-xs text-muted-foreground font-semibold mb-2">Crew</p>
                    <div className="space-y-1">
                      {ambulance.crew.map((member, idx) => (
                        <p key={idx} className="text-sm font-medium">{member}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(ambulance)}
                    className="squircle flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(ambulance)}
                    className="squircle"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(ambulance)}
                    className="squircle text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {modalMode && (
        <AmbulanceModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          ambulance={selectedAmbulance}
          mode={modalMode}
        />
      )}
    </div>
  );
};
