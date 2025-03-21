// server/src/agents/ReActAgent.ts
import { BaseAgent } from './BaseAgent';
import { Memory } from '../services/Memory';
import { OpenAIService } from '../llm/OpenAIService';
import { RoleType } from '../types/agent';
import { logger } from '../utils/logger';

export class ReActAgent extends BaseAgent {
  llm: OpenAIService;
  
  constructor(
    name: string,
    memory: Memory,
    llm: OpenAIService,
    config?: {
      description?: string;
      systemPrompt?: string;
      nextStepPrompt?: string;
      maxSteps?: number;
    }
  ) {
    super(name, memory, config);
    this.llm = llm;
    
    // Default system prompt for ReAct if not provided
    if (!this.systemPrompt) {
      this.systemPrompt = `You are a problem-solving agent that uses a Reasoning and Acting approach. For each step:
1. Think about the current state of the problem
2. Reason about what to do next
3. Decide on an action to take
4. Report the outcome

Maintain clear thinking and explain your reasoning for each step.`;
    }
  }
  
  async think(): Promise<string> {
    try {
      // Add next step prompt if available
      if (this.nextStepPrompt) {
        this.updateMemory(RoleType.SYSTEM, this.nextStepPrompt);
        this.nextStepPrompt = undefined; // Clear for next iteration
      }
      
      // Get LLM response
      const response = await this.llm.ask(
        this.memory.messages,
        this.systemPrompt ? [{ role: RoleType.SYSTEM, content: this.systemPrompt }] : undefined
      );
      
      // Add assistant's response to memory
      this.updateMemory(RoleType.ASSISTANT, response);
      
      logger.info(`[${this.name}] Thinking: ${response.substring(0, 100)}...`);
      return response;
    } catch (error: any) {
      logger.error(`[${this.name}] Error in think phase: ${error.message}`);
      throw new Error(`Thinking failed: ${error.message}`);
    }
  }
  
  async act(): Promise<string> {
    // In ReActAgent, "act" phase is integrated with "think"
    // This is a placeholder for subclasses that implement actual tool execution
    return "Action processing is handled in derived agent classes";
  }
  
  async step(): Promise<string> {
    try {
      // Check if stuck before proceeding
      if (this.isStuck()) {
        this.handleStuckState();
      }
      
      // ReAct just involves thinking
      const thoughtResult = await this.think();
      
      // This base implementation doesn't separate the thinking from acting
      // In derived classes, we'll separate these phases
      return thoughtResult;
    } catch (error: any) {
      logger.error(`[${this.name}] Step failed: ${error.message}`);
      return `Error in step execution: ${error.message}`;
    }
  }
}