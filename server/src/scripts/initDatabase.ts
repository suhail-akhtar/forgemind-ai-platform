// server/src/scripts/initDatabase.ts
import dotenv from 'dotenv';
import path from 'path';
import { sequelize, initModels } from '../db/models';
import { logger } from '../utils/logger';

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (result.error) {
  logger.error(`Error loading .env file: ${result.error.message}`);
  process.exit(1);
}

// Log environment variables (but mask password)
logger.info(`Database config: ${process.env.DB_HOST}:${process.env.DB_PORT} ${process.env.DB_NAME} (user: ${process.env.DB_USER})`);

async function initializeDatabase() {
  try {
    logger.info('Initializing database connection...');
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    logger.info('Synchronizing models...');
    await initModels();
    logger.info('Models synchronized successfully');
    
    process.exit(0);
  } catch (error: any) {
    logger.error(`Database initialization failed: ${error.message}`);
    process.exit(1);
  }
}

initializeDatabase();