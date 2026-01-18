"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { X, FileText, Download, BarChart3, Activity, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  }
];

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' }
];

export const ReportsModal = ({ open, onClose, analyticsData, timeRange }) => {
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange || '30d');
  const [isGenerating, setIsGenerating] = useState(false);

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

    switch (reportType) {
      case 'emergency':
        csvData.push(['Emergency Response Metrics']);
        csvData.push(['Metric', 'Value', 'Status']);
        csvData.push(['Total Emergencies', analyticsData.totalEmergencies || 0, '']);
        csvData.push(['Average Response Time', `${analyticsData.avgResponseTime || 0} minutes`, '']);
        csvData.push(['Success Rate', `${analyticsData.successRate || 0}%`, '']);
        break;
      case 'performance':
        csvData.push(['System Performance Metrics']);
        csvData.push(['Metric', 'Value', 'Target']);
        csvData.push(['Total Users', analyticsData.totalUsers || 0, '1000+']);
        csvData.push(['Total Hospitals', analyticsData.totalHospitals || 0, '50+']);
        csvData.push(['Total Ambulances', analyticsData.totalAmbulances || 0, '20+']);
        break;
      case 'usage':
        csvData.push(['Usage Analytics']);
        if (analyticsData.requestsByDay?.length) {
          csvData.push(['Daily Request Volume']);
          csvData.push(['Date', 'Requests', 'Average Response Time']);
          analyticsData.requestsByDay.forEach(day => {
            csvData.push([day.day, day.requests, `${day.avgTime} min`]);
          });
        }
        break;
      case 'operations':
        csvData.push(['Operations Summary']);
        csvData.push(['KPI', 'Current Value', 'Previous Period', 'Change']);
        csvData.push(['Average Response Time', `${analyticsData.avgResponseTime || 0} min`, '12.5 min', '-15%']);
        break;
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
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
            className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground/90">Analytics Reports</h2>
                  <p className="text-sm text-muted-foreground">Generate and download detailed reports</p>
                </div>
                <div className="sm:hidden">
                  <h2 className="text-xl font-bold tracking-tight text-foreground/90">Reports</h2>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">

              {/* Time Range Selector */}
              <div className="p-4 sm:p-6 rounded-[28px] bg-muted/30 ">
                <p className="text-xs font-semibold opacity-70 mb-3 uppercase tracking-widest">Time Range</p>
                <div className="flex gap-2 flex-wrap">
                  {TIME_RANGES.map(range => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedTimeRange(range.value)}
                      className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                        selectedTimeRange === range.value 
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REPORT_TYPES.map(report => (
                  <motion.div
                    key={report.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleReport(report.id)}
                    className={`p-4 sm:p-5 rounded-[24px] cursor-pointer border-2 transition-all ${
                      selectedReports.includes(report.id) 
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
                          <h3 className="font-bold text-sm">{report.name}</h3>
                          {selectedReports.includes(report.id) && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{report.description}</p>
                        <div className="mt-2">
                          <span className="text-[10px] uppercase tracking-widest opacity-50">
                            {report.dataKeys.length} metrics
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="p-4 sm:p-6 rounded-[24px] bg-muted/30 ">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={downloadAllReports}
                    className="flex-1 rounded-2xl h-12 bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All Reports
                  </Button>
                </div>
                {selectedReports.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {selectedReports.map(reportId => {
                      const report = REPORT_TYPES.find(r => r.id === reportId);
                      return (
                        <Button
                          key={reportId}
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateIndividualCSV(reportId);
                          }}
                          className="text-xs rounded-xl bg-transparent"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {report?.name}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 sm:p-6 rounded-[24px] bg-muted/30  flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedReports.length > 0 && (
                    <span>{selectedReports.length} report{selectedReports.length > 1 ? 's' : ''} selected</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="rounded-2xl bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={generateCombinedReport}
                    disabled={selectedReports.length === 0 || isGenerating}
                    className="rounded-2xl min-w-[140px]"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Selected
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
