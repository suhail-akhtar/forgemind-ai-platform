// server/src/controllers/plan.controller.ts
import { Request, Response } from 'express';
import { Plan, Conversation } from '../db/models';
import { logger } from '../utils/logger';

export class PlanController {
  async getPlans(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const conversationId = req.query.conversationId as string;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // If conversationId is provided, check if it belongs to the user
      if (conversationId) {
        const conversation = await Conversation.findOne({
          where: { id: conversationId, userId },
        });
        
        if (!conversation) {
          res.status(404).json({ error: 'Conversation not found' });
          return;
        }
        
        const plans = await Plan.findAll({
          where: { conversationId },
          order: [['createdAt', 'DESC']],
        });
        
        res.json({ plans });
        return;
      }
      
      // Get all plans for user's conversations
      const conversations = await Conversation.findAll({
        where: { userId },
        attributes: ['id'],
      });
      
      const conversationIds = conversations.map(conv => conv.id);
      
      const plans = await Plan.findAll({
        where: { conversationId: conversationIds },
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Conversation,
            as: 'conversation',
            attributes: ['title'],
          },
        ],
      });
      
      res.json({ plans });
    } catch (error: any) {
      logger.error(`Get plans error: ${error.message}`);
      res.status(500).json({ error: 'Failed to get plans' });
    }
  }
  
  async getPlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const planId = req.params.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const plan = await Plan.findByPk(planId, {
        include: [
          {
            model: Conversation,
            as: 'conversation',
            attributes: ['id', 'title', 'userId'],
          },
        ],
      });
      
      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      
      // Check if plan belongs to user
      if ((plan.conversationId as any).userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      
      res.json({ plan });
    } catch (error: any) {
      logger.error(`Get plan error: ${error.message}`);
      res.status(500).json({ error: 'Failed to get plan' });
    }
  }
  
  async createPlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { conversationId, title, description, steps } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      if (!conversationId || !title || !steps) {
        res.status(400).json({ error: 'ConversationId, title, and steps are required' });
        return;
      }
      
      // Check if conversation belongs to user
      const conversation = await Conversation.findOne({
        where: { id: conversationId, userId },
      });
      
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      
      const plan = await Plan.create({
        conversationId,
        title,
        description,
        steps,
        currentStepIndex: 0,
      });
      
      res.status(201).json({ plan });
    } catch (error: any) {
      logger.error(`Create plan error: ${error.message}`);
      res.status(500).json({ error: 'Failed to create plan' });
    }
  }
  
  async updatePlanStep(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const planId = req.params.id;
      const stepIndex = parseInt(req.params.stepIndex);
      const { status, result } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      if (isNaN(stepIndex)) {
        res.status(400).json({ error: 'Invalid step index' });
        return;
      }
      
      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }
      
      // Get plan with conversation to check ownership
      const plan = await Plan.findByPk(planId, {
        include: [
          {
            model: Conversation,
            as: 'conversation',
            attributes: ['userId'],
          },
        ],
      });
      
      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      
      // Check if plan belongs to user
      if ((plan.conversationId as any).userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      
      // Check if step exists
      if (stepIndex < 0 || stepIndex >= plan.steps.length) {
        res.status(400).json({ error: 'Step index out of bounds' });
        return;
      }
      
      // Update step status
      const steps = [...plan.steps];
      steps[stepIndex].status = status;
      
      if (result) {
        steps[stepIndex].result = result;
      }
      
      // If step is completed, update current step index if necessary
      let currentStepIndex = plan.currentStepIndex;
      if (status === 'completed' && stepIndex === currentStepIndex && currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        steps[currentStepIndex].status = 'in_progress';
      }
      
      // Update plan
      await plan.update({
        steps,
        currentStepIndex,
      });
      
      res.json({ plan });
    } catch (error: any) {
      logger.error(`Update plan step error: ${error.message}`);
      res.status(500).json({ error: 'Failed to update plan step' });
    }
  }
}

export const planController = new PlanController();