import { z } from 'zod';

// Environment type definition
const Environment = z.enum(['development', 'production', 'test']);
type Environment = z.infer<typeof Environment>;

// Server configuration schema with validation
const ServerConfigSchema = z.object({
  port: z.number().default(5000).describe('Internal server port'),
  host: z.string().default('0.0.0.0').describe('Server host address'),
  env: Environment.default('development'),
  isProduction: z.boolean(),
  isDevelopment: z.boolean(),
});

// Export the type for use in other files
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// Parse and validate configuration
function getServerConfig(): ServerConfig {
  // Ensure NODE_ENV is set
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  
  const env = Environment.parse(process.env.NODE_ENV);
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';
  
  // In production, we'll use PORT env var or default to 5000
  const configuredPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  
  return ServerConfigSchema.parse({
    port: isProduction ? 80 : configuredPort, // Use port 80 in production
    host: '0.0.0.0',
    env,
    isProduction,
    isDevelopment,
  });
}

// Export singleton config instance
export const serverConfig = Object.freeze({
  ...getServerConfig(),
  // Add utility method for debugging
  toString: () => JSON.stringify({
    port: serverConfig.port,
    host: serverConfig.host,
    env: serverConfig.env,
    isProduction: serverConfig.isProduction,
    isDevelopment: serverConfig.isDevelopment,
    note: serverConfig.isProduction 
      ? 'Using port 5000 internally, mapped to 80 by Replit in production'
      : 'Using direct port mapping'
  }, null, 2)
});

// Export individual config values for convenience
export const {
  port,
  host,
  env,
  isProduction,
  isDevelopment
} = serverConfig;
