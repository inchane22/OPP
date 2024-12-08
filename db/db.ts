import { drizzle } from 'drizzle-orm/node-postgres';
import { DatabasePool } from '../server/db/pool.js';

// Get the singleton database pool instance
const pool = DatabasePool.getInstance();

// Initialize database connection
const getDb = async () => {
  const poolInstance = await pool.getPool();
  return drizzle(poolInstance);
};

// Export the database instance
export const db = await getDb();

// Export default for ES Module compatibility
export default db;
