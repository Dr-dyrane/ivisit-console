import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, BarChart3, TrendingUp, Shield, CheckCircle, AlertTriangle, Building, FileText } from 'lucide-react';

export const InsuranceAnalyticsModal = ({ open, onClose, analytics }) => {
  if (!analytics) return null;

  const getPercentage = (value, total) => (total > 0 ? ((value / total) * 100).toFixed(0) : 0);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop - Apple uses a high-blur dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden  rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl ">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">Insurance Analytics</h2>
                  <p className="text-sm text-muted-foreground">Portfolio overview and risk assessment</p>
                </div>
                <div className="sm:hidden">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground/90">Analytics</h2>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">

              {/* Top Level Summary: "Glass Bubbles" */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <StatBubble
                  label="Total"
                  value={analytics.total}
                  icon={<Shield className="h-5 w-5" />}
                  color="text-primary"
                  bg="bg-primary/10"
                />
                <StatBubble
                  label="Active"
                  value={analytics.active}
                  subText={`${getPercentage(analytics.active, analytics.total)}%`}
                  icon={<CheckCircle className="h-5 w-5" />}
                  color="text-green-500"
                  bg="bg-green-500/10"
                />
                <StatBubble
                  label="Verified"
                  value={analytics.verified}
                  subText={`${getPercentage(analytics.verified, analytics.total)}%`}
                  icon={<Shield className="h-5 w-5" />}
                  color="text-purple-500"
                  bg="bg-purple-500/10"
                />
                <StatBubble
                  label="Expiring"
                  value={analytics.expiringSoon}
                  subText="Action"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  color="text-orange-500"
                  bg="bg-orange-500/10"
                />
              </div>

              {/* Main Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Provider Breakdown */}
                <GlassCard icon={<Building className="text-primary" />} title="By Provider">
                  <div className="space-y-3 sm:space-y-4">
                    {Object.entries(analytics.byProvider || {}).map(([provider, count]) => (
                      <div key={provider} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-sm font-normal px-1">
                          <span className="truncate max-w-[120px]">{provider}</span>
                          <span className="opacity-60">{count}</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getPercentage(count, analytics.total)}%` }}
                            className="h-full bg-primary rounded-full "
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Status Pills */}
                <GlassCard icon={<TrendingUp className="text-purple-500" />} title="System Status">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {Object.entries(analytics.byStatus || {}).map(([status, count]) => (
                      <div key={status} className="p-3 sm:p-4 rounded-2xl bg-white/5  border-white/10  flex flex-col items-center">
                        <span className="text-xs uppercase tracking-widest opacity-50 mb-1">{status}</span>
                        <span className="text-xl sm:text-2xl font-semibold">{count}</span>
                        <span className="text-[10px] sm:text-xs font-normal text-blue-400">
                          {getPercentage(count, analytics.total)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* Bottom Insights */}
              <div className="p-4 sm:p-6 rounded-[24px] bg-white/5  border-white/10 flex items-center justify-around text-center">
                <div>
                  <p className="text-2xl sm:text-3xl font-semibold">{getPercentage(analytics.active, analytics.total)}%</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Active Rate</p>
                </div>
                <div className="hidden sm:block w-px h-10 bg-white/10" />
                <div>
                  <p className="text-2xl sm:text-3xl font-semibold">{analytics.expired || 0}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Expired</p>
                </div>
                <div className="hidden sm:block w-px h-10 bg-white/10" />
                <div>
                  <p className="text-2xl sm:text-3xl font-semibold">{Object.keys(analytics.byProvider || {}).length}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Carriers</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components for cleaner code */

const StatBubble = ({ label, value, subText, icon, color, bg }) => (
  <div className={`p-3 sm:p-5 rounded-3xl bg-white/5  border-white/10  transition-transform hover:scale-[1.02]`}>
    <div className="flex justify-between items-start mb-2 sm:mb-3">
      <div className={`p-1.5 sm:p-2 rounded-xl ${bg} ${color}`}>
        {icon}
      </div>
      <span className={`text-lg sm:text-2xl font-semibold tracking-tight`}>{value}</span>
    </div>
    <p className="text-xs font-medium opacity-70 mb-0.5">{label}</p>
    {subText && <p className="text-[9px] sm:text-[10px] opacity-40 font-normal">{subText}</p>}
  </div>
);

const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5  border-white/10 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);