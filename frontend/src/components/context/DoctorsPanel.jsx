import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Stethoscope,
  UserCheck,
  CheckCircle,
  Plus,
  Calendar,
  Filter,
  Mail
} from 'lucide-react';

export const DoctorsPanel = ({ doctorsData }) => {
  const stats = doctorsData?.stats || { totalDoctors: 0, onCall: 0, available: 0, busy: 0 };
  const recent = doctorsData?.recent || [];

  const handleCreateDoctor = () => {
    window.dispatchEvent(new CustomEvent('openDoctorModal'));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Doctor Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Staff Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight">Total Staff</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{stats.totalDoctors}</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="font-bold text-sm">{stats.onCall}</p>
                <p className="text-xs text-muted-foreground">On Call</p>
              </div>
            </div>
          </Card>

          <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-bold text-sm">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Free</p>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateDoctor}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="Add New Doctor"
          >
            <Plus className="h-4 w-4" />
            <span className="font-normal text-xs">Add</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="View Roster (Coming Soon)"
          >
            <Calendar className="h-4 w-4" />
            <span className="font-normal text-xs">Roster</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))}
            className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="Filter Staff"
          >
            <Filter className="h-4 w-4" />
            <span className="font-normal text-xs">Filter</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            disabled
            title="Email All (Coming Soon)"
          >
            <Mail className="h-4 w-4" />
            <span className="font-normal text-xs">Email</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Doctors */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recently Added</h3>

        <div className="space-y-2">
          {recent.map((doctor) => (
            <Card key={doctor.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 geo-round ${doctor.available ? 'bg-success' : 'bg-muted'
                    }`} />
                  <div>
                    <p className="font-normal text-sm truncate max-w-[120px]">
                      {doctor.name || doctor.first_name ? `${doctor.first_name} ${doctor.last_name}` : 'Doctor #' + doctor.id.substring(0, 4)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {doctor.specialization || 'General Practitioner'}
                    </p>
                  </div>
                </div>
                {doctor.on_call && (
                  <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20 px-1.5 py-0.5 h-5">
                    On Call
                  </Badge>
                )}
              </div>
            </Card>
          ))}
          {recent.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No recent doctors found
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
