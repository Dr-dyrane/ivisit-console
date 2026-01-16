import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, BarChart3, TrendingUp, Calendar, Headphones, CheckCircle, Clock, Flag, Tag } from 'lucide-react';

export const SupportAnalyticsModal = ({ open, onClose, analytics }) => {
  if (!analytics) return null;

  const getPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'red',
      in_progress: 'yellow',
      resolved: 'green',
      closed: 'gray'
    };
    return colors[status] || 'gray';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'blue',
      normal: 'green',
      high: 'orange',
      urgent: 'red'
    };
    return colors[priority] || 'gray';
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <Card className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">Support Tickets Analytics</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Tickets</p>
                      <p className="text-3xl font-bold text-blue-900">{analytics.total}</p>
                    </div>
                    <Headphones className="h-8 w-8 text-blue-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Resolved</p>
                      <p className="text-3xl font-bold text-green-900">{analytics.resolved}</p>
                      <p className="text-xs text-green-600">
                        {getPercentage(analytics.resolved, analytics.total)}% resolution rate
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">This Week</p>
                      <p className="text-3xl font-bold text-purple-900">{analytics.recent}</p>
                      <p className="text-xs text-purple-600">
                        New tickets
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Avg Resolution</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {Math.round(analytics.averageResolutionTime || 0)}h
                      </p>
                      <p className="text-xs text-orange-600">
                        Response time
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Status */}
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="text-lg font-semibold">By Status</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(analytics.byStatus || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 bg-${getStatusColor(status)}-500 rounded-full mr-3`}></div>
                            <span className="text-sm font-medium capitalize">
                              {status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(status)}>{count}</Badge>
                            <span className="text-xs text-gray-500">
                              ({getPercentage(count, analytics.total)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>

                {/* By Priority */}
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <Flag className="h-5 w-5 text-orange-500 mr-2" />
                    <h3 className="text-lg font-semibold">By Priority</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(analytics.byPriority || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 bg-${getPriorityColor(priority)}-500 rounded-full mr-3`}></div>
                            <span className="text-sm font-medium capitalize">{priority}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(priority)}>{count}</Badge>
                            <span className="text-xs text-gray-500">
                              ({getPercentage(count, analytics.total)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>

              {/* By Category */}
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center mb-4">
                  <Tag className="h-5 w-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold">By Category</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(analytics.byCategory || {})
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {category.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getPercentage(count, analytics.total)}%
                        </p>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Key Insights */}
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold">Key Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round((analytics.resolved / analytics.total) * 100) || 0}%
                    </p>
                    <p className="text-sm text-gray-600">Resolution Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.recent > 0 ? '+' + analytics.recent : '0'}
                    </p>
                    <p className="text-sm text-gray-600">Weekly Growth</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(analytics.byStatus || {}).length}
                    </p>
                    <p className="text-sm text-gray-600">Status Types</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(analytics.averageResolutionTime || 0)}h
                    </p>
                    <p className="text-sm text-gray-600">Avg Response</p>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
