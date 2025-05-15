import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
// import * as dotenv from 'dotenv'; // No longer needed here
import * as schema from './schema';

// dotenv.config({ path: '../.env' }); // Removed: Should be loaded by the main entry point (src/index.ts)

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Ensure .env is loaded at application startup.');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// It's good practice to connect the client before using it with Drizzle, 
// especially if you're not using a Pool which manages connections automatically.
// You might do this once when your application starts.
// For simplicity here, we'll assume the connection will be established.
// In a real app, you'd await client.connect() at startup.

export const db = drizzle(client, { schema });

// Optional: A function to explicitly connect the client if needed at startup
export async function connectDb() {
  try {
    await client.connect();
    console.log('Connected to the database successfully!');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1); // Exit if DB connection fails at startup
  }
}

// Optional: A function to disconnect (though often managed by the app lifecycle or pool)
export async function disconnectDb() {
  try {
    await client.end();
    console.log('Disconnected from the database.');
  } catch (error) {
    console.error('Failed to disconnect from the database:', error);
  }
} 