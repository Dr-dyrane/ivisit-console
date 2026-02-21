import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const VisitsPanel = ({ visitsData }) => {
  const stats = visitsData?.stats || { today: 0, pending: 0, completed: 0, upcoming: 0 };
  const recent = visitsData?.recent || [];

  const handleCreateVisit = () => {
    window.dispatchEvent(new CustomEvent('openVisitModal'));
  };

  return (
    <div className="space-y-3">
      {/* Visit Statistics */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Daily Pulse</h3>

        <div className="bg-primary/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight">Today's Visits</span>
          </div>
          <Badge className="bg-primary/20 text-primary border-0 rounded-full">{stats.today}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-warning/5 p-3 rounded-3xl flex items-center gap-2 group">
            <div className="w-8 h-8 bg-warning/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="font-bold text-xs">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Awaiting</p>
            </div>
          </div>

          <div className="bg-success/5 p-3 rounded-3xl flex items-center gap-2 group">
            <div className="w-8 h-8 bg-success/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="font-bold text-xs">{stats.completed}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Resolved</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleCreateVisit}
          className="flex items-center justify-center gap-3 p-4 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border-0 group"
        >
          <Plus className="h-5 w-5 text-primary group-hover:rotate-90 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Schedule</span>
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openReportsModal'))}
          className="flex items-center justify-center gap-3 p-4 rounded-3xl bg-info/10 hover:bg-info/20 transition-all border-0 group"
        >
          <BarChart3 className="h-5 w-5 text-info group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-info">Analytics</span>
        </button>
      </div>

      {/* Recent Visits */}
      <div className="space-y-2">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Live Queue</h3>
        <div className="space-y-1">
          {recent.map((visit, idx) => (
            <div key={visit.id || idx} className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border-0 transition-colors hover:bg-white/10 group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${visit.status === 'completed' ? 'bg-success/20' :
                  visit.status === 'cancelled' ? 'bg-destructive/10' :
                    'bg-warning/20'
                  } group-hover:scale-105 transition-transform`}>
                  <Calendar className={`h-4 w-4 ${visit.status === 'completed' ? 'text-success' :
                    visit.status === 'cancelled' ? 'text-destructive' :
                      'text-warning'
                    }`} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate max-w-[120px]">
                    {visit.patient_name || 'Ambulatory Care'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {visit.scheduled_at ? formatDate(visit.scheduled_at) : 'Active Session'}
                  </p>
                </div>
              </div>
              <Badge variant="ghost" className="text-[8px] font-bold uppercase tracking-widest p-0 h-auto opacity-60">
                {visit.status}
              </Badge>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Queue clear
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
