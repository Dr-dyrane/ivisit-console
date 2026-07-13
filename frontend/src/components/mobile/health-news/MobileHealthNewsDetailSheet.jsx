import React from 'react';
import {
  Clock,
  Eye,
  FileCheck,
  Globe,
  Link,
  Newspaper,
  Tag,
} from 'lucide-react';
import { resolveVital } from '../../../constants/vitalTracks';
import { MobileDetailSheet } from '../MobileDetailSheet';
import {
  categoryLabel,
  isArticlePublished,
  mobileHealthNewsDateLabel,
} from './mobileHealthNewsModel';

export const MobileHealthNewsDetailSheet = ({
  article,
  onClose,
  onView,
}) => {
  if (!article) return null;

  const published = isArticlePublished(article);
  const derivedStatus = published ? 'published' : 'draft';
  const vital = resolveVital('healthNews', derivedStatus);
  const linkValue = article.source_url_valid
    ? (article.source_host || article.source || 'Valid link')
    : (article.raw_url || article.url ? 'Unverified link' : null);

  return (
    <MobileDetailSheet
      isOpen={Boolean(article)}
      onClose={onClose}
      icon={published ? FileCheck : Newspaper}
      iconTone={vital?.tone}
      eyebrow="Health article"
      title={article.title || 'Untitled article'}
      statusPill={resolveVital('healthNews', derivedStatus).pill}
      vital={vital ? { ...vital, label: 'Article status' } : null}
      islands={[
        { icon: Globe, label: 'Source', value: article.source || 'Unknown source' },
        { icon: Tag, label: 'Category', value: categoryLabel(article.category) },
        { icon: Clock, label: 'Published', value: mobileHealthNewsDateLabel(article.created_at) },
        linkValue ? { icon: Link, label: 'Link', value: linkValue } : null,
      ]}
      primary={{
        label: 'Details',
        icon: Eye,
        onClick: () => {
          onClose();
          onView?.(article);
        },
      }}
    />
  );
};
