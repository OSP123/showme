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
        const publicMap = { id: 'map-123', is_private: false, access_token: null };

        it('should use client-provided ID when creating a pin', async () => {
            const clientId = 'client-pin-id-5678';
            const pinData = {
                id: clientId,
                map_id: 'map-123',
                lat: 40.7128,
                lng: -74.0060
            };

            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: clientId, map_id: 'map-123', lat: 40.7128, lng: -74.0060 }]
            });

            const response = await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(201);

            // Verify client ID was used (second query is the INSERT)
            expect(mockQuery.mock.calls[1][1][0]).toBe(clientId);
            expect(response.body.id).toBe(clientId);
        });

        it('should generate ID when not provided', async () => {
            const pinData = {
                map_id: 'map-123',
                lat: 40.7128,
                lng: -74.0060
            };

            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'generated-test-uuid-1234-5678', ...pinData }]
            });

            const response = await request(app)
                .post('/api/pins')
                .send(pinData)
                .expect(201);

            // Verify generated ID was used (second query is the INSERT)
            expect(mockQuery.mock.calls[1][1][0]).toBe('generated-test-uuid-1234-5678');
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

            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
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
        const publicMap = { id: 'map-123', is_private: false, access_token: null };

        it('should return pins for a specific map', async () => {
            const mapId = 'map-123';
            const mockPins = [
                { id: 'pin-1', map_id: mapId, lat: 10, lng: 10 },
                { id: 'pin-2', map_id: mapId, lat: 20, lng: 20 }
            ];

            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: mockPins });

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

            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
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
        const publicMap = { id: 'map-123', is_private: false, access_token: null };

        it('should update pin with provided fields', async () => {
            const pinId = 'pin-123';
            const updates = {
                photo_urls: ['https://example.com/photo1.jpg'],
                description: 'Updated description'
            };

            mockQuery.mockResolvedValueOnce({ rows: [{ id: pinId, map_id: 'map-123' }] }); // get pin
            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ id: pinId, ...updates }]
            });

            const response = await request(app)
                .patch(`/api/pins/${pinId}`)
                .send(updates)
                .expect(200);

            expect(response.body.id).toBe(pinId);
            // Third query is the UPDATE (index 2)
            const queryStr = mockQuery.mock.calls[2][0];
            const queryParams = mockQuery.mock.calls[2][1];
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
            mockQuery.mockResolvedValueOnce({ rows: [] }); // get pin - not found

            await request(app)
                .patch('/api/pins/nonexistent')
                .send({ description: 'test' })
                .expect(404);
        });

        it('should ignore non-allowed fields', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pin-123', map_id: 'map-123' }] }); // get pin
            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ id: 'pin-123', description: 'valid' }]
            });

            await request(app)
                .patch('/api/pins/pin-123')
                .send({ description: 'valid', id: 'hacked', map_id: 'hacked' })
                .expect(200);

            // Third query (index 2) is the UPDATE
            const queryStr = mockQuery.mock.calls[2][0];
            expect(queryStr).toContain('description');
            expect(queryStr).not.toContain('map_id');
        });
    });
});

