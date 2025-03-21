// server/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { Session, User } from '../db/models';
import { logger } from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}

export const authMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header missing or invalid' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Validate token
    const session = await Session.findByPk(token);
    
    if (!session) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    // Check if session is expired
    if (session.isExpired()) {
      await session.destroy();
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    
    // Get user
    const user = await User.findByPk(session.userId);
    
    if (!user) {
      await session.destroy();
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    // Attach user and session to request
    req.user = user;
    req.session = session;
    
    next();
  } catch (error: any) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(500).json({ error: 'Authentication failed' });
  }
};