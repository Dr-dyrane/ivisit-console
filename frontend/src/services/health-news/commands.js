import { supabase } from '../../lib/supabase';
import { TABLE_NAME } from './constants';
import { buildHealthNewsPayload } from './normalization';
import { getHealthNewsItem } from './queries';

/**
 * Create new health news.
 */
export async function createHealthNews(input) {
  try {
    const payload = buildHealthNewsPayload(input, { forInsert: true });
    if (!payload.title || !payload.source) {
      throw new Error('health news title and source are required');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating health news:', error);
    throw error;
  }
}

/**
 * Update health news.
 */
export async function updateHealthNews(newsId, input) {
  try {
    const payload = buildHealthNewsPayload(input, { forInsert: false });
    if (Object.prototype.hasOwnProperty.call(payload, 'title') && !payload.title) {
      throw new Error('health news title cannot be empty');
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'source') && !payload.source) {
      throw new Error('health news source cannot be empty');
    }

    if (Object.keys(payload).length === 0) {
      return getHealthNewsItem(newsId);
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', newsId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating health news ${newsId}:`, error);
    throw error;
  }
}

/**
 * Delete health news.
 */
export async function deleteHealthNews(newsId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', newsId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting health news ${newsId}:`, error);
    throw error;
  }
}

/**
 * Toggle publish status.
 */
export async function toggleHealthNewsPublish(newsId, published) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ published })
      .eq('id', newsId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error toggling publish status for ${newsId}:`, error);
    throw error;
  }
}

/**
 * Bulk import health news from array.
 */
export async function bulkImportHealthNews(newsItems) {
  try {
    const itemsWithTimestamps = newsItems.map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      category: item.category || 'general',
      published: item.published !== undefined ? item.published : true,
      image_url: item.image_url || null,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(itemsWithTimestamps)
      .select();

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error bulk importing health news:', error);
    throw error;
  }
}
