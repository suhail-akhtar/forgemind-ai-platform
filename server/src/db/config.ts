// server/src/db/config.ts
import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

// Log database connection attempt
logger.info(`Connecting to database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME} as ${process.env.DB_USER}`);

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Login@786',
  database: process.env.DB_NAME || 'mindforge',
  logging: (msg) => logger.debug(msg),
  timezone: '+00:00',
  define: {
    timestamps: true,
    underscored: true
  }
});

export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
  } catch (error: any) {
    logger.error(`Unable to connect to database: ${error.message}`);
    throw error;
  }
};

export default sequelize;