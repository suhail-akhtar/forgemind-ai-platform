// server/src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (result.error) {
  logger.warn(`Error loading .env file: ${result.error.message}. Using default values.`);
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mindforge',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  },
  // Add other configuration sections as needed
};

// Ensure this file gets executed early in the application startup
export default config;