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
});
