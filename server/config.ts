import { z } from 'zod';

// Environment type definition
const Environment = z.enum(['development', 'production', 'test']);
type Environment = z.infer<typeof Environment>;

// Environment variable types
const EnvVarSchema = z.object({
  PORT: z.string().optional(),
  HOST: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

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
export type EnvVars = z.infer<typeof EnvVarSchema>;

// Parse and validate configuration
function getServerConfig(): ServerConfig {
  // Parse environment variables
  const envVars = EnvVarSchema.parse(process.env);
  
  // Ensure NODE_ENV is set
  process.env.NODE_ENV = envVars.NODE_ENV || 'development';
  
  const env = Environment.parse(process.env.NODE_ENV);
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';
  
  // Handle port configuration
  // In production, we always use port 5000 internally which gets mapped to 80 by Replit
  // In development, we use the configured port or default to 5000
  const configuredPort = isProduction ? 5000 : (envVars.PORT ? parseInt(envVars.PORT, 10) : 5000);
  const configuredHost = envVars.HOST || '0.0.0.0';
  
  return ServerConfigSchema.parse({
    port: configuredPort,
    host: configuredHost,
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

// Export PORT and HOST constants for compatibility
export const PORT: number = serverConfig.port;
export const HOST: string = serverConfig.host;
