"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { X, Save, ExternalLink, Globe, Newspaper, Eye, EyeOff, Plus, Edit, FileText, File, FileCheck } from 'lucide-react';

export const HealthNewsModal = ({ isOpen, onClose, news, mode, onSave }) => {
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
      if (onSave) {
        await onSave(formData);
      }
      toast.success(isCreate ? 'Health news created successfully' : 'Health news updated successfully');
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => onClose()}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  {isCreate ? (
                    <Plus className="h-6 w-6 text-primary" />
                  ) : isEdit ? (
                    <Edit className="h-6 w-6 text-primary" />
                  ) : (
                    <Newspaper className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {isCreate ? 'Create News' : isEdit ? 'Edit News' : 'News Details'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isCreate ? 'Publish new health updates and announcements.' :
                      isEdit ? 'Modify existing article content.' :
                        'View article details and metadata.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(isEdit || isView) && (
                  <Badge className={`rounded-full px-3 py-1.5 text-sm font-semibold border-0 ${formData.published
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-orange-500/10 text-orange-500'
                    }`}>
                    {formData.published ? 'Published' : 'Draft'}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  onClick={() => onClose()}
                  className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Info */}
                <GlassCard title="Article Info" icon={<Newspaper />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase px-1">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-semibold"
                        placeholder="Enter news title"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="source" className="text-xs font-semibold text-muted-foreground uppercase px-1">Source</Label>
                      <Select
                        value={formData.source}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-normal">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 shadow-xl bg-background/95 backdrop-blur-xl">
                          {sources.map(source => (
                            <SelectItem key={source} value={source} className="font-normal">
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </GlassCard>

                {/* Category & URL */}
                <GlassCard title="Classification" icon={<Globe />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground uppercase px-1">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-normal">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 shadow-xl bg-background/95 backdrop-blur-xl">
                          {categories.map(category => (
                            <SelectItem key={category} value={category} className="font-normal capitalize">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="url" className="text-xs font-semibold text-muted-foreground uppercase px-1">External URL</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="url"
                          name="url"
                          value={formData.url}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-normal"
                          placeholder="https://example.com"
                          type="url"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Content */}
                <GlassCard title="Content" icon={<FileText />}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase px-1">Short Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[80px] font-normal resize-none p-4"
                        placeholder="Brief summary..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content" className="text-xs font-semibold text-muted-foreground uppercase px-1">Full Content</Label>
                      <Textarea
                        id="content"
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[150px] font-normal p-4"
                        placeholder="Write the full article here..."
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Publish Toggle */}
                {!isView && (
                  <div
                    className="p-4 sm:p-5 rounded-[24px] bg-white/5 border border-white/10 flex items-center hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, published: !prev.published }))}
                  >
                    <div className={`p-2 rounded-xl mr-4 transition-colors ${formData.published ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-muted-foreground'}`}>
                      {formData.published ? <FileCheck className="h-5 w-5" /> : <File className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Publish Immediately</div>
                      <div className="text-xs text-muted-foreground">Make this article visible to all users upon saving</div>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${formData.published ? 'bg-primary' : 'bg-white/20'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${formData.published ? 'left-7' : 'left-1'}`} />
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="p-4 sm:p-6 rounded-[24px] bg-white/5 border border-white/10 flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onClose()}
                    disabled={loading}
                    className="rounded-2xl font-semibold hover:bg-white/10"
                  >
                    Cancel
                  </Button>

                  {!isView && (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-lg shadow-primary/20"
                    >
                      {loading ? 'Saving...' : (isCreate ? 'Create Article' : 'Save Changes')}
                    </Button>
                  )}

                  {isView && formData.url && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(formData.url, '_blank')}
                      className="rounded-2xl border-white/10 hover:bg-white/5 font-semibold bg-transparent"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Source
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5 border border-white/10 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5 text-primary' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
