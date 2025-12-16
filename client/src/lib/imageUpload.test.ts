import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compressImage, uploadToCloudinary } from './imageUpload';

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
    default: vi.fn((file: File, options: any) => {
        // Return a smaller mock file
        return Promise.resolve(new File(['compressed'], file.name, { type: file.type }));
    })
}));

// Mock fetch
global.fetch = vi.fn();

describe('Image Upload', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock successful Cloudinary response
        (global.fetch as any).mockResolvedValue({
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

            await expect(compressImage(file)).rejects.toThrow('Compression failed');
        });
    });

    describe('uploadToCloudinary', () => {
        it('should upload a file to Cloudinary', async () => {
            // Mock environment variables
            const originalEnv = import.meta.env;
            (import.meta as any).env = {
                VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud',
                VITE_CLOUDINARY_UPLOAD_PRESET: 'test-preset'
            };

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            const result = await uploadToCloudinary(file);

            expect(result).toEqual({
                url: 'https://res.cloudinary.com/test/image/upload/v1/test.jpg',
                publicId: 'test',
                width: 800,
                height: 600
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );

            // Restore
            (import.meta as any).env = originalEnv;
        });

        it('should throw error if Cloudinary not configured', async () => {
            const originalEnv = import.meta.env;
            (import.meta as any).env = {};

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await expect(uploadToCloudinary(file)).rejects.toThrow(
                'Cloudinary not configured'
            );

            (import.meta as any).env = originalEnv;
        });

        it('should handle upload errors', async () => {
            const originalEnv = import.meta.env;
            (import.meta as any).env = {
                VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud',
                VITE_CLOUDINARY_UPLOAD_PRESET: 'test-preset'
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                statusText: 'Upload failed'
            });

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await expect(uploadToCloudinary(file)).rejects.toThrow('Upload failed');

            (import.meta as any).env = originalEnv;
        });

        it('should include file in FormData', async () => {
            const originalEnv = import.meta.env;
            (import.meta as any).env = {
                VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud',
                VITE_CLOUDINARY_UPLOAD_PRESET: 'test-preset'
            };

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await uploadToCloudinary(file);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const formData = fetchCall[1].body as FormData;

            expect(formData.get('file')).toBe(file);
            expect(formData.get('upload_preset')).toBe('test-preset');

            (import.meta as any).env = originalEnv;
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            const originalEnv = import.meta.env;
            (import.meta as any).env = {
                VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud',
                VITE_CLOUDINARY_UPLOAD_PRESET: 'test-preset'
            };

            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

            await expect(uploadToCloudinary(file)).rejects.toThrow('Network error');

            (import.meta as any).env = originalEnv;
        });
    });
});
