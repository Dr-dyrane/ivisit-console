"use client";

import React from 'react';
import { ExternalLink, FileText, Newspaper } from 'lucide-react';
import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';

const formatLabel = (value, fallback) => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const HealthNewsModal = ({ isOpen, onClose, news }) => {
  const published = news?.published !== false;
  const statusBadge = news ? (
    <span className={`inline-flex items-center rounded-pill px-3 py-1.5 text-xs font-semibold ${published
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
      : 'bg-amber-500/10 text-amber-700 dark:text-amber-200'
    }`}>
      {published ? 'Published' : 'Draft'}
    </span>
  ) : null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose?.()}
      title="News details"
      subtitle={String(news?.source || '').trim() || 'Review the published source.'}
      icon={<Newspaper className="h-5 w-5 text-sky-600 dark:text-sky-300" />}
      badge={statusBadge}
      size="lg"
      managed
    >
      <HealthNewsReadView news={news} onClose={onClose} />
    </ModalShell>
  );
};

const HealthNewsReadView = ({ news, onClose }) => {
  const hasUrl = Boolean(String(news?.url || '').trim());
  const imageUrl = String(news?.image_url || '').trim();
  const category = formatLabel(news?.category, 'General');
  const source = String(news?.source || '').trim() || 'Unknown source';
  const description = String(news?.description || '').trim() || 'No short summary was provided.';
  const content = String(news?.content || '').trim() || 'Full article text is not available for this source.';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 no-scrollbar md:px-6 md:pb-6">
        <section className="rounded-card bg-foreground/[0.045] p-5 dark:bg-white/[0.06]">
          {imageUrl && (
            <img
              key={news?.id}
              src={imageUrl}
              alt=""
              loading="lazy"
              className="mb-4 h-44 w-full rounded-inner object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-pill bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
              {category}
            </span>
            <span className="inline-flex items-center rounded-pill bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {source}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-normal text-foreground">
            {String(news?.title || '').trim() || 'Untitled health news'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </section>

        <section className="rounded-card bg-foreground/[0.035] p-5 dark:bg-white/[0.045]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Source note</p>
              <p className="text-xs text-muted-foreground">Published feed record</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/80">
            {content}
          </p>
        </section>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-3 bg-background/80 p-4 pt-3 sm:flex-row sm:justify-end md:p-6 md:pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onClose?.()}
          className="rounded-button font-semibold hover:bg-foreground/[0.06]"
        >
          Close
        </Button>

        {hasUrl && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.open(news.url, '_blank', 'noopener,noreferrer')}
            className="rounded-button bg-transparent font-semibold"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Visit source
          </Button>
        )}
      </div>
    </div>
  );
};
