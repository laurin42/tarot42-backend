import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as tls from 'tls';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

const connectionString = process.env.DATABASE_URL;

let sslConfig: tls.ConnectionOptions | boolean | undefined = undefined;

if (connectionString.includes('sslmode=require') || process.env.NODE_ENV === 'production') {
  sslConfig = {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  };
} else if (connectionString.includes('sslmode=prefer')) {
  sslConfig = {
    rejectUnauthorized: false,
  };
} else if (connectionString.includes('sslmode=disable')) {
  sslConfig = false;
} else {
  if (process.env.NODE_ENV !== 'production') {
    // sslConfig = false;
  }
}

const poolConfig: PoolConfig = {
  connectionString: connectionString,
  ssl: sslConfig,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

console.log('[DB_POOL_CONFIG] Max clients:', poolConfig.max, 'Idle Timeout:', poolConfig.idleTimeoutMillis);
if (poolConfig.ssl && typeof poolConfig.ssl === 'object') {
  console.log('[DB_POOL_CONFIG] SSL rejectUnauthorized:', poolConfig.ssl.rejectUnauthorized);
} else if (poolConfig.ssl === true) {
  console.log('[DB_POOL_CONFIG] SSL enabled (default options).');
} else {
  console.log('[DB_POOL_CONFIG] SSL disabled or not explicitly configured.');
}

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
  console.error('[DB_POOL_ON_ERROR] Error on idle client in pool:', err.message, err.stack);
});

pool.on('connect', (client) => {
  console.log('[DB_POOL_ON_CONNECT] Client acquired from pool.');
  client.on('error', (err) => {
    console.error('[DB_CLIENT_ON_ERROR] Error on an active client from pool:', err.message, err.stack);
  });
});

export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });

export async function connectDb() {
  let retries = 3;
  while (retries) {
    try {
      console.log(`[DB_CONNECT_START] Attempting to connect to DB pool (attempt ${4 - retries}/3)...`);
      const client = await pool.connect();
      console.log('[DB_CONNECT_CLIENT_ACQUIRED] Client acquired from pool.');
      await client.query('SELECT NOW() AS now');
      client.release();
      console.log('[DB_CONNECT_SUCCESS] Successfully connected to the database pool.');
      return;
    } catch (error: any) {
      console.error(`[DB_CONNECT_FAILED] Failed to connect (attempt ${4 - retries}/3):`, error.message);
      retries -= 1;
      if (retries === 0) {
        console.error('[DB_CONNECT_FATAL] All retries failed. Exiting.');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 3000)); // 3 Sekunden warten
    }
  }
}

export async function disconnectDb() {
  try {
    console.log('[DB_DISCONNECT_START] Attempting to close database connection pool...');
    await pool.end(); // Schließt alle Verbindungen im Pool
    console.log('[DB_DISCONNECT_SUCCESS] Database connection pool has been closed.');
  } catch (error: any) {
    console.error('[DB_DISCONNECT_FAILED] Failed to close the database connection pool:', error.message, error.stack);
  }
} 