describe('Access Control - Private Maps', () => {
    let app;

    const publicMap = { id: 'public-map-1', name: 'Public', is_private: false, access_token: null, access_code: null };
    const privateMap = { id: 'private-map-1', name: 'Private', is_private: true, access_token: 'secret-token-uuid', access_code: 'A3X9K2' };

    beforeEach(() => {
        jest.clearAllMocks();
        delete require.cache[require.resolve('./index')];
        app = require('./index');
    });

    describe('GET /api/maps/:id', () => {
        it('should return public map without token', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // actual query

            const response = await request(app)
                .get('/api/maps/public-map-1')
                .expect(200);

            expect(response.body).toHaveLength(1);
        });

        it('should return private map with valid access_token', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // actual query

            const response = await request(app)
                .get('/api/maps/private-map-1')
                .query({ token: 'secret-token-uuid' })
                .expect(200);

            expect(response.body).toHaveLength(1);
        });

        it('should return private map with valid access_code', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // actual query

            const response = await request(app)
                .get('/api/maps/private-map-1')
                .query({ token: 'A3X9K2' })
                .expect(200);

            expect(response.body).toHaveLength(1);
        });

        it('should return 403 for private map without token', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess

            await request(app)
                .get('/api/maps/private-map-1')
                .expect(403);
        });

        it('should return 403 for private map with wrong token', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess

            await request(app)
                .get('/api/maps/private-map-1')
                .query({ token: 'wrong-token' })
                .expect(403);
        });

        it('should not include access_token in response for private maps', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // actual query

            const response = await request(app)
                .get('/api/maps/private-map-1')
                .query({ token: 'secret-token-uuid' })
                .expect(200);

            // access_token should be stripped from response
            expect(response.body[0].access_token).toBeUndefined();
        });
    });

    describe('GET /api/pins (private map)', () => {
        it('should return pins with valid token', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pin-1', map_id: 'private-map-1' }] }); // pins query

            await request(app)
                .get('/api/pins')
                .query({ map_id: 'private-map-1', token: 'secret-token-uuid' })
                .expect(200);
        });

        it('should return 403 without token for private map', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess

            await request(app)
                .get('/api/pins')
                .query({ map_id: 'private-map-1' })
                .expect(403);
        });

        it('should return pins for public map without token', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [publicMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [] }); // pins query

            await request(app)
                .get('/api/pins')
                .query({ map_id: 'public-map-1' })
                .expect(200);
        });
    });

    describe('POST /api/pins (private map)', () => {
        it('should create pin with valid token', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new-pin', map_id: 'private-map-1' }] }); // insert

            await request(app)
                .post('/api/pins')
                .query({ token: 'secret-token-uuid' })
                .send({ map_id: 'private-map-1', lat: 40, lng: -74 })
                .expect(201);
        });

        it('should return 403 without token for private map', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess

            await request(app)
                .post('/api/pins')
                .send({ map_id: 'private-map-1', lat: 40, lng: -74 })
                .expect(403);
        });
    });

    describe('PATCH /api/pins/:id (private map)', () => {
        it('should update pin with valid token', async () => {
            // First query: get pin to find map_id
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pin-1', map_id: 'private-map-1' }] });
            // Second query: validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] });
            // Third query: actual update
            mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'pin-1', description: 'updated' }] });

            await request(app)
                .patch('/api/pins/pin-1')
                .query({ token: 'secret-token-uuid' })
                .send({ description: 'updated' })
                .expect(200);
        });

        it('should return 403 without token for private map pin', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pin-1', map_id: 'private-map-1' }] }); // get pin
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess

            await request(app)
                .patch('/api/pins/pin-1')
                .send({ description: 'updated' })
                .expect(403);
        });
    });

    describe('DELETE /api/pins/:id (private map)', () => {
        it('should delete pin with valid token', async () => {
            // First query: get pin to find map_id
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pin-1', map_id: 'private-map-1' }] });
            // Second query: validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] });
            // Third query: actual delete
            mockQuery.mockResolvedValueOnce({ rowCount: 1 });

            await request(app)
                .delete('/api/pins/pin-1')
                .query({ token: 'secret-token-uuid' })
                .expect(204);
        });

        it('should return 403 without token for private map pin', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pin-1', map_id: 'private-map-1' }] }); // get pin
            mockQuery.mockResolvedValueOnce({ rows: [privateMap] }); // validateMapAccess

            await request(app)
                .delete('/api/pins/pin-1')
                .expect(403);
        });
    });

    describe('GET /api/maps/code/:code', () => {
        it('should return map info for valid access code', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'private-map-1', name: 'Private', is_private: true }] });

            const response = await request(app)
                .get('/api/maps/code/A3X9K2')
                .expect(200);

            expect(response.body.id).toBe('private-map-1');
            expect(response.body.name).toBe('Private');
            expect(response.body.access_token).toBeUndefined();
        });

        it('should return 404 for invalid access code', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/maps/code/XXXXXX')
                .expect(404);
        });
    });

    describe('POST /api/maps (access code generation)', () => {
        it('should generate access_code for private maps', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'new-private-map', name: 'Secret Map', is_private: true, access_token: 'token-123', access_code: 'B4Y7M3' }]
            });

            const response = await request(app)
                .post('/api/maps')
                .send({ name: 'Secret Map', is_private: true, access_token: 'token-123' })
                .expect(201);

            // Verify access_code was included in the INSERT
            const queryStr = mockQuery.mock.calls[0][0];
            expect(queryStr).toContain('access_code');
        });

        it('should not generate access_code for public maps', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'new-public-map', name: 'Open Map', is_private: false }]
            });

            const response = await request(app)
                .post('/api/maps')
                .send({ name: 'Open Map', is_private: false })
                .expect(201);

            // For public maps, access_code should be null
            const queryParams = mockQuery.mock.calls[0][1];
            expect(queryParams).toContain(null); // access_code param should be null
        });
    });

    describe('Encryption Salt', () => {
        it('should store encryption_salt when provided in POST /api/maps', async () => {
            const mapData = {
                id: 'enc-map-1',
                name: '🔒encrypted-name',
                is_private: true,
                access_token: 'test-token',
                encryption_salt: 'base64-salt-value=='
            };

            mockQuery.mockResolvedValueOnce({
                rows: [{ ...mapData, access_code: 'ABC123' }]
            });

            const response = await request(app)
                .post('/api/maps')
                .send(mapData)
                .expect(201);

            // Verify encryption_salt was passed to the query
            const queryParams = mockQuery.mock.calls[0][1];
            expect(queryParams).toContain('base64-salt-value==');
        });

        it('should return encryption_salt in GET /api/maps/:id', async () => {
            const mapRow = {
                id: 'enc-map-1',
                name: '🔒encrypted-name',
                is_private: false,
                access_token: null,
                access_code: null,
                encryption_salt: 'base64-salt=='
            };

            mockQuery.mockResolvedValueOnce({ rows: [mapRow] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({ rows: [mapRow] }); // GET query

            const response = await request(app)
                .get('/api/maps/enc-map-1')
                .expect(200);

            expect(response.body[0].encryption_salt).toBe('base64-salt==');
        });

        it('should update encryption_salt via PATCH /api/maps/:id', async () => {
            const mapRow = { id: 'map-1', is_private: false, access_token: null };

            mockQuery.mockResolvedValueOnce({ rows: [mapRow] }); // validateMapAccess
            mockQuery.mockResolvedValueOnce({
                rows: [{ ...mapRow, encryption_salt: 'new-salt==' }]
            }); // UPDATE

            const response = await request(app)
                .patch('/api/maps/map-1')
                .send({ encryption_salt: 'new-salt==' })
                .expect(200);

            // Verify UPDATE query was called with salt
            const updateCall = mockQuery.mock.calls[1];
            expect(updateCall[1]).toContain('new-salt==');
        });

        it('should include encryption_salt in access code lookup', async () => {
            const mapRow = {
                id: 'enc-map',
                name: '🔒encrypted',
                is_private: true,
                encryption_salt: 'lookup-salt=='
            };

            mockQuery.mockResolvedValueOnce({ rows: [mapRow] });

            const response = await request(app)
                .get('/api/maps/code/ABC123')
                .expect(200);

            expect(response.body.encryption_salt).toBe('lookup-salt==');
        });
    });
});
