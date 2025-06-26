// functions/createMap.ts
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
  const { name, is_private } = JSON.parse(event.body ?? '{}');
  const id = uuidv4();
  const access_token = is_private ? uuidv4() : null;

  await client.query(
    `INSERT INTO maps(id,name,is_private,access_token) VALUES($1,$2,$3,$4)`,
    [id, name, is_private, access_token]
  );

  return {
    statusCode: 201,
    body: JSON.stringify({ id, access_token }),
  };
};
