// Define type for log data to ensure consistency
export type LogData = Record<string, any>;

export const log = (message: string, data: LogData = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message,
    ...data
  }));
};

// Also export the logger function for backwards compatibility
export const logger = log;
