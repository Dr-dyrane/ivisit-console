"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ModalShell } from '../ui/ModalShell';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { ExternalLink, Globe, Newspaper, Plus, Edit, FileText, File, FileCheck } from 'lucide-react';

const CATEGORY_OPTIONS = [
  'general', 'medical', 'research', 'wellness', 'emergency', 'policy'
];

const SOURCE_OPTIONS = [
  'Hospital Update', 'Medical Journal', 'Health Authority', 'Research Institute',
  'Government Health', 'WHO Update', 'CDC Alert', 'Medical News'
];

const EMPTY_FORM = {
  title: '',
  source: '',
  category: 'general',
  icon: 'medical',
  url: '',
  published: true,
  description: '',
  content: ''
};

export const HealthNewsModal = ({ isOpen, onClose, news, mode, onSave }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (news) {
      setFormData(prev => ({
        ...prev,
        ...news,
        title: news.title || '',
        source: news.source || '',
        category: news.category || 'general',
        icon: news.icon || 'medical',
        url: news.url || '',
        published: news.published !== undefined ? news.published : true,
        description: news.description || '',
        content: news.content || ''
      }));
    } else if (isCreate) {
      setFormData(EMPTY_FORM);
    }
  }, [news, isCreate]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (onSave) {
        await onSave(formData);
      }
      toast.success(isCreate ? 'Health news created successfully' : 'Health news updated successfully');
      onClose(true);
    } catch (error) {
      console.error('Error saving health news:', error);
      handleApiError(error, 'create');
    } finally {
      setLoading(false);
    }
  };

  const title = isCreate ? 'Create News' : isEdit ? 'Edit News' : 'News Details';
  const subtitle = isCreate
    ? 'Add a source item.'
    : isEdit
      ? 'Edit source details.'
      : 'Review source details.';
  const icon = isCreate ? (
    <Plus className="h-5 w-5 text-sky-500" />
  ) : isEdit ? (
    <Edit className="h-5 w-5 text-sky-500" />
  ) : (
    <Newspaper className="h-5 w-5 text-sky-500" />
  );
  const statusBadge = (isEdit || isView) ? (
    <span className={`inline-flex items-center rounded-pill px-3 py-1.5 text-xs font-semibold ${formData.published
      ? 'bg-emerald-500/10 text-emerald-500'
      : 'bg-amber-500/10 text-amber-500'
      }`}>
      {formData.published ? 'Published' : 'Draft'}
    </span>
  ) : null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose()}
      title={title}
      subtitle={subtitle}
      icon={icon}
      badge={statusBadge}
      size="lg"
      managed
    >
      {isView ? (
        <HealthNewsReadView formData={formData} onClose={onClose} />
      ) : (
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 md:px-6 pb-4 md:pb-6 space-y-4 md:space-y-5">
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
                  className="rounded-inner bg-white/5 shadow-none h-12 font-semibold focus-visible:shadow-[0_0_0_3px_rgb(14_165_233/0.14)]"
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
                  <SelectTrigger className="rounded-inner bg-white/5 shadow-none h-12 font-normal focus-visible:shadow-[0_0_0_3px_rgb(14_165_233/0.14)]">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className="rounded-inner shadow-xl bg-background/95 backdrop-blur-xl">
                    {SOURCE_OPTIONS.map(source => (
                      <SelectItem key={source} value={source} className="font-normal">
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Classification" icon={<Globe />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground uppercase px-1">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  disabled={isView}
                >
                  <SelectTrigger className="rounded-inner bg-white/5 shadow-none h-12 font-normal focus-visible:shadow-[0_0_0_3px_rgb(14_165_233/0.14)]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-inner shadow-xl bg-background/95 backdrop-blur-xl">
                    {CATEGORY_OPTIONS.map(category => (
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
                    className="rounded-inner bg-white/5 shadow-none h-12 pl-10 font-normal focus-visible:shadow-[0_0_0_3px_rgb(14_165_233/0.14)]"
                    placeholder="https://example.com"
                    type="url"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

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
                  className="rounded-inner bg-white/5 shadow-none min-h-[80px] font-normal resize-none p-4 focus-visible:shadow-[0_0_0_3px_rgb(14_165_233/0.14)]"
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
                  className="rounded-inner bg-white/5 shadow-none min-h-[150px] font-normal p-4 focus-visible:shadow-[0_0_0_3px_rgb(14_165_233/0.14)]"
                  placeholder="Write the full article here..."
                />
              </div>
            </div>
          </GlassCard>

          {!isView && (
            <button
              type="button"
              className="w-full p-4 sm:p-5 rounded-card bg-white/5 flex items-center hover:bg-white/10 transition-colors text-left"
              onClick={() => setFormData(prev => ({ ...prev, published: !prev.published }))}
            >
              <div className={`p-2 rounded-icon mr-4 transition-colors ${formData.published ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-muted-foreground'}`}>
                {formData.published ? <FileCheck className="h-5 w-5" /> : <File className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Publish now</div>
                <div className="text-xs text-muted-foreground">Make this article visible after saving</div>
              </div>
              <div className={`w-12 h-6 rounded-pill relative transition-colors duration-300 ${formData.published ? 'bg-emerald-500' : 'bg-white/20'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-pill bg-white shadow-sm transition-all duration-300 ${formData.published ? 'left-7' : 'left-1'}`} />
              </div>
            </button>
          )}
        </div>

        <div className="shrink-0 p-4 md:p-6 pt-3 md:pt-4 bg-white/5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose()}
            disabled={loading}
            className="rounded-button font-semibold hover:bg-white/10"
          >
            Cancel
          </Button>

          {!isView && (
            <Button
              type="submit"
              disabled={loading}
              className="rounded-button bg-foreground hover:bg-foreground/90 text-background font-semibold px-8 shadow-lg shadow-black/10"
            >
              {loading ? 'Saving...' : (isCreate ? 'Create Article' : 'Save Changes')}
            </Button>
          )}

          {isView && formData.url && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.open(formData.url, '_blank', 'noopener,noreferrer')}
              className="rounded-button font-semibold bg-transparent"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Source
            </Button>
          )}
        </div>
      </form>
      )}
    </ModalShell>
  );
};

const HealthNewsReadView = ({ formData, onClose }) => {
  const hasUrl = Boolean(formData.url);
  const category = formData.category || 'General';
  const source = formData.source || 'Unknown source';
  const description = formData.description || 'No short summary was provided.';
  const content = formData.content || 'Full article text is not stored in Console for this source.';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 md:px-6 pb-4 md:pb-6 space-y-4 md:space-y-5">
        <section className="rounded-card bg-background/70 p-5 shadow-[0_18px_58px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-pill bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-500">
              {category}
            </span>
            <span className="inline-flex items-center rounded-pill bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {source}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-normal text-foreground">
            {formData.title || 'Untitled health news'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </section>

        <section className="rounded-card bg-background/55 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/10 text-sky-500">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Source note</p>
              <p className="text-xs text-muted-foreground">Read-only until the writer receiver is proved.</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/80">
            {content}
          </p>
        </section>
      </div>

      <div className="shrink-0 bg-background/55 p-4 md:p-6 pt-3 md:pt-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onClose()}
          className="rounded-button font-semibold hover:bg-white/10"
        >
          Close
        </Button>

        {hasUrl && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.open(formData.url, '_blank', 'noopener,noreferrer')}
            className="rounded-button font-semibold bg-transparent"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Source
          </Button>
        )}
      </div>
    </div>
  );
};

const GlassCard = ({ children, title, icon }) => (
  <section className="p-4 sm:p-5 rounded-card bg-white/5">
    <div className="flex items-center gap-3 mb-4 sm:mb-5">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-icon">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5 text-sky-500' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </section>
);
