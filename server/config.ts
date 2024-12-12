import { z } from 'zod';

// Environment type definition
const EnvironmentEnum = z.enum(['development', 'production', 'test']);
export type Environment = z.infer<typeof EnvironmentEnum>;

// Environment variable types
const EnvVarSchema = z.object({
  PORT: z.string().optional(),
  HOST: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

// Server configuration schema with validation
const ServerConfigSchema = z.object({
  port: z.number().default(80).describe('Internal server port'),  // Changed default to 80
  host: z.string().default('0.0.0.0').describe('Server host address'),
  env: EnvironmentEnum.default('development'),
  isProduction: z.boolean(),
  isDevelopment: z.boolean(),
});

// Export types and schemas for use in other files
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type EnvVars = z.infer<typeof EnvVarSchema>;
export { ServerConfigSchema, EnvVarSchema };

// Parse and validate configuration
function getServerConfig(): ServerConfig {
  // Parse environment variables
  const envVars = EnvVarSchema.parse(process.env);

  // Ensure NODE_ENV is set
  process.env.NODE_ENV = envVars.NODE_ENV || 'development';

  const env = EnvironmentEnum.parse(process.env.NODE_ENV);
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';

  // Handle port configuration
  // In production, we always use port 80 internally as required by cloud platforms
  // In development, we use the configured port or default to 3000
  const configuredPort = isProduction 
    ? 80  // Always use port 80 in production
    : (envVars.PORT ? parseInt(envVars.PORT, 10) : 3000);

  const configuredHost = envVars.HOST || '0.0.0.0';

  return ServerConfigSchema.parse({
    port: configuredPort,
    host: configuredHost,
    env,
    isProduction,
    isDevelopment,
  });
}

// Export singleton config instance with type-safe configuration
export const serverConfig = Object.freeze({
  ...getServerConfig(),
  toString: () => JSON.stringify({
    port: serverConfig.port,
    host: serverConfig.host,
    env: serverConfig.env,
    isProduction: serverConfig.isProduction,
    isDevelopment: serverConfig.isDevelopment,
    note: serverConfig.isProduction 
      ? 'Using port 80 internally for cloud platform compatibility'
      : 'Using configurable port for development'
  }, null, 2)
}) as ServerConfig & { toString: () => string };

// Export configuration values as constants
export const PORT: number = serverConfig.port;
export const HOST: string = serverConfig.host;
export const env = serverConfig.env;
export const isProduction = serverConfig.isProduction;
export const isDevelopment = serverConfig.isDevelopment;

// Ensure these values are readonly
Object.freeze(PORT);
Object.freeze(HOST);