import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Stethoscope, Plus, Edit, Trash2, Eye, Hospital, Star, Phone, ChevronRight } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { DoctorModal } from '../modals/DoctorModal';

export const DoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('doctors')
        .select('*, hospitals(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedDoctor(null);
    setModalMode('create');
  };

  const handleView = (doctor) => {
    setSelectedDoctor(doctor);
    setModalMode('view');
  };

  const handleEdit = (doctor) => {
    setSelectedDoctor(doctor);
    setModalMode('edit');
  };

  const handleDelete = async (doctor) => {
    if (!window.confirm(`Are you sure you want to delete Dr. ${doctor.name}?`)) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctor.id);

      if (error) throw error;
      
      toast.success('Doctor deleted successfully');
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('Failed to delete doctor');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setModalMode(null);
    setSelectedDoctor(null);
    if (shouldRefresh) {
      fetchDoctors();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-success/20 text-success',
      busy: 'bg-warning/20 text-warning',
      off_duty: 'bg-muted text-muted-foreground',
    };
    return badges[status] || badges.available;
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <PageHeader
        title="Doctors Management"
        subtitle="Manage medical professionals and specialists"
        action={
          <Button
            onClick={handleCreate}
            className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow flex items-center gap-2"
            data-testid="add-doctor-btn"
          >
            <Plus className="h-5 w-5" />
            <span className="font-bold">Add Doctor</span>
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : doctors.length === 0 ? (
        <Card className="squircle-lg glass shadow-premium p-12 border-0 text-center">
          <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-black text-xl mb-2">No Doctors Yet</h3>
          <p className="text-muted-foreground mb-6">Get started by adding your first doctor</p>
          <Button onClick={handleCreate} className="squircle bg-primary" data-testid="add-first-doctor-btn">
            <Plus className="h-4 w-4 mr-2" />
            Add First Doctor
          </Button>
        </Card>
      ) : (
        <LayoutGroup>
            <motion.div 
                layout 
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense" 
                data-testid="doctors-grid"
            >
            {doctors.map((doctor, index) => (
                <motion.div
                layout
                key={doctor.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="col-span-1"
                >
                <Card className="h-full squircle-lg glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col" data-testid={`doctor-card-${doctor.id}`}>
                    
                    {/* Top Right Icon */}
                    <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                            <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <Stethoscope className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`squircle-sm ${getStatusBadge(doctor.status)} border-0 font-black editorial-subtitle px-2 py-1`}>
                            {doctor.status || 'available'}
                        </Badge>
                    </div>

                    <h3 className="font-black text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                    {doctor.name}
                    </h3>
                    
                    <p className="text-sm text-primary font-semibold mb-6 relative z-10">{doctor.specialization}</p>

                    <div className="space-y-3 mb-6 relative z-10">
                        {doctor.hospitals?.name && (
                            <div className="flex items-center gap-3 text-sm p-2 squircle bg-muted/30">
                                <Hospital className="h-4 w-4 text-info" />
                                <span className="truncate font-medium">{doctor.hospitals.name}</span>
                            </div>
                        )}
                        {doctor.phone && (
                            <div className="flex items-center gap-3 text-sm p-2 squircle bg-muted/30">
                                <Phone className="h-4 w-4 text-success" />
                                <span className="font-medium">{doctor.phone}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-warning fill-warning" />
                        <p className="text-xs text-muted-foreground font-semibold">Rating</p>
                        </div>
                        <p className="font-black text-xl">{doctor.rating || '4.5'}</p>
                    </div>
                    <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">Experience</p>
                        <p className="font-black text-xl">{doctor.experience || '5'}y</p>
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
                                onClick={() => handleView(doctor)}
                                className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                data-testid={`view-doctor-${doctor.id}`}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(doctor)}
                                className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                data-testid={`edit-doctor-${doctor.id}`}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doctor)}
                                className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                data-testid={`delete-doctor-${doctor.id}`}
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
        <DoctorModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          doctor={selectedDoctor}
          mode={modalMode}
        />
      )}
    </div>
  );
};
