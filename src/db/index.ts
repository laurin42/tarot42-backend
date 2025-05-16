import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';


if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Ensure .env is loaded at application startup.');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(client, { schema });

export async function connectDb() {
  try {
    await client.connect();
    console.log('Connected to the database successfully!');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
}

export async function disconnectDb() {
  try {
    await client.end();
    console.log('Disconnected from the database.');
  } catch (error) {
    console.error('Failed to disconnect from the database:', error);
  }
} 