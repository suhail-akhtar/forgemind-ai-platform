// server/src/app.ts
import './config/env'; // Import this first to load environment variables
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { apiRoutes } from './routes';
import { initDatabase } from './db/config';
import { logger } from './utils/logger';

export const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Error handling
app.use(errorHandler);

// Initialize database connection
export const initApp = async (): Promise<void> => {
  try {
    await initDatabase();
    logger.info('App initialized successfully');
  } catch (error: any) {
    logger.error(`Failed to initialize app: ${error.message}`);
    throw error;
  }
};