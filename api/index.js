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
