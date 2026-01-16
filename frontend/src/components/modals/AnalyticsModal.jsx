import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, BarChart3, TrendingUp, Calendar, Globe, Tag, Newspaper, Eye } from 'lucide-react';

export const AnalyticsModal = ({ open, onClose, analytics }) => {
  if (!analytics) return null;

  const getPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0;
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
            className="relative z-10 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <Card className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">Health News Analytics</h2>
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
                      <p className="text-sm text-blue-600 font-medium">Total News</p>
                      <p className="text-3xl font-bold text-blue-900">{analytics.total}</p>
                    </div>
                    <Newspaper className="h-8 w-8 text-blue-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Published</p>
                      <p className="text-3xl font-bold text-green-900">{analytics.published}</p>
                      <p className="text-xs text-green-600">
                        {getPercentage(analytics.published, analytics.total)}% of total
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-green-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">This Week</p>
                      <p className="text-3xl font-bold text-purple-900">{analytics.recent}</p>
                      <p className="text-xs text-purple-600">
                        New items
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Categories</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {Object.keys(analytics.byCategory || {}).length}
                      </p>
                      <p className="text-xs text-orange-600">
                        Active categories
                      </p>
                    </div>
                    <Tag className="h-8 w-8 text-orange-500" />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Source */}
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <Globe className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="text-lg font-semibold">By Source</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(analytics.bySource || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium">{source}</span>
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

                {/* By Category */}
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <Tag className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="text-lg font-semibold">By Category</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(analytics.byCategory || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium capitalize">{category}</span>
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

              {/* Trending Insights */}
              <Card className="p-6 mt-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold">Key Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round((analytics.published / analytics.total) * 100) || 0}%
                    </p>
                    <p className="text-sm text-gray-600">Publish Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.recent > 0 ? '+' + analytics.recent : '0'}
                    </p>
                    <p className="text-sm text-gray-600">Weekly Growth</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(analytics.bySource || {}).length}
                    </p>
                    <p className="text-sm text-gray-600">Active Sources</p>
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
