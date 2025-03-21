// server/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { User, Session } from '../db/models';
import { logger } from '../utils/logger';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }
      
      // Find user by email
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      // Verify password
      const passwordValid = await user.verifyPassword(password);
      
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      // Create session
      const sessionId = Session.createToken();
      const expiresAt = Session.createExpiryDate();
      
      await Session.create({
        id: sessionId,
        userId: user.id,
        expiresAt,
      });
      
      // Send response with token
      res.json({
        token: sessionId,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error: any) {
      logger.error(`Login error: ${error.message}`);
      res.status(500).json({ error: 'Login failed' });
    }
  }
  
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        res.status(400).json({ error: 'Email, password, and name are required' });
        return;
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      
      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }
      
      // Create user
      const user = await User.create({
        email,
        passwordHash: password, // Will be hashed by model hook
        name,
      });
      
      // Create session
      const sessionId = Session.createToken();
      const expiresAt = Session.createExpiryDate();
      
      await Session.create({
        id: sessionId,
        userId: user.id,
        expiresAt,
      });
      
      // Send response with token
      res.status(201).json({
        token: sessionId,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error: any) {
      logger.error(`Registration error: ${error.message}`);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
  
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }
      
      // Delete session
      await Session.destroy({ where: { id: token } });
      
      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      logger.error(`Logout error: ${error.message}`);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
  
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // User should be attached by auth middleware
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'name', 'model', 'maxTokens', 'temperature'],
      });
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.json({ user });
    } catch (error: any) {
      logger.error(`Get profile error: ${error.message}`);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
  
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { name, apiKey, model, maxTokens, temperature } = req.body;
      
      const user = await User.findByPk(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      // Update fields
      if (name) user.name = name;
      if (apiKey) user.apiKey = apiKey;
      if (model) user.model = model;
      if (maxTokens !== undefined) user.maxTokens = maxTokens;
      if (temperature !== undefined) user.temperature = temperature;
      
      await user.save();
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          model: user.model,
          maxTokens: user.maxTokens,
          temperature: user.temperature,
        },
      });
    } catch (error: any) {
      logger.error(`Update profile error: ${error.message}`);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}

export const authController = new AuthController();