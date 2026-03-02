import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compressImage, uploadToCloudinary } from './imageUpload';
import * as config from './config';

// Mock config
vi.mock('./config', () => ({
    getEnv: vi.fn()
}));

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
    default: vi.fn((file: File, options: any) => {
        // Return a smaller mock file
        return Promise.resolve(new File(['compressed'], file.name, { type: file.type }));
    })
}));

// Mock fetch
globalThis.fetch = vi.fn();

describe('Image Upload', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock for getEnv
        (config.getEnv as any).mockReturnValue(undefined);

        // Mock successful Cloudinary response
        (globalThis.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test.jpg',
                public_id: 'test',
                width: 800,
                height: 600
            })
        });
    });

    describe('compressImage', () => {
        it('should compress an image file', async () => {
            const originalFile = new File(['original'], 'test.jpg', { type: 'image/jpeg' });

            const compressed = await compressImage(originalFile);

            expect(compressed).toBeInstanceOf(File);
            expect(compressed.name).toBe('test.jpg');
            expect(compressed.type).toBe('image/jpeg');
        });

        it('should handle different image types', async () => {
            const pngFile = new File(['png data'], 'test.png', { type: 'image/png' });

            const compressed = await compressImage(pngFile);

            expect(compressed.type).toBe('image/png');
        });

        it('should reject on compression error', async () => {
            const imageCompression = await import('browser-image-compression');
            (imageCompression.default as any).mockRejectedValueOnce(new Error('Compression failed'));

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            const result = await compressImage(file);

            // Should return original file on error
            expect(result).toBe(file);
        });
    });

    describe('uploadToCloudinary', () => {
        it('should upload a file to Cloudinary', async () => {
            // Mock environment variables
            (config.getEnv as any).mockImplementation((key: string) => {
                if (key === 'VITE_CLOUDINARY_CLOUD_NAME') return 'test-cloud';
                if (key === 'VITE_CLOUDINARY_UPLOAD_PRESET') return 'test-preset';
                return undefined;
            });

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            const result = await uploadToCloudinary(file);

            expect(result).toEqual({
                url: 'https://res.cloudinary.com/test/image/upload/v1/test.jpg',
                publicId: 'test',
                thumbnail: expect.stringContaining('w_200,h_200')
            });

            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );
        });

        it('should throw error if Cloudinary not configured', async () => {
            (config.getEnv as any).mockReturnValue(undefined);

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await expect(uploadToCloudinary(file)).rejects.toThrow(
                'Cloudinary not configured'
            );
        });

        it('should handle upload errors', async () => {
            (config.getEnv as any).mockImplementation((key: string) => {
                if (key === 'VITE_CLOUDINARY_CLOUD_NAME') return 'test-cloud';
                if (key === 'VITE_CLOUDINARY_UPLOAD_PRESET') return 'test-preset';
                return undefined;
            });

            (globalThis.fetch as any).mockResolvedValueOnce({
                ok: false,
                statusText: 'Upload failed',
                text: async () => 'Upload error details'
            });

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await expect(uploadToCloudinary(file)).rejects.toThrow('Upload failed');
        });

        it('should include file in FormData', async () => {
            (config.getEnv as any).mockImplementation((key: string) => {
                if (key === 'VITE_CLOUDINARY_CLOUD_NAME') return 'test-cloud';
                if (key === 'VITE_CLOUDINARY_UPLOAD_PRESET') return 'test-preset';
                return undefined;
            });

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await uploadToCloudinary(file);

            const fetchCall = (globalThis.fetch as any).mock.calls[0];
            const formData = fetchCall[1].body as FormData;

            expect(formData.get('file')).toBe(file);
            expect(formData.get('upload_preset')).toBe('test-preset');
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            (config.getEnv as any).mockImplementation((key: string) => {
                if (key === 'VITE_CLOUDINARY_CLOUD_NAME') return 'test-cloud';
                if (key === 'VITE_CLOUDINARY_UPLOAD_PRESET') return 'test-preset';
                return undefined;
            });

            (globalThis.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await expect(uploadToCloudinary(file)).rejects.toThrow('Network error');
        });
    });
});
