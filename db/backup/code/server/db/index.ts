import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Configure neon
const connectionString = process.env.DATABASE_URL!;

// Create SQL connection with proper configuration
const sql_connection = neon(connectionString);

// Initialize drizzle with proper configuration and type safety
export const db = drizzle(sql_connection);

// Test connection with proper error handling
export async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await db.execute(sql`SELECT 1 as test`);
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