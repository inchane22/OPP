import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
neonConfig.fetchConnectionCache = true;

// Create the neon client with proper configuration
const sql_connection = neon(connectionString);

// Initialize drizzle with the SQL connection
export const db = drizzle(sql_connection, { 
  logger: process.env.NODE_ENV === 'development'
});

// Test connection with proper error handling
export async function testConnection() {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('Database connection verified', { 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: 'Database connection verified'
    });
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}