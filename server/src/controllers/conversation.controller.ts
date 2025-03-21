// server/src/controllers/conversation.controller.ts
import { Request, Response } from 'express';
import { Conversation, Message, User } from '../db/models';
import { AgentFactory } from '../services/AgentFactory';
import { RoleType } from '../types/agent';
import { logger } from '../utils/logger';

export class ConversationController {
  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const conversations = await Conversation.findAll({
        where: { userId },
        order: [['updatedAt', 'DESC']],
      });
      
      res.json({ conversations });
    } catch (error: any) {
      logger.error(`Get conversations error: ${error.message}`);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  }
  
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const conversationId = req.params.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const conversation = await Conversation.findOne({
        where: { id: conversationId, userId },
      });
      
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      
      res.json({ conversation });
    } catch (error: any) {
      logger.error(`Get conversation error: ${error.message}`);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }
  
  async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { title } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      if (!title) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }
      
      const conversation = await Conversation.create({
        userId,
        title,
      });
      
      res.status(201).json({ conversation });
    } catch (error: any) {
      logger.error(`Create conversation error: ${error.message}`);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }
  
  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const conversationId = req.params.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const conversation = await Conversation.findOne({
        where: { id: conversationId, userId },
      });
      
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      
      // Delete messages and plans first (will be handled by database cascade)
      await conversation.destroy();
      
      res.json({ message: 'Conversation deleted successfully' });
    } catch (error: any) {
      logger.error(`Delete conversation error: ${error.message}`);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  }
  
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const conversationId = req.params.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
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
      
      const messages = await Message.findAll({
        where: { conversationId },
        order: [['createdAt', 'ASC']],
      });
      
      res.json({ messages });
    } catch (error: any) {
      logger.error(`Get messages error: ${error.message}`);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
  
  async addMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const conversationId = req.params.id;
      const { content, role = RoleType.USER } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      if (!content) {
        res.status(400).json({ error: 'Content is required' });
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
      
      const message = await Message.create({
        conversationId,
        role,
        content,
      });
      
      res.status(201).json({ message });
    } catch (error: any) {
      logger.error(`Add message error: ${error.message}`);
      res.status(500).json({ error: 'Failed to add message' });
    }
  }
  
  async runConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const conversationId = req.params.id;
      const { message } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      if (!message) {
        res.status(400).json({ error: 'Message is required' });
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
      
      // Get user config
      const user = await User.findByPk(userId);
      
      if (!user || !user.apiKey) {
        res.status(400).json({ error: 'API key not configured' });
        return;
      }
      
      // Add user message to database
      await Message.create({
        conversationId,
        role: RoleType.USER,
        content: message,
      });
      
      // Get existing messages for context
      const messages = await Message.findAll({
        where: { conversationId },
        order: [['createdAt', 'ASC']],
      });
      
      // Map database messages to agent messages
      const agentMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content || '',
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        name: msg.name,
      }));
      
      // Create agent factory
      const agentFactory = new AgentFactory(
        user.apiKey,
        user.model || 'gpt-4o'
      );
      
      // Create planning agent with conversation history
      const agent = agentFactory.createAgentFromMessages(
        'planning',
        agentMessages,
        'conversation_agent',
        {
          maxSteps: 10,
        }
      );
      
      // Run agent
      const result = await agent.run();
      
      // Save agent messages to database
      for (const msg of agent.memory.messages) {
        // Skip messages that are already in the database
        const existingMessage = messages.find(dbMsg => 
          dbMsg.role === msg.role && 
          dbMsg.content === msg.content
        );
        
        if (existingMessage) continue;
        
        await Message.create({
          conversationId,
          role: msg.role,
          content: msg.content,
          toolCalls: msg.toolCalls,
          toolCallId: msg.toolCallId,
          name: msg.name,
        });
      }
      
      // Get updated messages
      const updatedMessages = await Message.findAll({
        where: { conversationId },
        order: [['createdAt', 'ASC']],
      });
      
      res.json({
        result,
        messages: updatedMessages,
      });
    } catch (error: any) {
      logger.error(`Run conversation error: ${error.message}`);
      res.status(500).json({ error: `Failed to run conversation: ${error.message}` });
    }
  }
}

export const conversationController = new ConversationController();