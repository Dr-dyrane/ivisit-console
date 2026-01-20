import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'images';

/**
 * Uploads an image file to the 'images' bucket.
 * @param {File} file - The file object to upload.
 * @param {string} folder - Optional folder path within the bucket (default: 'uploads').
 * @returns {Promise<string>} - The public URL of the uploaded image.
 */
export const uploadImage = async (file, folder = 'uploads') => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

/**
 * Gets the public URL for an image path in the 'images' bucket.
 * @param {string} path - The path of the image in the bucket.
 * @returns {string} - The public URL.
 */
export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path; // Already a full URL

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return data.publicUrl;
};
