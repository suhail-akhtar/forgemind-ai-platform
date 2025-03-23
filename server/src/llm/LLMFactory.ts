// server/src/llm/LLMFactory.ts
import { LLMService, LLMProvider, LLMConfig } from './LLMInterface';
import { OpenAIService } from './OpenAIService';
import { AzureOpenAIService } from './AzureOpenAIService';
import { GeminiService } from './GeminiService';
import { logger } from '../utils/logger';

export class LLMFactory {
  /**
   * Create an LLM service instance based on provider
   */
  static createLLMService(provider: LLMProvider, config: LLMConfig): LLMService {
    switch (provider) {
      case LLMProvider.OPENAI:
        return new OpenAIService(config);
        
      case LLMProvider.AZURE_OPENAI:
        return new AzureOpenAIService(config);
        
      case LLMProvider.GOOGLE_GEMINI:
        return new GeminiService(config);
        
      default:
        logger.warn(`Unknown provider ${provider}, defaulting to OpenAI`);
        return new OpenAIService(config); 
    }
  }
}