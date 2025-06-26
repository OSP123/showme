// functions/addPin.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
let connected = false;

async function ensureConnection() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  await ensureConnection();
  const mapId = event.pathParameters?.mapId!;
  const { lat, lng, tags, description, photo_urls } = JSON.parse(event.body ?? '{}');
  const id = uuidv4();

  await client.query(
    `INSERT INTO pins(
       id, map_id, lat, lng, tags, description, photo_urls, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, now(), now()
     )`,
    [id, mapId, lat, lng, tags || [], description || null, photo_urls || []]
  );

  return {
    statusCode: 201,
    body: JSON.stringify({ id }),
  };
};
