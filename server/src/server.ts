// server/src/server.ts
import './config/env'; // Import this first to load environment variables
import { app, initApp } from './app';
import { logger } from './utils/logger';
import { config } from './config/env';

const PORT = config.port;

async function startServer() {
  try {
    // Initialize the application (database connections, etc.)
    await initApp();
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();