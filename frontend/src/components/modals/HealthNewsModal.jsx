import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Save, ExternalLink, Calendar, Globe, Tag, Newspaper, Eye, EyeOff } from 'lucide-react';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { supabase } from '../../lib/supabase';

export const HealthNewsModal = ({ isOpen, onClose, news, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

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
    if (news && (isEdit || isView)) {
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
  }, [news, isEdit, isView]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isCreate) {
        const { data, error } = await supabase
          .from('health_news')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();

        if (error) throw error;

        await createNotification(
          NotificationTypes.NEWS,
          NotificationActions.CREATED,
          data[0].id,
          { message: `"${formData.title}" has been created` }
        );
        toast.success('Health news created successfully');
      } else if (isEdit) {
        const { data, error } = await supabase
          .from('health_news')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', news.id)
          .select();

        if (error) throw error;

        await createNotification(
          NotificationTypes.NEWS,
          NotificationActions.UPDATED,
          data[0].id,
          { message: `"${formData.title}" has been updated` }
        );
        toast.success('Health news updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving health news:', error);
      toast.error('Failed to save health news');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'general', 'medical', 'research', 'wellness', 'emergency', 'policy'
  ];

  const sources = [
    'Hospital Update', 'Medical Journal', 'Health Authority', 'Research Institute',
    'Government Health', 'WHO Update', 'CDC Alert', 'Medical News'
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            {isCreate && 'Create Health News'}
            {isEdit && 'Edit Health News'}
            {isView && 'Health News Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={isView}
                placeholder="Enter news title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
                disabled={isView}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map(source => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                disabled={isView}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                disabled={isView}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={isView}
              placeholder="Brief description of the news"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              disabled={isView}
              placeholder="Full news content"
              rows={6}
            />
          </div>

          {!isView && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                name="published"
                checked={formData.published}
                onChange={handleChange}
                className="rounded"
              />
              <Label htmlFor="published" className="flex items-center gap-2">
                {formData.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Published
              </Label>
            </div>
          )}

          {isView && (
            <div className="flex items-center space-x-2">
              <Badge className={formData.published ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                {formData.published ? 'Published' : 'Draft'}
              </Badge>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={loading}
            >
              Cancel
            </Button>
            
            {!isView && (
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : (isCreate ? 'Create' : 'Save')}
              </Button>
            )}
            
            {isView && formData.url && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(formData.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Link
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
