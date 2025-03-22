// server/src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';
import { LLMProvider } from '../llm/LLMInterface';

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (result.error) {
  logger.warn(`Error loading .env file: ${result.error.message}. Using default values.`);
}

// Helper to safely get enum value
function getEnumValue<T extends object>(enumObj: T, value: string, defaultValue: T[keyof T]): T[keyof T] {
  const values = Object.values(enumObj);
  return values.includes(value as any) ? value as T[keyof T] : defaultValue;
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mindforge',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  },
  
  llm: {
    provider: getEnumValue(
      LLMProvider,
      process.env.LLM_PROVIDER || '',
      LLMProvider.OPENAI
    ),
    
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    },
    
    azureOpenai: {
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-12-01-preview',
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '',
      model: process.env.AZURE_OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE || '0.6'),
    },
    
    googleGemini: {
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
      model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.0-flash',
      maxTokens: parseInt(process.env.GOOGLE_GEMINI_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.GOOGLE_GEMINI_TEMPERATURE || '0.6'),
    },
  },
  
  google: {
    searchApiKey: process.env.GOOGLE_SEARCH_API_KEY || '',
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || '',
  },
};

// Ensure this file gets executed early in the application startup
export default config;