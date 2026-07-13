import { WRITABLE_COLUMNS } from './constants';

export function buildHealthNewsPayload(input = {}, { forInsert = false } = {}) {
  const payload = {};
  const aliases = {
    image: 'image_url',
  };

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined) continue;
    const column = aliases[key] || key;
    if (WRITABLE_COLUMNS.has(column)) {
      payload[column] = value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    payload.title = typeof payload.title === 'string' ? payload.title.trim() : '';
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'source')) {
    payload.source = typeof payload.source === 'string' ? payload.source.trim() : '';
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
    payload.category = typeof payload.category === 'string'
      ? payload.category.trim()
      : payload.category;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'url')) {
    payload.url = typeof payload.url === 'string' ? payload.url.trim() : payload.url;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'image_url')) {
    payload.image_url = typeof payload.image_url === 'string'
      ? payload.image_url.trim()
      : payload.image_url;
  }

  if (forInsert) {
    payload.created_at = new Date().toISOString();
    if (payload.published === undefined) payload.published = true;
  }

  return payload;
}

export const sanitizeSearchTerm = (value) => String(value || '')
  .trim()
  .replace(/[%_,]/g, ' ')
  .replace(/\s+/g, ' ');

export function normalizePublishedFilter(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export function normalizeHealthNewsUrl(value) {
  const rawUrl = String(value || '').trim();
  if (!rawUrl) {
    return {
      url: '',
      source_url_valid: false,
      source_host: '',
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const allowed = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    return {
      url: allowed ? parsed.toString() : '',
      source_url_valid: allowed,
      source_host: allowed ? parsed.hostname.replace(/^www\./, '') : '',
    };
  } catch {
    return {
      url: '',
      source_url_valid: false,
      source_host: '',
    };
  }
}

export function normalizeHealthNewsRow(row = {}) {
  const normalizedUrl = normalizeHealthNewsUrl(row.url);

  return {
    ...row,
    id: row.id,
    title: String(row.title || 'Health update').trim() || 'Health update',
    source: String(row.source || 'Unknown source').trim() || 'Unknown source',
    category: String(row.category || 'general').trim() || 'general',
    published: row.published === false ? false : true,
    created_at: row.created_at || null,
    image_url: typeof row.image_url === 'string' ? row.image_url.trim() : row.image_url || null,
    raw_url: String(row.url || '').trim(),
    ...normalizedUrl,
  };
}
