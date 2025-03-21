// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export const errorHandler = (
  err: ApiError, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error(`Error: ${message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    stack: err.stack,
    details: err.details
  });
  
  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { 
        stack: err.stack,
        details: err.details 
      })
    }
  });
};