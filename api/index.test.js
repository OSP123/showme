// Mock uuid BEFORE any other requires
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'generated-test-uuid-1234-5678')
}));

// Mock pg Pool
const mockQuery = jest.fn();
jest.mock('pg', () => ({
    Pool: jest.fn(() => ({
        query: mockQuery
    }))
}));

const request = require('supertest');

describe('API Endpoints - Client ID Handling', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        delete require.cache[require.resolve('./index')];
        app = require('./index');
    });

    describe('POST /api/maps', () => {
        it('should use client-provided ID when creating a map', async () => {
            const clientId = 'client-provided-id-1234';
            const mapData = {
                id: clientId,
                name: 'Test Map',
                is_private: false
            };

            mockQuery.mockResolvedValueOnce({
                rows: [{ id: clientId, name: 'Test Map', is_private: false }]
            });

            const response = await request(app)
                .post('/api/maps')
                .send(mapData)
                .expect(201);

            // Verify client ID was used
            expect(mockQuery.mock.calls[0][1][0]).toBe(clientId);
            expect(response.body.id).toBe(clientId);
        });

        it('should generate ID when not provided', async () => {
            const mapData = { name: 'Test Map' };

            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'generated-test-uuid-1234-5678', name: 'Test Map' }]
            });

            const response = await request(app)
                .post('/api/maps')
                .send(mapData)
                .expect(201);

            // Verify generated ID was used
            expect(mockQuery.mock.calls[0][1][0]).toBe('generated-test-uuid-1234-5678');
        });

        it('should return 400 when name missing', async () => {
            await request(app)
                .post('/api/maps')
                .send({})
                .expect(400);
        });
    });

    describe('POST /api/pins', () => {
        it('should use client-provided ID when creating a pin', async () => {
            const clientId = 'client-pin-id-5678';
            const pinData = {
                id: clientId,
                map_id: 'map-123',
                lat: 40.7128,
                lng: -74.0060
            };

            mockQuery.mockResolvedValueOnce({
                rows: [{ id: clientId, map_id: 'map-123', lat: 40.7128, lng: -74.0060 }]
            });

            const response = await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(201);

            // Verify client ID was used
            expect(mockQuery.mock.calls[0][1][0]).toBe(clientId);
            expect(response.body.id).toBe(clientId);
        });

        it('should generate ID when not provided', async () => {
            const pinData = {
                map_id: 'map-123',
                lat: 40.7128,
                lng: -74.0060
            };

            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'generated-test-uuid-1234-5678', ...pinData }]
            });

            const response = await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(201);

            // Verify generated ID was used
            expect(mockQuery.mock.calls[0][1][0]).toBe('generated-test-uuid-1234-5678');
        });

        it('should return 400 when required fields missing', async () => {
            await request(app)
                .post('/api/pins')
                .send({ lat: 40.7128 })
                .expect(400);
        });

        it('should handle foreign key errors', async () => {
            const pinData = {
                map_id: 'nonexistent',
                lat: 40.7128,
                lng: -74.0060
            };

            const error = new Error('FK violation');
            error.code = '23503';
            mockQuery.mockRejectedValueOnce(error);

            await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(500);
        });
    });

    describe('GET /api/pins', () => {
        it('should return pins for a specific map', async () => {
            const mapId = 'map-123';
            const mockPins = [
                { id: 'pin-1', map_id: mapId, lat: 10, lng: 10 },
                { id: 'pin-2', map_id: mapId, lat: 20, lng: 20 }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockPins
            });

            const response = await request(app)
                .get('/api/pins')
                .query({ map_id: mapId })
                .expect(200);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM pins WHERE map_id = $1'),
                [mapId]
            );
        });

    it('should filter pins by updated_at when after param provided', async () => {
        const mapId = 'map-123';
        const after = '2024-01-01T00:00:00Z';

        mockQuery.mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/pins')
            .query({ map_id: mapId, after: after })
            .expect(200);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('AND updated_at > $2'),
            [mapId, after]
        );
    });

    it('should return 400 when map_id query param is missing', async () => {
        await request(app)
            .get('/api/pins')
            .expect(400);
    });
});

    describe('PATCH /api/pins/:id', () => {
        it('should update pin with provided fields', async () => {
            const pinId = 'pin-123';
            const updates = {
                photo_urls: ['https://example.com/photo1.jpg'],
                description: 'Updated description'
            };

            mockQuery.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ id: pinId, ...updates }]
            });

            const response = await request(app)
                .patch(`/api/pins/${pinId}`)
                .send(updates)
                .expect(200);

            expect(response.body.id).toBe(pinId);
            const queryStr = mockQuery.mock.calls[0][0];
            const queryParams = mockQuery.mock.calls[0][1];
            expect(queryStr).toContain('UPDATE pins SET');
            expect(queryStr).toContain('description');
            expect(queryStr).toContain('photo_urls');
            expect(queryParams).toContainEqual(['https://example.com/photo1.jpg']);
        });

        it('should return 400 when no fields provided', async () => {
            await request(app)
                .patch('/api/pins/pin-123')
                .send({})
                .expect(400);
        });

        it('should return 404 when pin not found', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

            await request(app)
                .patch('/api/pins/nonexistent')
                .send({ description: 'test' })
                .expect(404);
        });

        it('should ignore non-allowed fields', async () => {
            mockQuery.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ id: 'pin-123', description: 'valid' }]
            });

            await request(app)
                .patch('/api/pins/pin-123')
                .send({ description: 'valid', id: 'hacked', map_id: 'hacked' })
                .expect(200);

            // Only description should be in SET clause, not id or map_id
            const queryStr = mockQuery.mock.calls[0][0];
            expect(queryStr).toContain('description');
            expect(queryStr).not.toContain('map_id');
        });
    });
});
