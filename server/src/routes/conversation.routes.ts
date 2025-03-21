// server/src/routes/conversation.routes.ts
import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller';
import { authMiddleware } from '../middleware/authMiddleware';

export const conversationRoutes = Router();

// All routes require authentication
conversationRoutes.use(authMiddleware);

// Using wrapper functions to ensure correct typing
conversationRoutes.get('/', (req, res) => conversationController.getConversations(req, res));
conversationRoutes.get('/:id', (req, res) => conversationController.getConversation(req, res));
conversationRoutes.post('/', (req, res) => conversationController.createConversation(req, res));
conversationRoutes.delete('/:id', (req, res) => conversationController.deleteConversation(req, res));
conversationRoutes.get('/:id/messages', (req, res) => conversationController.getMessages(req, res));
conversationRoutes.post('/:id/messages', (req, res) => conversationController.addMessage(req, res));
conversationRoutes.post('/:id/run', (req, res) => conversationController.runConversation(req, res));