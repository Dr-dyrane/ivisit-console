import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, FileText, Download, TrendingUp, Calendar, Filter, BarChart3, Activity, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const REPORT_TYPES = [
  {
    id: 'emergency',
    name: 'Emergency Response',
    description: 'Complete emergency response analytics and trends',
    icon: AlertTriangle,
    color: 'destructive',
    dataKeys: ['totalEmergencies', 'avgResponseTime', 'successRate', 'responseTimeData', 'requestsByStatus']
  },
  {
    id: 'performance',
    name: 'System Performance',
    description: 'Overall system health and performance metrics',
    icon: Activity,
    color: 'success',
    dataKeys: ['totalUsers', 'totalHospitals', 'totalAmbulances', 'completionRate']
  },
  {
    id: 'usage',
    name: 'Usage Analytics',
    description: 'User engagement and platform usage patterns',
    icon: Users,
    color: 'primary',
    dataKeys: ['requestsByDay', 'emergencyTypes', 'dominantType']
  },
  {
    id: 'operations',
    name: 'Operations Summary',
    description: 'Daily operational metrics and KPIs',
    icon: Clock,
    color: 'info',
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
      console.error('Missing report or analytics data:', { report, analyticsData });
      toast.error('Unable to generate report - missing data');
      return;
    }

    console.log('Generating report for:', reportType, 'with data:', analyticsData);

    const csvData = [];
    
    // Header
    csvData.push([`${report.name} Report`]);
    csvData.push([`Time Range: ${TIME_RANGES.find(tr => tr.value === selectedTimeRange)?.label}`]);
    csvData.push([`Generated: ${new Date().toLocaleString()}`]);
    csvData.push([]);

    // Add relevant data based on report type
    switch (reportType) {
      case 'emergency':
        csvData.push(['Emergency Response Metrics']);
        csvData.push(['Metric', 'Value', 'Status']);
        csvData.push(['Total Emergencies', analyticsData.totalEmergencies || 0, '']);
        csvData.push(['Average Response Time', `${analyticsData.avgResponseTime || 0} minutes`, '']);
        csvData.push(['Success Rate', `${analyticsData.successRate || 0}%`, '']);
        csvData.push([]);
        
        if (analyticsData.requestsByStatus?.length) {
          csvData.push(['Request Status Breakdown']);
          csvData.push(['Status', 'Count', 'Percentage']);
          const total = analyticsData.requestsByStatus.reduce((sum, s) => sum + s.value, 0);
          analyticsData.requestsByStatus.forEach(status => {
            csvData.push([status.name, status.value, `${Math.round((status.value / total) * 100)}%`]);
          });
        }
        break;

      case 'performance':
        csvData.push(['System Performance Metrics']);
        csvData.push(['Metric', 'Value', 'Target']);
        csvData.push(['Total Users', analyticsData.totalUsers || 0, '1000+']);
        csvData.push(['Total Hospitals', analyticsData.totalHospitals || 0, '50+']);
        csvData.push(['Total Ambulances', analyticsData.totalAmbulances || 0, '20+']);
        csvData.push(['Completion Rate', `${analyticsData.successRate || 0}%`, '95%+']);
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
        
        if (analyticsData.emergencyTypes?.length) {
          csvData.push([]);
          csvData.push(['Emergency Types']);
          csvData.push(['Type', 'Count', 'Percentage']);
          const total = analyticsData.emergencyTypes.reduce((sum, t) => sum + t.value, 0);
          analyticsData.emergencyTypes.forEach(type => {
            csvData.push([type.name, type.value, `${Math.round((type.value / total) * 100)}%`]);
          });
        }
        break;

      case 'operations':
        csvData.push(['Operations Summary']);
        csvData.push(['KPI', 'Current Value', 'Previous Period', 'Change']);
        csvData.push(['Average Response Time', `${analyticsData.avgResponseTime || 0} min`, '12.5 min', '-15%']);
        csvData.push(['Success Rate', `${analyticsData.successRate || 0}%`, '92%', '+3%']);
        csvData.push(['Available Ambulances', analyticsData.totalAmbulances || 0, '18', '+11%']);
        csvData.push(['Active Hospitals', analyticsData.totalHospitals || 0, '42', '+7%']);
        break;
    }

    // Convert to CSV and download
    const csvString = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    console.log('CSV generated:', csvString.substring(0, 200) + '...');
    
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
      // Generate individual reports for each selected type
      for (let i = 0; i < selectedReports.length; i++) {
        const reportId = selectedReports[i];
        const report = REPORT_TYPES.find(r => r.id === reportId);
        
        // Show progress for each report
        toast.info(`Generating ${report.name} report... (${i + 1}/${selectedReports.length})`);
        
        await new Promise(resolve => setTimeout(resolve, 800)); // Slightly longer delay for better UX
        generateIndividualCSV(reportId);
      }
      
      toast.success(`Generated ${selectedReports.length} report(s) successfully`);
    } catch (error) {
      console.error('Error generating reports:', error);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <Card className="p-6 border-0 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 squircle bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analytics Reports</h2>
                    <p className="text-sm text-muted-foreground">Generate and download detailed reports</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Time Range Selector */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Time Range</label>
                <div className="flex gap-2 flex-wrap">
                  {TIME_RANGES.map(range => (
                    <Button
                      key={range.value}
                      variant={selectedTimeRange === range.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTimeRange(range.value)}
                      className="text-xs"
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Report Types Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {REPORT_TYPES.map(report => (
                  <motion.div
                    key={report.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`p-4 cursor-pointer border-2 transition-all ${
                        selectedReports.includes(report.id) 
                          ? `border-${report.color} bg-${report.color}/5` 
                          : 'border-border hover:border-muted-foreground/20'
                      }`}
                      onClick={() => toggleReport(report.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 squircle bg-${report.color}/10 flex items-center justify-center flex-shrink-0`}>
                          <report.icon className={`h-5 w-5 text-${report.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-sm">{report.name}</h3>
                            {selectedReports.includes(report.id) && (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{report.description}</p>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {report.dataKeys.length} metrics
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button
                  variant="outline"
                  onClick={downloadAllReports}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All Reports
                </Button>
                <div className="flex gap-2">
                  {selectedReports.map(reportId => {
                    const report = REPORT_TYPES.find(r => r.id === reportId);
                    return (
                      <Button
                        key={reportId}
                        variant="outline"
                        size="sm"
                        onClick={() => generateIndividualCSV(reportId)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {report?.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {selectedReports.length > 0 && (
                    <span>{selectedReports.length} report{selectedReports.length > 1 ? 's' : ''} selected</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={generateCombinedReport}
                    disabled={selectedReports.length === 0 || isGenerating}
                    className="min-w-[140px]"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
