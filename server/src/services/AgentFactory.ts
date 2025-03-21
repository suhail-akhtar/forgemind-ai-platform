// server/src/services/AgentFactory.ts
import { BaseAgent } from '../agents/BaseAgent';
import { ReActAgent } from '../agents/ReActAgent';
import { ToolCallAgent } from '../agents/ToolCallAgent';
import { PlanningAgent } from '../agents/PlanningAgent';
import { Memory } from './Memory';
import { OpenAIService } from '../llm/OpenAIService';
import { ToolCollection } from './ToolCollection';
import { ToolFactory } from './ToolFactory';
import { RoleType } from '../types/agent';
import { logger } from '../utils/logger';

export class AgentFactory {
  private readonly llm: OpenAIService;
  private readonly tools: ToolCollection;
  
  constructor(
    apiKey: string,
    model: string = 'gpt-4o',
    tools?: ToolCollection,
    config?: {
      searchApiKey?: string;
      searchEngineId?: string;
    }
  ) {
    this.llm = new OpenAIService(apiKey, model);
    
    if (tools) {
      this.tools = tools;
    } else {
      this.tools = ToolFactory.createDefaultTools({
        searchApiKey: config?.searchApiKey,
        searchEngineId: config?.searchEngineId,
      });
    }
    
    logger.info(`Agent factory initialized with model: ${model}`);
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
    return new ReActAgent(name, agentMemory, this.llm, config);
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
    return new ToolCallAgent(name, agentMemory, this.llm, this.tools, config);
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
    return new PlanningAgent(name, agentMemory, this.llm, this.tools, config);
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