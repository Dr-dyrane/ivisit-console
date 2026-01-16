import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Save, ExternalLink, Calendar, Globe, Tag, Newspaper } from 'lucide-react';
import { toast } from 'sonner';

export const HealthNewsModal = ({ 
  news, 
  mode, 
  onClose, 
  onSave, 
  icons, 
  categories, 
  sources 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    source: '',
    category: 'general',
    icon: 'medical-outline',
    url: '',
    published: true,
    description: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (news && mode === 'edit') {
      setFormData({
        title: news.title || '',
        source: news.source || '',
        category: news.category || 'general',
        icon: news.icon || 'medical-outline',
        url: news.url || '',
        published: news.published !== undefined ? news.published : true,
        description: news.description || '',
        content: news.content || ''
      });
    } else {
      setFormData({
        title: '',
        source: '',
        category: 'general',
        icon: 'medical-outline',
        url: '',
        published: true,
        description: '',
        content: ''
      });
    }
  }, [news, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'create') {
        await onSave(formData);
        toast.success('Health news created successfully');
      } else {
        await onSave(news.id, formData);
        toast.success('Health news updated successfully');
      }
      onClose();
    } catch (error) {
      toast.error(`Failed to ${mode} health news`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getIconEmoji = (iconValue) => {
    const icon = icons.find(i => i.value === iconValue);
    return icon ? icon.icon : '📰';
  };

  return (
    <AnimatePresence>
      {mode && (
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
            className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <Card className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Newspaper className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">
                    {mode === 'create' ? 'Create Health News' : 'Edit Health News'}
                  </h2>
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title and Icon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter news title..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={formData.icon}
                        onChange={(e) => handleChange('icon', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {icons.map(icon => (
                          <option key={icon.value} value={icon.value}>
                            {icon.icon} {icon.label}
                          </option>
                        ))}
                      </select>
                      <div className="text-2xl p-2 border rounded-lg">
                        {getIconEmoji(formData.icon)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="inline h-4 w-4 mr-1" />
                      Source *
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => handleChange('source', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select source...</option>
                      {sources.map(source => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="inline h-4 w-4 mr-1" />
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ExternalLink className="inline h-4 w-4 mr-1" />
                    URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleChange('url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/news-article"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the news..."
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Full news content..."
                  />
                </div>

                {/* Published Status */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => handleChange('published', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Publish immediately
                    </span>
                  </label>
                  
                  <Badge variant={formData.published ? 'success' : 'secondary'}>
                    {formData.published ? 'Will be published' : 'Will be draft'}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !formData.title || !formData.source}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : (mode === 'create' ? 'Create News' : 'Update News')}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
