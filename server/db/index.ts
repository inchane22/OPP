import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import type { NeonClient } from '@neondatabase/serverless';

// Configure neon
const connectionString = process.env.DATABASE_URL!;

// Basic configuration
neonConfig.fetchConnectionCache = true;
neonConfig.wsProxy = (host) => host;

// Create SQL connection
const sql_connection: NeonClient = neon(connectionString);

// Initialize drizzle with proper configuration and type safety
export const db = drizzle(sql_connection);

// Test connection with proper error handling
export async function testConnection() {
  try {
    console.log('Testing database connection...');
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