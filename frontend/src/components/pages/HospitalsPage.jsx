import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Hospital, MapPin, Star, Bed, Ambulance, Plus, Edit, Trash2, Eye, ChevronRight } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { HospitalModal } from '../modals/HospitalModal';

export const HospitalsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isProvider } = useAuth();
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
          (isAdmin() || isProvider()) && (
            <Button
              onClick={handleCreate}
              className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="font-bold">Add Hospital</span>
            </Button>
          )
        }
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <LayoutGroup>
            <motion.div 
                layout 
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
            >
            {hospitals.map((hospital, index) => (
                <motion.div
                layout
                key={hospital.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="col-span-1"
                >
                <Card className="h-full geo-block glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">
                    
                    {/* Top Right Icon */}
                    <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                            <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <Hospital className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`geo-badge ${
                            hospital.status === 'available' 
                            ? 'bg-success/20 text-success' 
                            : 'bg-warning/20 text-warning'
                        } border-0 font-black editorial-subtitle px-3 py-1`}>
                            {hospital.status}
                        </Badge>
                        {hospital.verified && (
                            <Badge className="geo-badge bg-info/20 text-info border-0 px-2 py-1">
                            ✓
                            </Badge>
                        )}
                    </div>

                    <h3 className="font-black text-2xl mb-2 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                    {hospital.name}
                    </h3>
                    
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-6 min-h-[2.5rem] relative z-10">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p className="truncate-2 leading-snug">{hospital.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                        <Bed className="h-4 w-4 text-info" />
                        <p className="text-xs text-muted-foreground font-semibold">Beds</p>
                        </div>
                        <p className="font-black text-xl">{hospital.available_beds}</p>
                    </div>
                    <div className="p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                        <Ambulance className="h-4 w-4 text-success" />
                        <p className="text-xs text-muted-foreground font-semibold">Fleet</p>
                        </div>
                        <p className="font-black text-xl">{hospital.ambulances_count}</p>
                    </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                        <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-warning fill-warning" />
                            <span className="font-bold text-sm">{hospital.rating}</span>
                        </div>
                        
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(hospital)}
                                className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            {/* RBAC: Only providers/admins can edit/delete */}
                            {(isAdmin() || isProvider()) && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(hospital)}
                                        className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(hospital)}
                                        className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
                </motion.div>
            ))}
            </motion.div>
        </LayoutGroup>
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
