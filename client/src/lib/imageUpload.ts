// Image upload and processing utilities
import imageCompression from 'browser-image-compression';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_PIN = 5;

export interface UploadResult {
    url: string;
    thumbnail: string;
    publicId: string;
}

// Validate image file
export function validateImage(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'File must be an image' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: `File size must be under ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
    }

    return { valid: true };
}

// Compress image if needed
export async function compressImage(file: File): Promise<File> {
    const TARGET_SIZE_MB = 2;

    // Skip compression if already small
    if (file.size <= TARGET_SIZE_MB * 1024 * 1024) {
        return file;
    }

    const options = {
        maxSizeMB: TARGET_SIZE_MB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type,
    };

    try {
        const compressed = await imageCompression(file, options);
        console.log(`📦 Compressed image: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
        return compressed;
    } catch (error) {
        console.error('Compression failed, using original:', error);
        return file;
    }
}

// Upload to Cloudinary
export async function uploadToCloudinary(file: File): Promise<UploadResult> {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'showme-pins'); // Organize uploads

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: 'POST',
            body: formData,
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
    }

    const data = await response.json();

    return {
        url: data.secure_url,
        thumbnail: generateThumbnailUrl(data.secure_url),
        publicId: data.public_id,
    };
}

// Generate thumbnail URL using Cloudinary transformations
export function generateThumbnailUrl(url: string): string {
    // Insert transformation parameters into Cloudinary URL
    // Original: https://res.cloudinary.com/xxx/image/upload/v123/image.jpg
    // Thumbnail: https://res.cloudinary.com/xxx/image/upload/w_200,h_200,c_fill/v123/image.jpg
    return url.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto/');
}

// Upload with progress tracking
export async function uploadImageWithProgress(
    file: File,
    onProgress?: (percent: number) => void
): Promise<UploadResult> {
    // Validate
    const validation = validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Compress
    if (onProgress) onProgress(10);
    const compressed = await compressImage(file);

    if (onProgress) onProgress(30);

    // Upload
    const result = await uploadToCloudinary(compressed);

    if (onProgress) onProgress(100);

    return result;
}

// Batch upload multiple images
export async function uploadMultipleImages(
    files: File[],
    onProgress?: (fileIndex: number, percent: number) => void
): Promise<UploadResult[]> {
    if (files.length > MAX_PHOTOS_PER_PIN) {
        throw new Error(`Maximum ${MAX_PHOTOS_PER_PIN} photos allowed per pin`);
    }

    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
            const result = await uploadImageWithProgress(file, (percent) => {
                onProgress?.(i, percent);
            });
            results.push(result);
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            throw error;
        }
    }

    return results;
}

// Queue upload for offline mode (store in IndexedDB, upload later)
export async function queueOfflineUpload(file: File, pinId: string): Promise<void> {
    // Convert file to base64 for storage
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = () => {
            const dataUrl = reader.result as string;

            // Store in localStorage as a simple queue
            const queue = JSON.parse(localStorage.getItem('photoUploadQueue') || '[]');
            queue.push({
                pinId,
                dataUrl,
                fileName: file.name,
                timestamp: Date.now(),
            });
            localStorage.setItem('photoUploadQueue', JSON.stringify(queue));

            console.log('📴 Photo queued for upload when online');
            resolve();
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Process offline upload queue
export async function processOfflineQueue(): Promise<void> {
    const queue = JSON.parse(localStorage.getItem('photoUploadQueue') || '[]');

    if (queue.length === 0) return;

    console.log(`📡 Processing ${queue.length} queued photo(s)...`);

    for (const item of queue) {
        try {
            // Convert base64 back to file
            const response = await fetch(item.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], item.fileName, { type: blob.type });

            // Upload
            const result = await uploadToCloudinary(file);

            // TODO: Update pin with photo URL
            console.log(`✅ Uploaded queued photo for pin ${item.pinId}:`, result.url);

            // Remove from queue
            const newQueue = queue.filter((q: any) => q.timestamp !== item.timestamp);
            localStorage.setItem('photoUploadQueue', JSON.stringify(newQueue));

        } catch (error) {
            console.error('Failed to process queued upload:', error);
            // Keep in queue for retry
        }
    }
}

// Listen for online event to process queue
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('📡 Back online, processing photo upload queue...');
        processOfflineQueue();
    });
}

export const IMAGE_UPLOAD_CONFIG = {
    MAX_FILE_SIZE,
    MAX_PHOTOS_PER_PIN,
    SUPPORTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
};
