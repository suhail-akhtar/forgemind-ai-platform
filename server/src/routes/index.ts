// server/src/routes/index.ts
import { Router } from 'express';
import { agentRoutes } from './agent.routes';
import { authRoutes } from './auth.routes';
import { conversationRoutes } from './conversation.routes';
import { planRoutes } from './plan.routes';

export const apiRoutes = Router();

// Health check endpoint
apiRoutes.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register all API routes
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/agents', agentRoutes);
apiRoutes.use('/conversations', conversationRoutes);
apiRoutes.use('/plans', planRoutes);