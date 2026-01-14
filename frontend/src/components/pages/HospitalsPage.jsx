import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Hospital, MapPin, Star, Bed, Ambulance, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { HospitalModal } from '../modals/HospitalModal';

export const HospitalsPage = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view', 'edit', 'create'

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedHospital(null);
    setModalMode('create');
  };

  const handleView = (hospital) => {
    setSelectedHospital(hospital);
    setModalMode('view');
  };

  const handleEdit = (hospital) => {
    setSelectedHospital(hospital);
    setModalMode('edit');
  };

  const handleDelete = async (hospital) => {
    if (!confirm(`Are you sure you want to delete ${hospital.name}?`)) return;

    try {
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', hospital.id);

      if (error) throw error;
      
      toast.success('Hospital deleted successfully');
      fetchHospitals();
    } catch (error) {
      console.error('Error deleting hospital:', error);
      toast.error('Failed to delete hospital');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setModalMode(null);
    setSelectedHospital(null);
    if (shouldRefresh) {
      fetchHospitals();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <PageHeader
        title="Hospitals Management"
        subtitle="Manage hospital network and facilities"
        action={
          <Button
            onClick={handleCreate}
            className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-bold">Add Hospital</span>
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {hospitals.map((hospital, index) => (
            <motion.div
              key={hospital.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="squircle-lg glass shadow-premium p-6 border-0 hover-lift group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 squircle bg-primary/10 flex items-center justify-center shrink-0">
                    <Hospital className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`squircle-sm ${
                      hospital.status === 'available' 
                        ? 'bg-success/20 text-success' 
                        : 'bg-warning/20 text-warning'
                    } border-0 font-black editorial-subtitle px-2 py-1`}>
                      {hospital.status}
                    </Badge>
                    {hospital.verified && (
                      <Badge className="squircle-sm bg-info/20 text-info border-0 px-2 py-1">
                        ✓
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-black text-xl mb-2 tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                  {hospital.name}
                </h3>
                
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 min-h-[2.5rem]">
                  <MapPin className="icon-secondary mt-0.5 text-primary" />
                  <p className="truncate-2 leading-snug">{hospital.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 squircle bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Bed className="icon-secondary text-info" />
                      <p className="text-xs text-muted-foreground font-semibold">Beds</p>
                    </div>
                    <p className="font-black text-lg">{hospital.available_beds}</p>
                  </div>
                  <div className="p-3 squircle bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Ambulance className="icon-secondary text-success" />
                      <p className="text-xs text-muted-foreground font-semibold">Fleet</p>
                    </div>
                    <p className="font-black text-lg">{hospital.ambulances_count}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <Star className="icon-secondary text-warning fill-warning" />
                    <span className="font-bold text-sm">{hospital.rating}</span>
                  </div>
                  <Badge className="squircle-sm bg-primary/10 text-primary border-0 font-bold text-xs px-2 py-1">
                    {hospital.emergency_level}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(hospital)}
                    className="squircle flex-1 card-action"
                  >
                    <Eye className="icon-secondary mr-2" />
                    <span className="font-bold">View</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(hospital)}
                    className="squircle card-action"
                  >
                    <Edit className="icon-secondary" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(hospital)}
                    className="squircle text-destructive hover:bg-destructive/10 card-action"
                  >
                    <Trash2 className="icon-secondary" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {modalMode && (
        <HospitalModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          hospital={selectedHospital}
          mode={modalMode}
        />
      )}
    </div>
  );
};
