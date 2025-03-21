// server/src/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/authMiddleware';

export const authRoutes = Router();

// Public routes
authRoutes.post('/login', (req, res) => authController.login(req, res));
authRoutes.post('/register', (req, res) => authController.register(req, res));

// Protected routes
authRoutes.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));
authRoutes.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));
authRoutes.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));