// server/src/llm/LLMInterface.ts
import { LLMResponse, Message, ToolChoice } from '../types/agent';

export interface LLMService {
  model: string;
  maxTokens: number;
  temperature: number;
  
  ask(messages: Message[], systemMsgs?: Message[]): Promise<string>;
  askWithTools(
    messages: Message[],
    systemMsgs?: Message[],
    tools?: object[],
    toolChoice?: ToolChoice
  ): Promise<LLMResponse>;
}

export enum LLMProvider {
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure_openai',
  GOOGLE_GEMINI = 'google_gemini'
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  endpoint?: string; // For Azure OpenAI
  apiVersion?: string; // For Azure OpenAI
  deploymentName?: string; // For Azure OpenAI
}