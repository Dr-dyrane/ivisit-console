import React from 'react';
import { Activity } from 'lucide-react';

export const LegacyBentoFooter = ({
  appStats,
  isAdmin,
  isOrgAdmin,
  isPatient,
  isProvider,
  isSponsor,
}) => {
  if (isAdmin()) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
          <span>Nodes: {appStats.totalUsers ?? 0} Active</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
          <span>Emergencies: {appStats.liveEmergencies}</span>
        </div>
      </div>
    );
  }

  if (isOrgAdmin()) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
          <span>Staff: {appStats.activeProviders} Active</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
          <span>Response: {appStats.responseTime != null ? `${appStats.responseTime}min` : '\u2014'}</span>
        </div>
      </div>
    );
  }

  if (isProvider()) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-3 uppercase tracking-widest text-[10px] font-bold">
          <Activity className="w-3 h-3" />
          <span>Patients Today: {appStats.todayRequests}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
          <span>Active Emergencies: {appStats.liveEmergencies}</span>
        </div>
      </div>
    );
  }

  if (isPatient()) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
          <Activity className="w-3 h-3" />
          <span>Care: Available</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
          <span>Requests: {appStats.todayRequests}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-info">
          <span>Support: Online</span>
        </div>
      </div>
    );
  }

  if (isSponsor()) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
          <span>Success: {appStats.completionRate != null ? `${appStats.completionRate}%` : '\u2014'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
          <span>Lives: {appStats.totalUsers}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
        <Activity className="w-3 h-3" />
        <span>Platform: Online</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
        <span>Services: Available</span>
      </div>
    </div>
  );
};
