// src/llm/OpenAIService.ts
import OpenAI from 'openai';
import { LLMResponse, Message, ToolChoice } from '../types/agent';
import { logger } from '../utils/logger';

export class OpenAIService {
  private client: OpenAI;
  public model: string;
  public maxTokens: number;
  public temperature: number;
  
  constructor(
    apiKey: string,
    model: string = 'gpt-4o',
    maxTokens: number = 2000,
    temperature: number = 0.7
  ) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }
  
  async ask(messages: Message[], systemMsgs?: Message[]): Promise<string> {
    try {
      const allMessages = [...(systemMsgs || []), ...messages];
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: allMessages as any,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });
      
      return response.choices[0].message.content || '';
    } catch (error: any) {
      logger.error(`LLM ask error: ${error.message}`);
      throw new Error(`Failed to get response: ${error.message}`);
    }
  }
  
  async askWithTools(
    messages: Message[],
    systemMsgs?: Message[],
    tools?: object[],
    toolChoice: ToolChoice = ToolChoice.AUTO
  ): Promise<LLMResponse> {
    try {
      const allMessages = [...(systemMsgs || []), ...messages];
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: allMessages as any,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        tools: tools as any,
        tool_choice: toolChoice === ToolChoice.AUTO ? 'auto' : 
                     toolChoice === ToolChoice.REQUIRED ? 'required' : 'none',
      });
      
      const choice = response.choices[0].message;
      
      return {
        content: choice.content || '',
        toolCalls: choice.tool_calls as any || [],
      };
    } catch (error: any) {
      logger.error(`LLM askWithTools error: ${error.message}`);
      throw new Error(`Failed to get response with tools: ${error.message}`);
    }
  }
}