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
  Mail,
  BarChart3
} from 'lucide-react';

export const DoctorsPanel = ({ doctorsData }) => {
  const stats = doctorsData?.stats || { totalDoctors: 0, onCall: 0, available: 0, busy: 0 };
  const recent = doctorsData?.recent || [];

  const handleCreateDoctor = () => {
    window.dispatchEvent(new CustomEvent('openDoctorModal'));
  };

  const handleAnalytics = () => {
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  return (
    <div className="space-y-3">
      {/* Staff Statistics */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Staff Overview</h3>

        <div className="bg-primary/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight">Active Faculty</span>
          </div>
          <Badge className="bg-primary/20 text-primary border-0 rounded-full">{stats.totalDoctors}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-info/5 p-3 rounded-3xl flex items-center gap-2 group">
            <div className="w-8 h-8 bg-info/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="font-bold text-xs">{stats.onCall}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">On Call</p>
            </div>
          </div>

          <div className="bg-success/5 p-3 rounded-3xl flex items-center gap-2 group">
            <div className="w-8 h-8 bg-success/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="font-bold text-xs">{stats.available}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Ready</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleCreateDoctor}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border-0 group"
        >
          <Plus className="h-5 w-5 text-primary group-hover:rotate-90 transition-transform" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-primary">Add</span>
        </button>
        <button
          onClick={handleAnalytics}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-info/10 hover:bg-info/20 transition-all border-0 group"
        >
          <BarChart3 className="h-5 w-5 text-info group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-info">Data</span>
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-muted/10 hover:bg-muted/20 transition-all border-0 group"
        >
          <Filter className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Filter</span>
        </button>
      </div>

      {/* Recently Added */}
      <div className="space-y-2">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Recent Roster</h3>
        <div className="space-y-1">
          {recent.map((doctor, idx) => (
            <div key={doctor.id || idx} className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border-0 transition-colors hover:bg-white/10 group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${doctor.status === 'available' ? 'bg-success/20' :
                  doctor.status === 'busy' ? 'bg-warning/20' :
                    'bg-primary/20'
                  } group-hover:scale-105 transition-transform`}>
                  <Stethoscope className={`h-4 w-4 ${doctor.status === 'available' ? 'text-success' :
                    doctor.status === 'busy' ? 'text-warning' :
                      'text-primary'
                    }`} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate max-w-[120px]">
                    {doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Doctor'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                    {doctor.specialization || 'Clinical Staff'}
                  </p>
                </div>
              </div>
              <Badge variant="ghost" className="text-[8px] font-bold uppercase tracking-widest p-0 h-auto opacity-60">
                {doctor.status === 'on_call' ? 'Call' : 'Active'}
              </Badge>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Empty roster
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
