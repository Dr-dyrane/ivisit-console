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
import { X, Save, ExternalLink, Calendar, Globe, Tag, Newspaper, Eye, EyeOff, Plus, Edit } from 'lucide-react';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-2xl">
        <div className="bg-background/50 backdrop-blur-xs squircle-2xl overflow-hidden flex flex-col h-full bg-background/95 backdrop-blur-xl">

          {/* Bento Header */}
          <div className="relative p-6 pb-8 border-b border-border/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

            {/* Geometric Decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent opacity-50 blur-2xl rounded-bl-[100px]" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-info/10 to-transparent opacity-30 blur-2xl rounded-tr-[80px]" />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                  {isCreate && (
                    <>
                      <div className="p-2 geo-round bg-primary/10 border border-primary/20">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      Create News
                    </>
                  )}
                  {isEdit && (
                    <>
                      <div className="p-2 geo-round bg-primary/10 border border-primary/20">
                        <Edit className="h-6 w-6 text-primary" />
                      </div>
                      Edit News
                    </>
                  )}
                  {isView && (
                    <>
                      <div className="p-2 geo-round bg-primary/10 border border-primary/20">
                        <Newspaper className="h-6 w-6 text-primary" />
                      </div>
                      News Details
                    </>
                  )}
                </DialogTitle>
                <p className="text-muted-foreground mt-2 text-base font-medium max-w-md">
                  {isCreate ? 'Publish new health updates and announcements.' :
                    isEdit ? 'Modify existing article content.' :
                      'View article details and metadata.'}
                </p>
              </div>

              {/* Status Badge in Header */}
              {(isEdit || isView) && (
                <Badge className={`squircle-md px-3 py-1.5 text-sm font-bold border-0 ${formData.published
                  ? 'bg-success/10 text-success ring-1 ring-success/20'
                  : 'bg-warning/10 text-warning ring-1 ring-warning/20'
                  }`}>
                  {formData.published ? 'Published' : 'Draft'}
                </Badge>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">Title</Label>
                <div className="relative group">
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={isView}
                    className="squircle-lg bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 transition-all font-bold h-11 pl-4"
                    placeholder="Enter news title"
                    required
                  />
                  <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
                  disabled={isView}
                >
                  <SelectTrigger className="squircle-lg bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 h-11 font-medium">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map(source => (
                      <SelectItem key={source} value={source} className="font-medium cursor-pointer focus:bg-primary/10 focus:text-primary rounded-md my-0.5">
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  disabled={isView}
                >
                  <SelectTrigger className="squircle-lg bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 h-11 font-medium">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category} className="font-medium cursor-pointer focus:bg-primary/10 focus:text-primary rounded-md my-0.5">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">External URL</Label>
                <div className="relative">
                  <Input
                    id="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    disabled={isView}
                    className="squircle-lg bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 transition-all font-medium h-11 pl-10"
                    placeholder="https://example.com"
                    type="url"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">Short Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isView}
                className="squircle-lg bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 min-h-[80px] font-medium resize-none p-4"
                placeholder="Brief summary..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">Full Content</Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                disabled={isView}
                className="squircle-lg bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 min-h-[150px] font-medium p-4"
                placeholder="Write the full article here..."
              />
            </div>

            {!isView && (
              <div className="flex items-center p-4 squircle-lg bg-muted/30 border border-transparent hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => !isView && setFormData(prev => ({ ...prev, published: !prev.published }))}>
                <div className={`p-2 rounded-lg mr-4 transition-colors ${formData.published ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {formData.published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">Publish Immediately</div>
                  <div className="text-xs text-muted-foreground">Make this article visible to all users upon saving</div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${formData.published ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${formData.published ? 'left-7' : 'left-1'}`} />
                </div>
              </div>
            )}

            <DialogFooter className="gap-3 pt-4 border-t border-border/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onClose()}
                disabled={loading}
                className="squircle-lg font-bold hover:bg-muted/50"
              >
                Cancel
              </Button>

              {!isView && (
                <Button
                  type="submit"
                  disabled={loading}
                  className="squircle-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                >
                  {loading ? 'Saving...' : (isCreate ? 'Create Article' : 'Save Changes')}
                </Button>
              )}

              {isView && formData.url && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(formData.url, '_blank')}
                  className="squircle-lg border-primary/20 hover:bg-primary/5 font-bold"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Source
                </Button>
              )}
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
