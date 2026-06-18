import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Star,
  Zap,
  BarChart3,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  UserPlus,
  Settings,
  Download
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

const HospitalFleetManager = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with real API calls
  const [fleetStats] = useState({
    totalStaff: 45,
    onDuty: 28,
    available: 12,
    onBreak: 5,
    utilization: 78,
    responseTime: 4.2,
    completedTrips: 156,
    rating: 4.8
  });

  const [staffMembers] = useState([
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      role: 'Emergency Physician',
      status: 'on-duty',
      location: 'Emergency Room',
      currentAssignment: 'Trauma Case #234',
      performance: { responseTime: 3.2, completedCases: 12, rating: 4.9 },
      avatar: 'SJ'
    },
    {
      id: 2,
      name: 'James Wilson',
      role: 'Ambulance Driver',
      status: 'available',
      location: 'Station A',
      currentAssignment: null,
      performance: { responseTime: 2.8, completedTrips: 8, rating: 4.7 },
      avatar: 'JW'
    },
    {
      id: 3,
      name: 'Nurse Emily Davis',
      role: 'ER Nurse',
      status: 'on-break',
      location: 'Break Room',
      currentAssignment: null,
      performance: { responseTime: 4.1, completedCases: 15, rating: 4.8 },
      avatar: 'ED'
    },
    {
      id: 4,
      name: 'Dr. Michael Chen',
      role: 'Surgeon',
      status: 'on-duty',
      location: 'Operating Room 3',
      currentAssignment: 'Emergency Surgery',
      performance: { responseTime: 5.2, completedCases: 6, rating: 4.9 },
      avatar: 'MC'
    }
  ]);

  const [recentActivity] = useState([
    {
      id: 1,
      type: 'emergency',
      staff: 'Dr. Sarah Johnson',
      action: 'Assigned to trauma case',
      time: '2 minutes ago',
      priority: 'high'
    },
    {
      id: 2,
      type: 'completion',
      staff: 'James Wilson',
      action: 'Completed ambulance transport',
      time: '5 minutes ago',
      priority: 'normal'
    },
    {
      id: 3,
      type: 'break',
      staff: 'Nurse Emily Davis',
      action: 'Started break',
      time: '15 minutes ago',
      priority: 'low'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'on-duty': return 'bg-green-100 text-green-800 border-green-200';
      case 'available': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on-break': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'off-duty': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      case 'completion': return <CheckCircle className="w-4 h-4" />;
      case 'break': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Manager</h1>
          <p className="text-gray-600 mt-1">Manage your hospital staff like an Uber fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{fleetStats.totalStaff}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On Duty</p>
                <p className="text-2xl font-bold text-green-600">{fleetStats.onDuty}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{fleetStats.utilization}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Progress value={fleetStats.utilization} className="mt-3" />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">{fleetStats.responseTime}m</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            {['overview', 'staff', 'analytics'].map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className="capitalize"
              >
                {tab}
              </Button>
            ))}
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1 border rounded-lg text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Staff List */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Staff Status</h3>
                <div className="space-y-3">
                  {filteredStaff.map(staff => (
                    <motion.div
                      key={staff.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                          {staff.avatar}
                        </div>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-sm text-gray-500">{staff.role}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{staff.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(staff.status)}>
                          {staff.status.replace('-', ' ')}
                        </Badge>
                        {staff.currentAssignment && (
                          <p className="text-xs text-gray-500 mt-1">{staff.currentAssignment}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.map(activity => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getPriorityColor(activity.priority)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.staff}</p>
                        <p className="text-xs text-gray-500">{activity.action}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Staff Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Staff</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Response Time</th>
                      <th className="text-left py-3 px-4">Completed</th>
                      <th className="text-left py-3 px-4">Rating</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map(staff => (
                      <motion.tr
                        key={staff.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                              {staff.avatar}
                            </div>
                            <span className="font-medium">{staff.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{staff.role}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(staff.status)}>
                            {staff.status.replace('-', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">{staff.performance.responseTime}m</td>
                        <td className="py-3 px-4 text-sm">
                          {staff.performance.completedCases || staff.performance.completedTrips}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm">{staff.performance.rating}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Response Time</span>
                      <span className="text-sm text-gray-500">4.2m avg</span>
                    </div>
                    <Progress value={84} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Staff Utilization</span>
                      <span className="text-sm text-gray-500">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Patient Satisfaction</span>
                      <span className="text-sm text-gray-500">4.8/5.0</span>
                    </div>
                    <Progress value={96} className="h-2" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-3" />
                    Manage Staff Schedules
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-3" />
                    Generate Performance Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-3" />
                    Fleet Settings
                  </Button>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HospitalFleetManager;
