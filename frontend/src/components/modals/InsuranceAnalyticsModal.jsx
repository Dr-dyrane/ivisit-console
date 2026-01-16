import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, BarChart3, TrendingUp, Calendar, Shield, CheckCircle, AlertTriangle, Building, FileText } from 'lucide-react';

export const InsuranceAnalyticsModal = ({ open, onClose, analytics }) => {
  if (!analytics) return null;

  const getPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      expired: 'red',
      pending: 'yellow',
      suspended: 'gray'
    };
    return colors[status] || 'gray';
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
                  <h2 className="text-xl font-semibold">Insurance Analytics</h2>
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
                      <p className="text-sm text-blue-600 font-medium">Total Policies</p>
                      <p className="text-3xl font-bold text-blue-900">{analytics.total}</p>
                    </div>
                    <Shield className="h-8 w-8 text-blue-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Active</p>
                      <p className="text-3xl font-bold text-green-900">{analytics.active}</p>
                      <p className="text-xs text-green-600">
                        {getPercentage(analytics.active, analytics.total)}% of total
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Verified</p>
                      <p className="text-3xl font-bold text-purple-900">{analytics.verified}</p>
                      <p className="text-xs text-purple-600">
                        {getPercentage(analytics.verified, analytics.total)}% verified
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-purple-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Expiring Soon</p>
                      <p className="text-3xl font-bold text-orange-900">{analytics.expiringSoon}</p>
                      <p className="text-xs text-orange-600">
                        Need attention
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Provider */}
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <Building className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="text-lg font-semibold">By Provider</h3>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(analytics.byProvider || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([provider, count]) => (
                        <div key={provider} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium">{provider}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{count}</Badge>
                            <span className="text-xs text-gray-500">
                              ({getPercentage(count, analytics.total)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>

                {/* By Coverage Type */}
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="text-lg font-semibold">By Coverage Type</h3>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(analytics.byCoverageType || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([coverageType, count]) => (
                        <div key={coverageType} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium capitalize">
                              {coverageType.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{count}</Badge>
                            <span className="text-xs text-gray-500">
                              ({getPercentage(count, analytics.total)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>

              {/* By Status */}
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center mb-4">
                  <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold">By Status</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analytics.byStatus || {})
                    .sort(([,a], [,b]) => b - a)
                    .map(([status, count]) => (
                      <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <div className={`w-3 h-3 bg-${getStatusColor(status)}-500 rounded-full mr-2`}></div>
                          <Badge variant={getStatusColor(status)}>
                            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
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
                      {Math.round((analytics.active / analytics.total) * 100) || 0}%
                    </p>
                    <p className="text-sm text-gray-600">Active Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round((analytics.verified / analytics.total) * 100) || 0}%
                    </p>
                    <p className="text-sm text-gray-600">Verified Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(analytics.byProvider || {}).length}
                    </p>
                    <p className="text-sm text-gray-600">Providers</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.expired}
                    </p>
                    <p className="text-sm text-gray-600">Expired</p>
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
