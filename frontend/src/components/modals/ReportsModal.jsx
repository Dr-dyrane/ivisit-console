"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  X, FileText, Download, BarChart3, Activity, Users,
  Clock, AlertTriangle, CheckCircle, Headphones, TrendingUp,
  Tag, Flag, Shield, Building, UserCheck, Mail, Calendar, Stethoscope,
  Siren, Hospital, Bed, Ambulance
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Enhanced ReportsModal that handles both visual analytics and report generation
 */

const REPORT_TYPES = [
  {
    id: 'emergency',
    name: 'Emergency Response',
    description: 'Complete emergency response analytics and trends',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    dataKeys: ['totalEmergencies', 'avgResponseTime', 'successRate', 'responseTimeData', 'requestsByStatus']
  },
  {
    id: 'performance',
    name: 'System Performance',
    description: 'Overall system health and performance metrics',
    icon: Activity,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    dataKeys: ['totalUsers', 'totalHospitals', 'totalAmbulances', 'completionRate']
  },
  {
    id: 'hospital',
    name: 'Hospital Network',
    description: 'Facility capacity and resource availability',
    icon: Hospital,
    color: 'text-primary',
    bg: 'bg-primary/10',
    dataKeys: ['total', 'available', 'full', 'totalBeds']
  },
  {
    id: 'usage',
    name: 'Usage Analytics',
    description: 'User engagement and platform usage patterns',
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/10',
    dataKeys: ['requestsByDay', 'emergencyTypes', 'dominantType']
  },
  {
    id: 'operations',
    name: 'Operations Summary',
    description: 'Daily operational metrics and KPIs',
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    dataKeys: ['avgResponseTime', 'successRate', 'totalAmbulances']
  },
  {
    id: 'support',
    name: 'Support Analytics',
    description: 'Help desk performance and ticket trends',
    icon: Headphones,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    dataKeys: ['total', 'resolved', 'byStatus', 'byPriority', 'byCategory']
  },
  {
    id: 'subscription',
    name: 'Subscription Insights',
    description: 'Subscriber growth and engagement metrics',
    icon: Mail,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    dataKeys: ['total', 'active', 'paid', 'free', 'conversionRate']
  },
  {
    id: 'user',
    name: 'User Base Analytics',
    description: 'Demographics and authentication metrics',
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/10',
    dataKeys: ['totalUsers', 'activeUsers', 'roleDistribution', 'verificationRate']
  },
  {
    id: 'insurance',
    name: 'Insurance Portfolio',
    description: 'Policy distribution and verification stats',
    icon: Shield,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    dataKeys: ['total', 'active', 'verified', 'byProvider']
  },
  {
    id: 'visit',
    name: 'Visit Analytics',
    description: 'Medical visit trends and completion rates',
    icon: Calendar,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    dataKeys: ['total_visits', 'scheduled_visits', 'completed_visits', 'completion_rate']
  },
  {
    id: 'doctor',
    name: 'Doctor Performance',
    description: 'Provider distribution and review analytics',
    icon: Stethoscope,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    dataKeys: ['totalDoctors', 'bySpecialization', 'avgRating']
  }
];

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' }
];

