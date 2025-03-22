// server/src/llm/GeminiService.ts
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { LLMResponse, Message, RoleType, ToolCall, ToolChoice } from '../types/agent';
import { logger } from '../utils/logger';
import { LLMService, LLMConfig } from './LLMInterface';

interface GeminiTool {
  functionDeclarations: {
    name: string;
    description?: string;
    parameters: object;
  }[];
}

interface GeminiToolCall {
  name: string;
  args: Record<string, any>;
}

interface GeminiResponse {
  response: {
    text: string;
    functionCalls?: GeminiToolCall[];
  };
}

export class GeminiService implements LLMService {
  private client: GoogleGenerativeAI;
  public model: string;
  private generativeModel: GenerativeModel;
  public maxTokens: number;
  public temperature: number;
  
  constructor(config: LLMConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    
    this.generativeModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    logger.info(`Google Gemini service initialized with model: ${this.model}`);
  }
  
  // Convert our Message format to Gemini format
  private mapMessagesToGemini(messages: Message[], systemMsgs?: Message[]): any[] {
    const geminiMessages: any[] = [];
    
    // Add system messages as user messages with a specific role prefix
    if (systemMsgs && systemMsgs.length > 0) {
      const systemContent = systemMsgs
        .map(msg => msg.content)
        .filter(Boolean)
        .join('\n\n');
      
      if (systemContent) {
        geminiMessages.push({
          role: 'user',
          parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${systemContent}\n[/SYSTEM INSTRUCTIONS]` }],
        });
        
        // Add a model response to acknowledge the system message
        geminiMessages.push({
          role: 'model',
          parts: [{ text: 'I\'ll follow these instructions.' }],
        });
      }
    }
    
    // Map our messages to Gemini format
    let currentRole = '';
    let currentParts: any[] = [];
    
    for (const msg of messages) {
      const geminiRole = this.mapRoleToGemini(msg.role);
      
      // Skip tool messages as they're handled differently in Gemini
      if (msg.role === RoleType.TOOL) {
        // For tool messages, add them as "model" messages
        geminiMessages.push({
          role: 'model',
          parts: [{ text: `Tool result for ${msg.name}: ${msg.content}` }],
        });
        continue;
      }
      
      // If we have a new role, push the current message and start a new one
      if (geminiRole !== currentRole && currentRole !== '') {
        geminiMessages.push({
          role: currentRole,
          parts: [...currentParts],
        });
        currentParts = [];
      }
      
      currentRole = geminiRole;
      
      // Add content
      if (msg.content) {
        currentParts.push({ text: msg.content });
      }
      
      // Add tool calls if present
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const toolCallsText = msg.toolCalls
          .map(tool => `Function call: ${tool.function.name}(${tool.function.arguments})`)
          .join('\n');
        
        currentParts.push({ text: toolCallsText });
      }
    }
    
    // Add the last message if there's any
    if (currentRole && currentParts.length > 0) {
      geminiMessages.push({
        role: currentRole,
        parts: [...currentParts],
      });
    }
    
    return geminiMessages;
  }
  
  private mapRoleToGemini(role: string): string {
    switch (role) {
      case RoleType.USER:
        return 'user';
      case RoleType.ASSISTANT:
        return 'model';
      case RoleType.SYSTEM:
        // System messages are handled separately
        return 'user';
      case RoleType.TOOL:
        // Tool messages are handled differently
        return 'model';
      default:
        return 'user';
    }
  }
  
  // Map Gemini's format to our format
  private mapGeminiToolCallsToOurs(functionCalls: GeminiToolCall[] = []): ToolCall[] {
    return functionCalls.map((call, index) => ({
      id: `call_${index}_${Date.now()}`,
      function: {
        name: call.name,
        arguments: JSON.stringify(call.args),
      },
    }));
  }
  
  private convertToolsToGemini(tools?: object[]): GeminiTool | undefined {
    if (!tools || tools.length === 0) return undefined;
    
    return {
      functionDeclarations: tools.map((tool: any) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      })),
    };
  }
  
  async ask(messages: Message[], systemMsgs?: Message[]): Promise<string> {
    try {
      const geminiMessages = this.mapMessagesToGemini(messages, systemMsgs);
      
      const result = await this.generativeModel.generateContent({
        contents: geminiMessages,
      });
      
      return result.response.text();
    } catch (error: any) {
      logger.error(`Google Gemini ask error: ${error.message}`);
      throw new Error(`Failed to get response from Google Gemini: ${error.message}`);
    }
  }
  
  async askWithTools(
    messages: Message[],
    systemMsgs?: Message[],
    tools?: object[],
    toolChoice: ToolChoice = ToolChoice.AUTO
  ): Promise<LLMResponse> {
    try {
      const geminiMessages = this.mapMessagesToGemini(messages, systemMsgs);
      const geminiTools = this.convertToolsToGemini(tools);
      
      // Configure tool settings based on toolChoice
      let toolConfig: any = {};
      
      if (geminiTools) {
        toolConfig.tools = [geminiTools];
        
        if (toolChoice === ToolChoice.REQUIRED) {
          // Force tool use in Gemini
          toolConfig.toolConfig = { functionCallingConfig: { mode: 'MANDATORY' } };
        } else if (toolChoice === ToolChoice.NONE) {
          // Disable tool use in Gemini
          toolConfig.toolConfig = { functionCallingConfig: { mode: 'DISABLED' } };
        } else {
          // Auto tool choice
          toolConfig.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
        }
      }
      
      const result = await this.generativeModel.generateContent({
        contents: geminiMessages,
        ...toolConfig,
      });
      
      const responseText = result.response.text();
      const functionCalls = result.response.functionCalls ? result.response.functionCalls() : [];
      const toolCalls = this.mapGeminiToolCallsToOurs(functionCalls);
      
      return {
        content: responseText,
        toolCalls: toolCalls,
      };
    } catch (error: any) {
      logger.error(`Google Gemini askWithTools error: ${error.message}`);
      throw new Error(`Failed to get response with tools from Google Gemini: ${error.message}`);
    }
  }
}