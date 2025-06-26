// functions/getPins.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { Client } from 'pg';
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
  const { rows } = await client.query(
    'SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at',
    [mapId]
  );
  return {
    statusCode: 200,
    body: JSON.stringify(rows),
  };
};
