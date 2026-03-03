const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:showme_password@localhost:5432/showme',
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'showme-api' });
});

// Create map
app.post('/api/maps', async (req, res) => {
  try {
    const { id, name, is_private = false, access_token = null, fuzzing_enabled = false, fuzzing_radius = 100, created_at } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Map name is required' });
    }

    // Use client-provided ID or generate new one
    const mapId = id || uuidv4();
    const timestamp = created_at || new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO maps (id, name, is_private, access_token, fuzzing_enabled, fuzzing_radius, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         is_private = EXCLUDED.is_private,
         access_token = EXCLUDED.access_token,
         fuzzing_enabled = EXCLUDED.fuzzing_enabled,
         fuzzing_radius = EXCLUDED.fuzzing_radius
       RETURNING *`,
      [mapId, name, is_private, access_token, fuzzing_enabled, fuzzing_radius, timestamp]
    );

    console.log('Created map:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating map:', error);
    res.status(500).json({ error: 'Failed to create map' });
  }
});

// Get map by ID (array format for backward compatibility)
app.get('/api/maps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM maps WHERE id = $1', [id]);

    // Return array to match legacy PostgREST expectations
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting map:', error);
    res.status(500).json({ error: 'Failed to get map' });
  }
});

// Create pin
app.post('/api/pins', async (req, res) => {
  try {
    const { id, map_id, lat, lng, type = null, tags = [], description = null, photo_urls = [], expires_at = null, created_at, updated_at } = req.body;

    if (!map_id || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'map_id, lat, and lng are required' });
    }

    // Use client-provided ID or generate new one
    const pinId = id || uuidv4();
    const timestamp = created_at || new Date().toISOString();
    const updateTimestamp = updated_at || timestamp;

    const result = await pool.query(
      `INSERT INTO pins (id, map_id, lat, lng, type, tags, description, photo_urls, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         map_id = EXCLUDED.map_id,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         type = EXCLUDED.type,
         tags = EXCLUDED.tags,
         description = EXCLUDED.description,
         photo_urls = EXCLUDED.photo_urls,
         expires_at = EXCLUDED.expires_at,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [pinId, map_id, lat, lng, type, tags, description, photo_urls, expires_at, timestamp, updateTimestamp]
    );

    console.log('Created pin:', result.rows[0].id, 'for map:', map_id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating pin:', error);
    res.status(500).json({ error: 'Failed to create pin' });
  }
});

// Get pins by map_id (Polling Fallback)
app.get('/api/pins', async (req, res) => {
  try {
    const { map_id, after } = req.query;

    if (!map_id) {
      return res.status(400).json({ error: 'map_id query parameter is required' });
    }

    let query = 'SELECT * FROM pins WHERE map_id = $1';
    const params = [map_id];

    if (after) {
      query += ' AND updated_at > $2';
      params.push(after);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting pins:', error);
    res.status(500).json({ error: 'Failed to get pins' });
  }
});

// Update pin
app.patch('/api/pins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    // Build dynamic SET clause from provided fields
    const allowedFields = ['lat', 'lng', 'type', 'tags', 'description', 'photo_urls', 'expires_at'];
    const setClauses = ['updated_at = NOW()'];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    // Add id as last parameter
    values.push(id);

    const result = await pool.query(
      `UPDATE pins SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pin not found' });
    }

    console.log('Updated pin:', id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating pin:', error);
    res.status(500).json({ error: 'Failed to update pin' });
  }
});

// Delete pin
app.delete('/api/pins/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM pins WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pin not found' });
    }

    console.log('Deleted pin:', id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting pin:', error);
    res.status(500).json({ error: 'Failed to delete pin' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ShowMe API listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing HTTP server');
  await pool.end();
  process.exit(0);
});

// Export for testing
module.exports = app;