export const ReportsModal = ({ open, onClose, analyticsData, timeRange, initialType = null }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'reports'
  const [selectedReports, setSelectedReports] = useState(initialType ? [initialType] : []);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange || '30d');
  const [isGenerating, setIsGenerating] = useState(false);

  const currentType = useMemo(() => {
    if (initialType) return initialType;
    if (selectedReports.length === 1) return selectedReports[0];
    return 'performance';
  }, [initialType, selectedReports]);

  const toggleReport = (reportId) => {
    setSelectedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };


  const generateIndividualCSV = (reportType) => {
    const report = REPORT_TYPES.find(r => r.id === reportType);
    if (!report || !analyticsData) {
      toast.error('Unable to generate report - missing data');
      return;
    }

    const csvData = [];
    csvData.push([`${report.name} Report`]);
    csvData.push([`Time Range: ${TIME_RANGES.find(tr => tr.value === selectedTimeRange)?.label}`]);
    csvData.push([`Generated: ${new Date().toLocaleString()}`]);
    csvData.push([]);

    // Generic data mapping based on reportType
    switch (reportType) {
      case 'emergency':
        csvData.push(['Metric', 'Value']);
        csvData.push(['Total Emergencies', analyticsData.totalEmergencies || 0]);
        csvData.push(['Average Response Time', `${analyticsData.avgResponseTime || 0} minutes`]);
        csvData.push(['Success Rate', `${analyticsData.successRate || 0}%`]);
        break;
      case 'support':
        csvData.push(['Status', 'Count']);
        Object.entries(analyticsData.byStatus || {}).forEach(([k, v]) => csvData.push([k, v]));
        break;
      // Add more specific mappings if needed, otherwise fallback to generic
      default:
        csvData.push(['Data Key', 'Value']);
        report.dataKeys.forEach(key => {
          if (analyticsData[key] !== undefined) {
            csvData.push([key, JSON.stringify(analyticsData[key])]);
          }
        });
    }

    const csvString = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`${report.name} report downloaded successfully`);
  };

  const generateCombinedReport = async () => {
    if (selectedReports.length === 0) {
      toast.error('Please select at least one report');
      return;
    }

    setIsGenerating(true);
    try {
      for (let i = 0; i < selectedReports.length; i++) {
        const reportId = selectedReports[i];
        const report = REPORT_TYPES.find(r => r.id === reportId);
        toast.info(`Generating ${report.name} report... (${i + 1}/${selectedReports.length})`);
        await new Promise(resolve => setTimeout(resolve, 800));
        generateIndividualCSV(reportId);
      }
      toast.success(`Generated ${selectedReports.length} report(s) successfully`);
    } catch (error) {
      toast.error('Failed to generate reports');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAllReports = () => {
    REPORT_TYPES.forEach(report => {
      setTimeout(() => generateIndividualCSV(report.id), Math.random() * 1000);
    });
    toast.success('Downloading all reports...');
  };

  // Safe getter with NaN protection
  const safeValue = (value, fallback = 0) => {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  };

  const getPercentage = (value, total) => {
    const v = safeValue(value);
    const t = safeValue(total);
    return t > 0 ? Math.round((v / t) * 100) : 0;
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative z-10 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[32px] bg-background/95 backdrop-blur-2xl shadow-2xl border border-white/10"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-6 sm:p-8 pb-4 bg-gradient-to-b from-background/50 to-transparent">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {activeTab === 'overview' ? 'Analytics Overview' : 'Generation Center'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'overview' ? 'Real-time performance metrics' : 'Export data to CSV format'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex bg-muted/50 p-1 rounded-2xl">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Reports
                  </button>
                </div>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] no-scrollbar">
              {activeTab === 'overview' ? (
                <div className="space-y-8">
                  {/* Overview Content based on type */}
                  <AnalyticsContent
                    type={currentType}
                    data={analyticsData}
                    getPercentage={getPercentage}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Generation Controls */}
                  <div className="p-6 rounded-[28px] bg-muted/30 border border-white/5">
                    <p className="text-xs font-medium opacity-70 mb-3 uppercase tracking-widest">Time Range</p>
                    <div className="flex gap-2 flex-wrap">
                      {TIME_RANGES.map(range => (
                        <button
                          key={range.value}
                          onClick={() => setSelectedTimeRange(range.value)}
                          className={`px-4 py-2 rounded-2xl text-sm font-normal transition-all ${selectedTimeRange === range.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 hover:bg-muted text-foreground'
                            }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Report Types Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {REPORT_TYPES.map(report => (
                      <motion.div
                        key={report.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleReport(report.id)}
                        className={`p-5 rounded-[24px] cursor-pointer border-2 transition-all ${selectedReports.includes(report.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 bg-muted/30 hover:border-muted-foreground/20'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${report.bg} ${report.color} flex-shrink-0`}>
                            <report.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-sm">{report.name}</h3>
                              {selectedReports.includes(report.id) && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{report.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Generation Actions */}
                  <div className="p-6 rounded-[28px] bg-muted/30  flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      {selectedReports.length > 0 ? (
                        <span>{selectedReports.length} report{selectedReports.length > 1 ? 's' : ''} selected</span>
                      ) : (
                        <span>Select reports to generate</span>
                      )}
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={downloadAllReports}
                        className="rounded-2xl flex-1 sm:flex-none border-white/10"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                      <Button
                        onClick={generateCombinedReport}
                        disabled={selectedReports.length === 0 || isGenerating}
                        className="rounded-2xl min-w-[160px] flex-1 sm:flex-none"
                      >
                        {isGenerating ? (
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        Generate Selected
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* --- Visual Analytics Components --- */

const AnalyticsContent = ({ type, data, getPercentage }) => {
  if (!data) return <div className="text-center py-12 text-muted-foreground">No data available for this context.</div>;

  switch (type) {
    case 'support':
      return <SupportOverview analytics={data} getPercentage={getPercentage} />;
    case 'subscription':
      return <SubscriptionOverview analytics={data} getPercentage={getPercentage} />;
    case 'user':
      return <UserOverview analytics={data} getPercentage={getPercentage} />;
    case 'insurance':
      return <InsuranceOverview analytics={data} getPercentage={getPercentage} />;
    case 'visit':
      return <VisitOverview analytics={data} getPercentage={getPercentage} />;
    case 'doctor':
      return <DoctorOverview analytics={data} getPercentage={getPercentage} />;
    case 'emergency':
      return <EmergencyOverview analytics={data} getPercentage={getPercentage} />;
    case 'hospital':
      return <HospitalOverview analytics={data} getPercentage={getPercentage} />;
    default:
      return <SystemOverview analytics={data} getPercentage={getPercentage} />;
  }
};

const StatBubble = ({ label, value, subText, icon, color, bg }) => (
  <div className="p-3 sm:p-6 rounded-3xl bg-white/5 border border-white/10 transition-transform hover:scale-[1.02]">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-xl ${bg} ${color}`}>
        {icon}
      </div>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
    </div>
    <p className="text-sm font-medium opacity-70 mb-0.5">{label}</p>
    {subText && <p className="text-[10px] opacity-40 font-normal uppercase tracking-widest">{subText}</p>}
  </div>
);

const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5 border border-white/10">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-muted/50 rounded-lg">
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
    </div>
    {children}
  </div>
);

const EmergencyOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Requests" value={analytics.total || 0} icon={<AlertTriangle />} color="text-red-500" bg="bg-red-500/10" />
      <StatBubble label="Critical" value={analytics.critical || 0} subText={`${getPercentage(analytics.critical, analytics.total)}% of total`} icon={<Siren className="h-5 w-5" />} color="text-destructive" bg="bg-destructive/10" />
      <StatBubble label="Avg Response" value={`${(analytics.avgResponseTime || 12).toFixed(1)}m`} icon={<Clock />} color="text-blue-500" bg="bg-blue-500/10" />
      <StatBubble label="Active" value={analytics.active || 0} icon={<Activity />} color="text-green-500" bg="bg-green-500/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="Priority Breakdown" icon={<Flag className="text-orange-500" />}>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <span className="text-sm font-medium text-destructive">Critical</span>
            <span className="font-bold text-destructive">{analytics.critical || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <span className="text-sm font-medium text-orange-500">High Priority</span>
            <span className="font-bold text-orange-500">{analytics.high || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-sm font-medium text-blue-500">Medium Priority</span>
            <span className="font-bold text-blue-500">{analytics.medium || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <span className="text-sm font-medium text-green-500">Low Priority</span>
            <span className="font-bold text-green-500">{analytics.low || 0}</span>
          </div>
        </div>
      </GlassCard>
      <GlassCard title="Status Distribution" icon={<Activity className="text-primary" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Pending</span>
            <div className="flex items-center gap-3 flex-1 px-4">
              <div className="h-1.5 flex-1 bg-muted/50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${getPercentage(analytics.pending, analytics.total)}%` }} className="h-full bg-info" />
              </div>
            </div>
            <span className="text-sm font-semibold w-8 text-right">{analytics.pending || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">In Progress</span>
            <div className="flex items-center gap-3 flex-1 px-4">
              <div className="h-1.5 flex-1 bg-muted/50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${getPercentage(analytics.active - (analytics.pending || 0), analytics.total)}%` }} className="h-full bg-warning" />
              </div>
            </div>
            <span className="text-sm font-semibold w-8 text-right">{analytics.active - (analytics.pending || 0) || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Completed</span>
            <div className="flex items-center gap-3 flex-1 px-4">
              <div className="h-1.5 flex-1 bg-muted/50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${getPercentage(analytics.completed, analytics.total)}%` }} className="h-full bg-success" />
              </div>
            </div>
            <span className="text-sm font-semibold w-8 text-right">{analytics.completed || 0}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

const HospitalOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Hospitals" value={analytics.total || 0} icon={<Hospital />} color="text-primary" bg="bg-primary/10" />
      <StatBubble label="Available" value={analytics.available || 0} subText={`${getPercentage(analytics.available, analytics.total)}% ready`} icon={<CheckCircle />} color="text-green-500" bg="bg-green-500/10" />
      <StatBubble label="Capacity Full" value={analytics.full || 0} icon={<AlertTriangle />} color="text-destructive" bg="bg-destructive/10" />
      <StatBubble label="Total Beds" value={analytics.totalBeds || 0} icon={<Bed />} color="text-blue-500" bg="bg-blue-500/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="Network Status" icon={<Activity className="text-primary" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <span className="text-sm">Verified Partners</span>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="font-semibold">{analytics.verified || 0}</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <span className="text-sm">Verification Rate</span>
            <span className="font-semibold text-primary">{getPercentage(analytics.verified, analytics.total)}%</span>
          </div>
        </div>
      </GlassCard>
      <GlassCard title="Fleet Resources" icon={<Ambulance className="text-orange-500" />}>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-muted/50 text-center">
            <p className="text-xs opacity-60 uppercase mb-1">Total Ambulances</p>
            <p className="text-2xl font-bold">{analytics.totalAmbulances || 0}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/50 text-center">
            <p className="text-xs opacity-60 uppercase mb-1">Avg Fleet Size</p>
            <p className="text-2xl font-bold text-orange-500">
              {analytics.total ? Math.round((analytics.totalAmbulances || 0) / analytics.total) : 0}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

const SupportOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Tickets" value={analytics.total || 0} icon={<Headphones />} color="text-primary" bg="bg-primary/10" />
      <StatBubble label="Resolved" value={analytics.resolved || 0} subText={`${getPercentage(analytics.resolved, analytics.total)}% rate`} icon={<CheckCircle />} color="text-green-500" bg="bg-green-500/10" />
      <StatBubble label="Avg Response" value={`${Math.round(analytics.averageResolutionTime || 0)}h`} icon={<Clock />} color="text-blue-500" bg="bg-blue-500/10" />
      <StatBubble label="High Priority" value={analytics.byPriority?.high || 0} icon={<AlertTriangle />} color="text-orange-500" bg="bg-orange-500/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="By Status" icon={<BarChart3 className="text-primary" />}>
        <div className="space-y-4">
          {Object.entries(analytics.byStatus || {}).sort(([, a], [, b]) => b - a).map(([status, count]) => (
            <div key={status} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{status.replace('_', ' ')}</span>
                <span className="opacity-60">{count}</span>
              </div>
              <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${getPercentage(count, analytics.total)}%` }} className="h-full bg-primary" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard title="Categories" icon={<Tag className="text-orange-500" />}>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(analytics.byCategory || {}).map(([cat, count]) => (
            <div key={cat} className="p-4 rounded-2xl bg-muted/50 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest opacity-50 mb-1">{cat.replace('_', ' ')}</span>
              <span className="text-xl font-bold">{count}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  </div>
);

const UserOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Users" value={analytics.totalUsers || 0} icon={<Users />} color="text-primary" bg="bg-primary/10" />
      <StatBubble label="Verified" value={analytics.verifiedUsers || 0} subText={`${getPercentage(analytics.verifiedUsers, analytics.totalUsers)}%`} icon={<UserCheck />} color="text-green-500" bg="bg-green-500/10" />
      <StatBubble label="Profiles" value={analytics.totalProfiles || 0} icon={<Activity />} color="text-blue-500" bg="bg-blue-500/10" />
      <StatBubble label="Recent" value={analytics.recentSignups || 0} subText="Last 30 days" icon={<TrendingUp />} color="text-orange-500" bg="bg-orange-500/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="Role Distribution" icon={<Shield className="text-primary" />}>
        <div className="space-y-4">
          {Object.entries(analytics.roleDistribution || {}).map(([role, count]) => (
            <div key={role} className="flex items-center justify-between">
              <span className="capitalize text-sm">{role}</span>
              <div className="flex items-center gap-3 flex-1 px-4">
                <div className="h-1.5 flex-1 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${getPercentage(count, analytics.totalUsers)}%` }} className="h-full bg-primary" />
                </div>
              </div>
              <span className="text-sm font-semibold w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard title="Engagement" icon={<Activity className="text-blue-500" />}>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50">
            <span className="text-sm">Profile Completion</span>
            <span className="font-bold text-blue-500">{getPercentage(analytics.totalProfiles, analytics.totalUsers)}%</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50">
            <span className="text-sm">Identity Verification</span>
            <span className="font-bold text-green-500">{getPercentage(analytics.verifiedUsers, analytics.totalUsers)}%</span>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

const SubscriptionOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Subscribers" value={analytics.total || 0} icon={<Mail />} color="text-indigo-500" bg="bg-indigo-500/10" />
      <StatBubble label="Active" value={analytics.active || 0} subText={`${getPercentage(analytics.active, analytics.total)}% active`} icon={<CheckCircle />} color="text-green-500" bg="bg-green-500/10" />
      <StatBubble label="Conversion" value={`${analytics.paidConversionRate || 0}%`} subText="Free to Paid" icon={<TrendingUp />} color="text-orange-500" bg="bg-orange-500/10" />
      <StatBubble label="Recent" value={analytics.recentSubscriptions || 0} icon={<Activity />} color="text-blue-500" bg="bg-blue-500/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="Tier Distribution" icon={<BarChart3 className="text-indigo-500" />}>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 text-center">
            <p className="text-sm opacity-60 mb-1">Premium</p>
            <p className="text-3xl font-bold text-primary">{analytics.paid || 0}</p>
          </div>
          <div className="p-6 rounded-[24px] bg-muted/50 text-center">
            <p className="text-sm opacity-60 mb-1">Free Tier</p>
            <p className="text-3xl font-bold">{analytics.free || 0}</p>
          </div>
        </div>
      </GlassCard>
      <GlassCard title="Performance" icon={<TrendingUp className="text-green-500" />}>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
            <span className="text-sm">Engagement Rate</span>
            <span className="font-semibold">{getPercentage(analytics.active, analytics.total)}%</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
            <span className="text-sm">Growth (30d)</span>
            <span className="font-semibold text-green-500">+{getPercentage(analytics.recentSubscriptions, analytics.total)}%</span>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

const InsuranceOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Policies" value={analytics.total || 0} icon={<Shield />} color="text-purple-500" bg="bg-purple-500/10" />
      <StatBubble label="Active" value={analytics.active || 0} icon={<CheckCircle />} color="text-green-500" bg="bg-green-500/10" />
      <StatBubble label="Verified" value={analytics.verified || 0} subText={`${getPercentage(analytics.verified, analytics.total)}%`} icon={<Shield />} color="text-indigo-500" bg="bg-indigo-500/10" />
      <StatBubble label="Expiring" value={analytics.expiringSoon || 0} icon={<AlertTriangle />} color="text-orange-500" bg="bg-orange-500/10" />
    </div>
    <div className="grid grid-cols-1 gap-6">
      <GlassCard title="Providers Breakdown" icon={<Building className="text-purple-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analytics.byProvider || {}).map(([provider, count]) => (
            <div key={provider} className="p-4 rounded-2xl bg-muted/50 flex justify-between items-center">
              <span className="text-sm font-medium truncate mr-4">{provider}</span>
              <Badge variant="secondary" className="rounded-lg">{count}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  </div>
);

const VisitOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Visits" value={analytics.total_visits || 0} icon={<Calendar />} color="text-cyan-500" bg="bg-cyan-500/10" />
      <StatBubble label="Completed" value={analytics.completed_visits || 0} icon={<CheckCircle />} color="text-green-500" bg="bg-green-500/10" />
      <StatBubble label="Scheduled" value={analytics.scheduled_visits || 0} icon={<Clock />} color="text-blue-500" bg="bg-blue-500/10" />
      <StatBubble label="Completion" value={`${analytics.completionRate || 0}%`} icon={<TrendingUp />} color="text-primary" bg="bg-primary/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="Visit Status" icon={<Activity className="text-cyan-500" />}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm">Cancelled</span>
            <span className="font-semibold text-red-500">{analytics.cancelled_visits || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">No Show</span>
            <span className="font-semibold text-orange-500">{analytics.no_show_visits || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Today</span>
            <span className="font-semibold text-green-500">{analytics.completed_today || 0}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

const DoctorOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Total Doctors" value={analytics.total || 0} icon={<Stethoscope />} color="text-primary" bg="bg-primary/10" />
      <StatBubble label="Available" value={analytics.available || 0} subText="Ready to assist" icon={<CheckCircle />} color="text-green-500" bg="bg-green-500/10" />
      <StatBubble label="Busy" value={analytics.busy || 0} icon={<Activity />} color="text-orange-500" bg="bg-orange-500/10" />
      <StatBubble label="Off Duty" value={analytics.off_duty || 0} icon={<Clock />} color="text-muted-foreground" bg="bg-muted/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="Resources" icon={<Activity className="text-primary" />}>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
            <span className="text-sm">Available %</span>
            <span className="font-semibold text-green-500">{getPercentage(analytics.available, analytics.total)}%</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
            <span className="text-sm">Utilization</span>
            <span className="font-semibold text-orange-500">{getPercentage(analytics.busy, analytics.total)}%</span>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

const SystemOverview = ({ analytics, getPercentage }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBubble label="Active Emergencies" value={analytics.totalEmergencies || 0} icon={<AlertTriangle />} color="text-red-500" bg="bg-red-500/10" />
      <StatBubble label="Response Time" value={`${(analytics.avgResponseTime || 0).toFixed(1)}m`} icon={<Clock />} color="text-blue-500" bg="bg-blue-500/10" />
      <StatBubble label="System Users" value={analytics.totalUsers || 0} icon={<Users />} color="text-primary" bg="bg-primary/10" />
      <StatBubble label="Success Rate" value={`${analytics.successRate || 0}%`} icon={<Activity />} color="text-green-500" bg="bg-green-500/10" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <GlassCard title="Resources" icon={<Activity className="text-primary" />}>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Hospitals</span>
            <span className="font-bold">{analytics.totalHospitals || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Ambulances</span>
            <span className="font-bold">{analytics.totalAmbulances || 0}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);
