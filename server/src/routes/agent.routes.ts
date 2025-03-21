// server/src/routes/agent.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';

export const agentRoutes = Router();

// All routes require authentication
agentRoutes.use(authMiddleware);

// TODO: Create agent controller and implement these routes
agentRoutes.get('/', (req, res) => {
  res.status(501).json({ message: 'Agent list functionality not implemented yet' });
});

agentRoutes.post('/run', (req, res) => {
  res.status(501).json({ message: 'Direct agent execution not implemented yet' });
});