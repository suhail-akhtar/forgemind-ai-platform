// server/src/services/AgentFactory.ts
import { BaseAgent } from '../agents/BaseAgent';
import { ReActAgent } from '../agents/ReActAgent';
import { ToolCallAgent } from '../agents/ToolCallAgent';
import { PlanningAgent } from '../agents/PlanningAgent';
import { Memory } from './Memory';
import { LLMProvider, LLMConfig, LLMService } from '../llm/LLMInterface';
import {OpenAIService} from '../llm/OpenAIService';
import { LLMFactory } from '../llm/LLMFactory';
import { ToolCollection } from './ToolCollection';
import { ToolFactory } from './ToolFactory';
import { RoleType } from '../types/agent';
import { logger } from '../utils/logger';

export class AgentFactory {
  private readonly llm: LLMService;
  private readonly tools: ToolCollection;
  
  constructor(
    llmConfig: LLMConfig,
    provider: LLMProvider = LLMProvider.OPENAI,
    tools?: ToolCollection,
    config?: {
      searchApiKey?: string;
      searchEngineId?: string;
    }
  ) {
    // Create LLM service based on provider
    this.llm = LLMFactory.createLLMService(provider, llmConfig);
    
    if (tools) {
      this.tools = tools;
    } else {
      this.tools = ToolFactory.createDefaultTools({
        searchApiKey: config?.searchApiKey,
        searchEngineId: config?.searchEngineId,
      });
    }
    
    logger.info(`Agent factory initialized with model: ${this.llm.model} using provider: ${provider}`);
    logger.info(`Available tools: ${this.tools.getToolNames().join(', ')}`);
  }
  
  createReActAgent(
    name: string = 'react_agent',
    memory?: Memory,
    config?: {
      systemPrompt?: string;
      maxSteps?: number;
    }
  ): ReActAgent {
    const agentMemory = memory || new Memory();
    return new ReActAgent(name, agentMemory, this.llm as OpenAIService, config);
  }
  
  createToolCallAgent(
    name: string = 'tool_agent',
    memory?: Memory,
    config?: {
      systemPrompt?: string;
      maxSteps?: number;
    }
  ): ToolCallAgent {
    const agentMemory = memory || new Memory();
    return new ToolCallAgent(name, agentMemory, this.llm as OpenAIService, this.tools, config);
  }
  
  createPlanningAgent(
    name: string = 'planning_agent',
    memory?: Memory,
    config?: {
      systemPrompt?: string;
      maxSteps?: number;
      planRequired?: boolean;
    }
  ): PlanningAgent {
    const agentMemory = memory || new Memory();
    return new PlanningAgent(name, agentMemory, this.llm as OpenAIService, this.tools, config);
  }
  
  /**
   * Create an agent from existing messages
   */
  createAgentFromMessages(
    type: 'react' | 'tool' | 'planning',
    messages: Array<{ role: RoleType; content: string; }>,
    name?: string,
    config?: any
  ): BaseAgent {
    const memory = new Memory();
    
    // Add messages to memory
    messages.forEach(msg => {
      memory.addMessage({ role: msg.role, content: msg.content });
    });
    
    switch (type) {
      case 'react':
        return this.createReActAgent(name || 'react_agent', memory, config);
      case 'tool':
        return this.createToolCallAgent(name || 'tool_agent', memory, config);
      case 'planning':
        return this.createPlanningAgent(name || 'planning_agent', memory, config);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
}