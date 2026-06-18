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

// ============================================
// ERROR HELPER
// ============================================

const createImageError = (message) => {
    const error = new Error(message);
    error.name = "ImageServiceError";
    return error;
};

// ============================================
// IMAGE SERVICE
// ============================================

const imageService = {
    /**
     * Upload image to Supabase Storage
     * @param {File} file - The file object to upload
     * @returns {Promise<string>} public URL
     */
    async uploadImage(file) {
        if (!file) {
            throw createImageError("File is required");
        }

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                // Allow upload even if not logged in for testing/development (or handle auth correctly)
                // throw createImageError("User must be logged in to upload images");
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
            const filePath = user ? `${user.id}/${fileName}` : `public/${fileName}`;

            // Upload binary
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) {
                throw createImageError(uploadError.message);
            }

            // Get public URL
            const {
                data: { publicUrl },
            } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            if (error.name === "ImageServiceError") throw error;
            throw createImageError(`Upload failed: ${error.message}`);
        }
    },

    /**
     * Get image URL
     */
    async getImage(imageKey) {
        if (!imageKey) return null;
        if (imageKey.startsWith("http")) return imageKey;

        // In web, we rely on Supabase public URLs directly or generating them
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(imageKey);

        return data.publicUrl;
    },

    /**
     * Delete image from Supabase
     */
    async deleteImage(imageUrl) {
        if (!imageUrl) return false;

        try {
            let path = imageUrl;

            if (imageUrl.includes(`/${BUCKET_NAME}/`)) {
                path = imageUrl.split(`/${BUCKET_NAME}/`).pop();
            }

            await supabase.storage.from(BUCKET_NAME).remove([path]);
            return true;
        } catch (error) {
            throw createImageError(`Delete failed: ${error.message}`);
        }
    },

    /**
     * List images
     */
    async listAll() {
        // No local cache on web, usually we fetch from DB or Storage list
        return [];
    },

    /**
     * Clear cache (debug)
     */
    async clearLocalCache() {
        // No op on web
        return true;
    },
};

export { imageService, createImageError };
