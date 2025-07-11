// migrations/migrate.cjs
const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();

    // resolve SQL path (assuming 01_create_tables.sql sits alongside this file)
    const sqlPath = path.join(__dirname, '01_create_tables.sql');
    const sql     = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('✅ Migration applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
