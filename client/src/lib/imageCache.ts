// Image caching utilities for offline/low-bandwidth access
const CACHE_NAME = 'showme-images-v1';
const CACHE_EXPIRY_DAYS = 7;

interface CachedImage {
    url: string;
    blob: Blob;
    timestamp: number;
}

// Cache image locally using Cache API
export async function cacheImage(url: string): Promise<void> {
    try {
        const cache = await caches.open(CACHE_NAME);

        // Check if already cached
        const cached = await cache.match(url);
        if (cached) return;

        // Fetch and cache
        const response = await fetch(url);
        if (response.ok) {
            await cache.put(url, response.clone());
            console.log('📦 Cached image:', url);
        }
    } catch (error) {
        console.error('Failed to cache image:', error);
    }
}

// Get cached or fetch image
export async function getCachedImage(url: string): Promise<string> {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url);

        if (cached) {
            console.log('✅ Using cached image:', url);
            return url;
        }

        // Not cached, cache it now for next time
        cacheImage(url);
        return url;

    } catch (error) {
        console.error('Cache error, using direct URL:', error);
        return url;
    }
}

// Batch cache multiple images
export async function cacheImages(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => cacheImage(url)));
}

// Clear old cached images
export async function clearExpiredCache(): Promise<void> {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        const expiryTime = Date.now() - (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const date = new Date(response.headers.get('date') || 0);
                if (date.getTime() < expiryTime) {
                    await cache.delete(request);
                    console.log('🗑️ Removed expired cache:', request.url);
                }
            }
        }
    } catch (error) {
        console.error('Failed to clear expired cache:', error);
    }
}

// Optimize Cloudinary URL for low bandwidth
export function optimizeImageUrl(url: string, options: {
    width?: number;
    quality?: 'auto' | 'low' | 'medium' | 'high';
    format?: 'auto' | 'webp' | 'jpg';
} = {}): string {
    if (!url.includes('cloudinary.com')) return url;

    const { width = 800, quality = 'auto', format = 'auto' } = options;

    // Build transformation string
    const transforms = [
        `w_${width}`,
        `q_${quality}`,
        `f_${format}`,
        'c_limit', // Don't upscale
    ].join(',');

    // Insert transformations into URL
    return url.replace('/upload/', `/upload/${transforms}/`);
}

// Get optimized thumbnail URL
export function getThumbnailUrl(url: string, size: number = 200): string {
    return optimizeImageUrl(url, {
        width: size,
        quality: 'auto',
        format: 'webp'
    });
}

// Preload images for a pin (cache thumbnails and optionally full images)
export async function preloadPinImages(photoUrls: string[], loadFull: boolean = false): Promise<void> {
    // Always cache thumbnails
    const thumbnails = photoUrls.map(url => getThumbnailUrl(url));
    await cacheImages(thumbnails);

    // Optionally cache full images (when on WiFi)
    if (loadFull && navigator.connection) {
        const connection = navigator.connection as any;
        if (connection.effectiveType === '4g' || connection.effectiveType === 'wifi') {
            const optimized = photoUrls.map(url => optimizeImageUrl(url));
            await cacheImages(optimized);
        }
    }
}

// Initialize cache cleanup on app start
if (typeof window !== 'undefined') {
    // Clear expired cache on startup
    clearExpiredCache();

    // Periodic cleanup (once per day)
    setInterval(clearExpiredCache, 24 * 60 * 60 * 1000);
}
