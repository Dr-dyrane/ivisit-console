import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { usePageData } from '../../contexts/PageDataContext';
import {
  AlertTriangle,
  Activity,
  Users,
  Hospital,
  Ambulance,
  MapPin,
  Clock,
  TrendingUp,
  Filter,
  Zap,
  Heart,
  Sparkles,
  BarChart3,
  Stethoscope,
  Calendar,
  Shield,
  Settings,
  Map,
  UserCheck,
  CheckCircle,
  Newspaper,
  Eye,
  EyeOff,
  Plus,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

export const ContextPanel = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const {
    emergencyData,
    analyticsData,
    doctorsData,
    visitsData,
    verificationData,
    loading,
    getEmergencyStats,
    useMockData
  } = usePageData();

  const emergencyStats = getEmergencyStats();

  const getPageContextHeader = () => {
    const headers = {
      '/': { title: 'System Overview', subtitle: 'Live Dashboard' },
      '/emergencies': { title: 'Emergency Context', subtitle: 'Response Operations' },
      '/users': { title: 'User Management', subtitle: 'Access Control' },
      '/verification': { title: 'Verification Queue', subtitle: 'Identity Verification' },
      '/analytics': { title: 'Analytics', subtitle: 'Performance Metrics' },
      '/doctors': { title: 'Doctor Operations', subtitle: 'Medical Staff' },
      '/visits': { title: 'Visit Management', subtitle: 'Patient Appointments' },
      '/hospitals': { title: 'Hospital Ops', subtitle: 'Facility Management' },
      '/ambulances': { title: 'Fleet Control', subtitle: 'Ambulance Operations' },
      '/health-news': { title: 'Health News', subtitle: 'Content Management' },
      '/support-tickets': { title: 'Support', subtitle: 'Ticket Management' },
      '/insurance': { title: 'Insurance', subtitle: 'Policy Management' },
      '/map': { title: 'Map Intelligence', subtitle: 'Location Services' },
      '/settings': { title: 'System Settings', subtitle: 'Configuration' }
    };

    const currentHeader = Object.keys(headers).find(key =>
      currentPath === key || currentPath.startsWith(key + '/')
    ) || { title: 'Context Panel', subtitle: 'Smart Context' };

    return currentHeader;
  };

  const renderPanelHeader = () => {
    const { title, subtitle } = getPageContextHeader();

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-2 border-b border-border/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            {!useMockData && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 geo-round bg-success"
              />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderEmergencyPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Data Source Indicator */}
        {useMockData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-2 geo-sharp bg-warning/10 border border-warning/20 rounded-lg"
          >
            <div className="flex items-center gap-2 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">Using Mock Data</span>
            </div>
          </motion.div>
        )}

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Emergency Overview</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Critical</span>
                  <p className="text-xs text-muted-foreground">Immediate attention</p>
                </div>
              </div>
              <Badge className="bg-destructive/20 text-destructive border-0">{emergencyStats.critical}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Pending</span>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </div>
              </div>
              <Badge className="bg-warning/20 text-warning border-0">{emergencyStats.pending}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-info" />
                </div>
                <div>
                  <span className="font-black tracking-tight">In Progress</span>
                  <p className="text-xs text-muted-foreground">Being handled</p>
                </div>
              </div>
              <Badge className="bg-info/20 text-info border-0">{emergencyStats.inProgress}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Total Requests</span>
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">{emergencyStats.total}</Badge>
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>

          <div className="space-y-2">
            {emergencyData.slice(0, 3).map((request) => (
              <Card key={request.id} className="glass-strong squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 geo-round ${request.priority === 'critical' ? 'bg-destructive' :
                        request.priority === 'high' ? 'bg-warning' :
                          request.priority === 'medium' ? 'bg-info' : 'bg-success'
                      }`} />
                    <div>
                      <p className="font-medium text-sm">{request.patient_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {request.location || 'Unknown location'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {request.priority}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

          <button className="w-full p-4 geo-sharp glass-strong hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-black tracking-tight text-primary">New Emergency Request</span>
          </button>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderUsersPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Role Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Role Distribution</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <span className="font-black tracking-tight">Admins</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">2</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                  <Hospital className="h-5 w-5 text-info" />
                </div>
                <span className="font-black tracking-tight">Providers</span>
              </div>
              <Badge className="bg-info/20 text-info border-0">8</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-muted/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-black tracking-tight">Viewers</span>
              </div>
              <Badge className="bg-muted/20 text-muted-foreground border-0">15</Badge>
            </div>
          </Card>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderHospitalsPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Capacity Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Capacity Status</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                  <Hospital className="h-5 w-5 text-success" />
                </div>
                <span className="font-black tracking-tight">Available</span>
              </div>
              <Badge className="bg-success/20 text-success border-0">5</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                  <Ambulance className="h-5 w-5 text-warning" />
                </div>
                <span className="font-medium">Busy</span>
              </div>
              <Badge className="bg-warning/20 text-warning border-0">3</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <span className="font-medium">Full</span>
              </div>
              <Badge className="bg-destructive/20 text-destructive border-0">1</Badge>
            </div>
          </Card>
        </motion.div>

        {/* Location Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Location Filter</h3>

          <button className="w-full p-3 geo-sharp glass-strong hover:bg-muted/50 transition-colors flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Near Me</span>
          </button>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderAmbulancesPanel = () => (
    <div className="p-4 space-y-4">
      {/* Fleet Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Fleet Status</h3>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                <Ambulance className="h-4 w-4 text-success" />
              </div>
              <span className="font-medium">Available</span>
            </div>
            <Badge className="bg-success/20 text-success">8</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-info" />
              </div>
              <span className="font-medium">On Route</span>
            </div>
            <Badge className="bg-info/20 text-info">4</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <span className="font-medium">Busy</span>
            </div>
            <Badge className="bg-warning/20 text-warning">3</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Performance</h3>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Avg Response</span>
            </div>
            <Badge className="bg-primary/20 text-primary">4.2 min</Badge>
          </div>
        </Card>
      </motion.div>
    </div>
  );

  const renderMapPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Live Statistics (Mobile Parity) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Live Statistics</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Active Emergencies</span>
                  <p className="text-xs text-muted-foreground">Critical & High</p>
                </div>
              </div>
              <Badge className="bg-destructive/20 text-destructive border-0">{emergencyStats.critical + emergencyStats.pending}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                  <Ambulance className="h-5 w-5 text-success" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Available Units</span>
                  <p className="text-xs text-muted-foreground">Ready for dispatch</p>
                </div>
              </div>
              <Badge className="bg-success/20 text-success border-0">
                {/* Fallback estimation since we don't have direct ambulance status in emergencyStats */}
                {Math.max(0, 12 - emergencyStats.inProgress)}
              </Badge>
            </div>
          </Card>
        </motion.div>

        {/* Map Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Map Controls</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <Map className="h-5 w-5 text-primary" />
                </div>
                <span className="font-black tracking-tight">Live View</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">Active</Badge>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

          <button className="w-full p-4 geo-sharp glass-strong hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-black tracking-tight text-primary">Center Map</span>
          </button>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderAnalyticsPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Analytics Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Analytics Overview</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <span className="font-black tracking-tight">Total Requests</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">{analyticsData.totalRequests}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <span className="font-black tracking-tight">Completion Rate</span>
              </div>
              <Badge className="bg-success/20 text-success border-0">{analyticsData.completionRate}%</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <span className="font-black tracking-tight">Avg Response</span>
              </div>
              <Badge className="bg-info/20 text-info border-0">{Math.round((analyticsData.avgResponseTime || 0) * 10) / 10}m</Badge>
            </div>
          </Card>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderDoctorsPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Doctor Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Doctor Statistics</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <span className="font-black tracking-tight">Active Doctors</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">{doctorsData.totalDoctors}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-info" />
                </div>
                <span className="font-black tracking-tight">On Call</span>
              </div>
              <Badge className="bg-info/20 text-info border-0">{doctorsData.onCall}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <span className="font-black tracking-tight">Available</span>
              </div>
              <Badge className="bg-success/20 text-success border-0">{doctorsData.available}</Badge>
            </div>
          </Card>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderVisitsPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Visit Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Visit Statistics</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <span className="font-black tracking-tight">Today</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">{visitsData.today}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <span className="font-black tracking-tight">Pending</span>
              </div>
              <Badge className="bg-warning/20 text-warning border-0">{visitsData.pending}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <span className="font-black tracking-tight">Completed</span>
              </div>
              <Badge className="bg-success/20 text-success border-0">{visitsData.completed}</Badge>
            </div>
          </Card>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderVerificationPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Verification Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Verification Queue</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <span className="font-black tracking-tight">Pending</span>
              </div>
              <Badge className="bg-warning/20 text-warning border-0">{verificationData.pending}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <span className="font-black tracking-tight">Verified</span>
              </div>
              <Badge className="bg-success/20 text-success border-0">{verificationData.verified}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <span className="font-black tracking-tight">Total Users</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">{verificationData.total}</Badge>
            </div>
          </Card>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderHealthNewsPanel = () => {
    // Mock data for health news analytics - in real implementation, this would come from useHealthNews hook
    const newsStats = {
      total: 45,
      published: 32,
      draft: 13,
      thisWeek: 8,
      categories: 6
    };

    const handleCreateNews = () => {
      // Navigate to health news page with create modal open
      window.location.href = '/health-news?create=true';
    };

    const handleViewFilters = () => {
      // Trigger filter sheet open on health news page
      const event = new CustomEvent('openFilters');
      window.dispatchEvent(event);
    };

    const panel = (
      <div className="p-4 space-y-4">
        {/* News Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-3 bg-background/50 border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total News</span>
              <Newspaper className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground">{newsStats.total}</div>
            <div className="text-xs text-muted-foreground">All time articles</div>
          </Card>
        </motion.div>

        {/* Published vs Draft */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-2"
        >
          <Card className="p-3 bg-background/50 border-border/30">
            <div className="flex items-center justify-between mb-1">
              <Eye className="h-3 w-3 text-success" />
              <span className="text-xs text-success font-medium">Published</span>
            </div>
            <div className="text-lg font-bold">{newsStats.published}</div>
          </Card>
          <Card className="p-3 bg-background/50 border-border/30">
            <div className="flex items-center justify-between mb-1">
              <EyeOff className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Draft</span>
            </div>
            <div className="text-lg font-bold">{newsStats.draft}</div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-3 bg-background/50 border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">This Week</span>
              <TrendingUpIcon className="h-4 w-4 text-info" />
            </div>
            <div className="text-xl font-bold text-foreground">{newsStats.thisWeek}</div>
            <div className="text-xs text-muted-foreground">New articles</div>
          </Card>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-3 bg-background/50 border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Categories</span>
              <Filter className="h-4 w-4 text-warning" />
            </div>
            <div className="text-xl font-bold text-foreground">{newsStats.categories}</div>
            <div className="text-xs text-muted-foreground">Active categories</div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">Quick Actions</div>
            <div className="space-y-1">
              <div 
                onClick={handleCreateNews}
                className="p-2 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">Create News</span>
                </div>
              </div>
              <div 
                onClick={handleViewFilters}
                className="p-2 rounded-lg bg-background/30 border border-border/20 hover:bg-background/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">View All Filters</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );

    return panel;
  };

  const renderSupportTicketsPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-3 bg-background/50 border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Support Queue</span>
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground">12</div>
            <div className="text-xs text-muted-foreground">Active tickets</div>
          </Card>
        </motion.div>
      </div>
    );

    return panel;
  };

  const renderInsurancePanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-3 bg-background/50 border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Insurance</span>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground">28</div>
            <div className="text-xs text-muted-foreground">Active policies</div>
          </Card>
        </motion.div>
      </div>
    );

    return panel;
  };

  const renderSettingsPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Settings Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Settings</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-muted/20 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-black tracking-tight">General</span>
              </div>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="font-black tracking-tight">Security</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderDashboardPanel = () => {
    const panel = (
      <div className="p-4 space-y-4">
        {/* Data Source Indicator */}
        {useMockData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-2 geo-sharp bg-warning/10 border border-warning/20 rounded-lg"
          >
            <div className="flex items-center gap-2 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">Using Mock Data</span>
            </div>
          </motion.div>
        )}

        {/* App Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">App Overview</h3>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Active Emergencies</span>
                  <p className="text-xs text-muted-foreground">Critical & High</p>
                </div>
              </div>
              <Badge className="bg-destructive/20 text-destructive border-0">{emergencyStats.critical + emergencyStats.pending}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Total Users</span>
                  <p className="text-xs text-muted-foreground">All roles</p>
                </div>
              </div>
              <Badge className="bg-primary/20 text-primary border-0">{doctorsData.totalDoctors + 25}</Badge>
            </div>
          </Card>

          <Card className="glass-strong squircle-lg p-4 border-0 shadow-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <span className="font-black tracking-tight">Response Time</span>
                  <p className="text-xs text-muted-foreground">Average</p>
                </div>
              </div>
              <Badge className="bg-success/20 text-success border-0">{Math.round((analyticsData.avgResponseTime || 0) * 10) / 10}m</Badge>
            </div>
          </Card>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">System Health</h3>

          <div className="grid grid-cols-2 gap-2">
            <Card className="glass-strong squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                  <Hospital className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="font-black text-sm">{analyticsData.activeHospitals}</p>
                  <p className="text-xs text-muted-foreground">Hospitals</p>
                </div>
              </div>
            </Card>

            <Card className="glass-strong squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                  <Ambulance className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="font-black text-sm">{analyticsData.availableAmbulances}</p>
                  <p className="text-xs text-muted-foreground">Ambulances</p>
                </div>
              </div>
            </Card>

            <Card className="glass-strong squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                  <Stethoscope className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="font-black text-sm">{doctorsData.onCall}</p>
                  <p className="text-xs text-muted-foreground">On Call</p>
                </div>
              </div>
            </Card>

            <Card className="glass-strong squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="font-black text-sm">{verificationData.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
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
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

          <div className="space-y-2">
            <button className="w-full p-3 geo-sharp glass-strong hover:bg-destructive/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-black tracking-tight text-destructive">Emergency Response</span>
            </button>

            <button className="w-full p-3 geo-sharp glass-strong hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-black tracking-tight text-primary">View Analytics</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
    return panel;
  };

  const renderPanelWithHeader = (panelContent) => (
    <div className="h-full flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/20">
      {renderPanelHeader()}
      <div className="flex-1 overflow-y-auto">
        {panelContent}
      </div>
    </div>
  );

  // Render based on current path
  if (currentPath === '/' || currentPath === '') {
    return renderPanelWithHeader(renderDashboardPanel());
  } else if (currentPath.includes('/emergencies')) {
    return renderPanelWithHeader(renderEmergencyPanel());
  } else if (currentPath.includes('/users')) {
    return renderPanelWithHeader(renderUsersPanel());
  } else if (currentPath.includes('/hospitals')) {
    return renderPanelWithHeader(renderHospitalsPanel());
  } else if (currentPath.includes('/ambulances')) {
    return renderPanelWithHeader(renderAmbulancesPanel());
  } else if (currentPath.includes('/map')) {
    return renderPanelWithHeader(renderMapPanel());
  } else if (currentPath.includes('/analytics')) {
    return renderPanelWithHeader(renderAnalyticsPanel());
  } else if (currentPath.includes('/doctors')) {
    return renderPanelWithHeader(renderDoctorsPanel());
  } else if (currentPath.includes('/visits')) {
    return renderPanelWithHeader(renderVisitsPanel());
  } else if (currentPath.includes('/verification')) {
    return renderPanelWithHeader(renderVerificationPanel());
  } else if (currentPath.includes('/health-news')) {
    return renderPanelWithHeader(renderHealthNewsPanel());
  } else if (currentPath.includes('/support-tickets')) {
    return renderPanelWithHeader(renderSupportTicketsPanel());
  } else if (currentPath.includes('/insurance')) {
    return renderPanelWithHeader(renderInsurancePanel());
  } else if (currentPath.includes('/settings')) {
    return renderPanelWithHeader(renderSettingsPanel());
  }

  // Default panel
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
        <h3 className="font-black text-lg mb-2">Context Panel</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Navigate to a page to see relevant information and quick actions
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">Smart Context</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
