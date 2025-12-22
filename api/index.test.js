const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');

// Mock pg Pool
jest.mock('pg', () => {
    const mPool = {
        query: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

// Import after mocking
const app = require('./index');

describe('API Endpoints - Client ID Handling', () => {
    let pool;

    beforeEach(() => {
        // Get the mocked pool instance
        pool = new Pool();
        jest.clearAllMocks();
    });

    describe('POST /api/maps', () => {
        it('should use client-provided ID when creating a map', async () => {
            const clientProvidedId = '12345678-1234-1234-1234-123456789012';
            const mapData = {
                id: clientProvidedId,
                name: 'Test Map',
                is_private: false,
                access_token: null,
                fuzzing_enabled: false,
                fuzzing_radius: 100,
                created_at: '2025-12-22T00:00:00.000Z'
            };

            // Mock successful insert
            pool.query.mockResolvedValueOnce({
                rows: [{ ...mapData }]
            });

            const response = await request(app)
                .post('/api/maps')
                .send(mapData)
                .expect(201);

            // Verify the query was called with client-provided ID
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO maps'),
                expect.arrayContaining([clientProvidedId])
            );

            // Verify response contains the same ID
            expect(response.body.id).toBe(clientProvidedId);
        });

        it('should generate new ID when client does not provide one', async () => {
            const mapData = {
                name: 'Test Map Without ID',
                is_private: false
            };

            // Mock successful insert
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: expect.any(String),
                    name: mapData.name,
                    is_private: false,
                    access_token: null,
                    fuzzing_enabled: false,
                    fuzzing_radius: 100,
                    created_at: expect.any(String)
                }]
            });

            const response = await request(app)
                .post('/api/maps')
                .send(mapData)
                .expect(201);

            // Verify query was called with a UUID (not undefined)
            const insertedId = pool.query.mock.calls[0][1][0];
            expect(insertedId).toBeDefined();
            expect(typeof insertedId).toBe('string');
            expect(insertedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should return 400 when map name is missing', async () => {
            await request(app)
                .post('/api/maps')
                .send({ is_private: false })
                .expect(400);
        });
    });

    describe('POST /api/pins', () => {
        it('should use client-provided ID when creating a pin', async () => {
            const clientProvidedId = '87654321-4321-4321-4321-210987654321';
            const pinData = {
                id: clientProvidedId,
                map_id: '12345678-1234-1234-1234-123456789012',
                lat: 40.7128,
                lng: -74.0060,
                type: 'landmark',
                tags: ['test'],
                description: 'Test Pin',
                photo_urls: [],
                expires_at: null,
                created_at: '2025-12-22T00:00:00.000Z',
                updated_at: '2025-12-22T00:00:00.000Z'
            };

            // Mock successful insert
            pool.query.mockResolvedValueOnce({
                rows: [{ ...pinData }]
            });

            const response = await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(201);

            // Verify the query was called with client-provided ID
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO pins'),
                expect.arrayContaining([clientProvidedId])
            );

            // Verify response contains the same ID
            expect(response.body.id).toBe(clientProvidedId);
        });

        it('should generate new ID when client does not provide one', async () => {
            const pinData = {
                map_id: '12345678-1234-1234-1234-123456789012',
                lat: 40.7128,
                lng: -74.0060
            };

            // Mock successful insert
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: expect.any(String),
                    ...pinData,
                    type: null,
                    tags: [],
                    description: null,
                    photo_urls: [],
                    expires_at: null,
                    created_at: expect.any(String),
                    updated_at: expect.any(String)
                }]
            });

            const response = await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(201);

            // Verify query was called with a UUID (not undefined)
            const insertedId = pool.query.mock.calls[0][1][0];
            expect(insertedId).toBeDefined();
            expect(typeof insertedId).toBe('string');
            expect(insertedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should return 400 when required fields are missing', async () => {
            await request(app)
                .post('/api/pins')
                .send({ lat: 40.7128 }) // missing lng and map_id
                .expect(400);
        });

        it('should handle foreign key constraint violation gracefully', async () => {
            const pinData = {
                map_id: 'non-existent-map-id',
                lat: 40.7128,
                lng: -74.0060
            };

            // Mock foreign key violation
            pool.query.mockRejectedValueOnce({
                code: '23503',
                constraint: 'pins_map_id_fkey'
            });

            await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(500);
        });
    });
});
