import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Ambulance,
  Activity,
  Clock,
  Plus,
  MapPin,
  List,
  Filter,
  BarChart3
} from 'lucide-react';

export const AmbulancesPanel = ({ ambulancesData }) => {
  const stats = ambulancesData?.stats || { total: 0, available: 0, onRoute: 0, busy: 0, maintenance: 0 };
  const recent = ambulancesData?.recent || [];

  const handleCreateAmbulance = () => {
    window.dispatchEvent(new CustomEvent('openAmbulanceModal'));
  };

  const handleAnalytics = () => {
    window.dispatchEvent(new CustomEvent('openReportsModal'));
  };

  return (
    <div className="space-y-3">
      {/* Fleet Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Fleet Status</h3>

        <div className="bg-success/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ambulance className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm font-bold tracking-tight">Ready Units</span>
          </div>
          <Badge className="bg-success/20 text-success border-0 rounded-full">{stats.available}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-info/5 p-3 rounded-3xl flex items-center gap-2 group">
            <div className="w-8 h-8 bg-info/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="font-bold text-xs">{stats.onRoute}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">En Route</p>
            </div>
          </div>

          <div className="bg-warning/5 p-3 rounded-3xl flex items-center gap-2 group">
            <div className="w-8 h-8 bg-warning/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="font-bold text-xs">{stats.busy}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Busy</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleCreateAmbulance}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border-0 group"
        >
          <Plus className="h-5 w-5 text-primary group-hover:rotate-90 transition-transform" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-primary">Unit</span>
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

      {/* Recent Fleet */}
      <div className="space-y-2">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Live Fleet</h3>
        <div className="space-y-1">
          {recent.map((ambulance, idx) => (
            <div key={ambulance.id || idx} className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border-0 transition-colors hover:bg-white/10 group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${ambulance.status === 'available' ? 'bg-success/20' :
                  ambulance.status === 'on_route' ? 'bg-info/20' :
                    'bg-warning/20'
                  } group-hover:scale-105 transition-transform`}>
                  <Ambulance className={`h-4 w-4 ${ambulance.status === 'available' ? 'text-success' :
                    ambulance.status === 'on_route' ? 'text-info' :
                      'text-warning'
                    }`} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate max-w-[120px]">
                    {ambulance.call_sign || 'Ambulance'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {ambulance.plate_number || 'Unit ID'}
                  </p>
                </div>
              </div>
              <Badge variant="ghost" className="text-[8px] font-bold uppercase tracking-widest p-0 h-auto opacity-60">
                {ambulance.status}
              </Badge>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Off duty
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
