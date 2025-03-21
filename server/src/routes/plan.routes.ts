// server/src/routes/plan.routes.ts
import { Router } from 'express';
import { planController } from '../controllers/plan.controller';
import { authMiddleware } from '../middleware/authMiddleware';

export const planRoutes = Router();

// All routes require authentication
planRoutes.use(authMiddleware);

// Using wrapper functions to ensure correct typing
planRoutes.get('/', (req, res) => planController.getPlans(req, res));
planRoutes.get('/:id', (req, res) => planController.getPlan(req, res));
planRoutes.post('/', (req, res) => planController.createPlan(req, res));
planRoutes.put('/:id/step/:stepIndex', (req, res) => planController.updatePlanStep(req, res));