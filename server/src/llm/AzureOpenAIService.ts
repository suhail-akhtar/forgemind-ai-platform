// server/src/llm/AzureOpenAIService.ts
import OpenAI from 'openai';
import { LLMResponse, Message, ToolChoice } from '../types/agent';
import { logger } from '../utils/logger';
import { LLMService, LLMConfig } from './LLMInterface';

export class AzureOpenAIService implements LLMService {
  private client: OpenAI;
  public model: string;
  public maxTokens: number;
  public temperature: number;
  private deploymentName: string;
  
  constructor(config: LLMConfig) {
    if (!config.endpoint || !config.apiVersion || !config.deploymentName) {
      throw new Error('Azure OpenAI requires endpoint, apiVersion and deploymentName');
    }
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.endpoint}/openai/deployments/${config.deploymentName}`,
      defaultQuery: { 'api-version': config.apiVersion },
    });
    
    this.model = config.model;
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.deploymentName = config.deploymentName;
    
    logger.info(`Azure OpenAI service initialized with model: ${this.model}, deployment: ${this.deploymentName}`);
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
      logger.error(`Azure OpenAI ask error: ${error.message}`);
      throw new Error(`Failed to get response from Azure OpenAI: ${error.message}`);
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
      logger.error(`Azure OpenAI askWithTools error: ${error.message}`);
      throw new Error(`Failed to get response with tools from Azure OpenAI: ${error.message}`);
    }
  }
}