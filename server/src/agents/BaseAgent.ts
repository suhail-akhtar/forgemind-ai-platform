// server/src/agents/BaseAgent.ts
import { AgentState, Message, RoleType } from '../types/agent';
import { Memory } from '../services/Memory';
import { logger } from '../utils/logger';

export abstract class BaseAgent {
  name: string;
  description?: string;
  systemPrompt?: string;
  nextStepPrompt?: string;
  memory: Memory;
  state: AgentState = AgentState.IDLE;
  maxSteps: number = 10;
  currentStep: number = 0;
  
  constructor(
    name: string, 
    memory: Memory,
    config?: {
      description?: string;
      systemPrompt?: string;
      nextStepPrompt?: string;
      maxSteps?: number;
    }
  ) {
    this.name = name;
    this.memory = memory;
    
    if (config) {
      this.description = config.description;
      this.systemPrompt = config.systemPrompt;
      this.nextStepPrompt = config.nextStepPrompt;
      this.maxSteps = config.maxSteps || this.maxSteps;
    }
  }
  
  abstract step(): Promise<string>;
  
  async initialize(): Promise<void> {
    this.state = AgentState.IDLE;
    this.currentStep = 0;
    
    // Add system prompt if provided
    if (this.systemPrompt) {
      this.memory.addMessage({
        role: RoleType.SYSTEM,
        content: this.systemPrompt
      });
    }
    
    logger.info(`Initialized agent: ${this.name}`);
  }
  
  async run(request?: string): Promise<string> {
    // Initialize if needed
    if (this.state === AgentState.IDLE) {
      await this.initialize();
    }
    
    // Add user request if provided
    if (request) {
      this.updateMemory(RoleType.USER, request);
    }
    
    const results: string[] = [];
    this.state = AgentState.RUNNING;
    
    try {
      while (this.currentStep < this.maxSteps && this.state !== AgentState.FINISHED as AgentState) {
        this.currentStep++;
        logger.info(`[${this.name}] Executing step ${this.currentStep}/${this.maxSteps}`);
        
        const stepResult = await this.step();
        results.push(stepResult);
        
        // Add any logic for early termination here
      }
      
      if (this.currentStep >= this.maxSteps) {
        this.state = AgentState.FINISHED;
        results.push(`Terminated: Reached max steps (${this.maxSteps})`);
      }
      
      return results.join('\n');
    } catch (error: any) {
      logger.error(`[${this.name}] Error during execution: ${error.message}`);
      this.state = AgentState.IDLE;
      throw error;
    } finally {
      // Reset state if still running
      if (this.state === AgentState.RUNNING) {
        this.state = AgentState.IDLE;
      }
    }
  }
  
  updateMemory(role: RoleType, content: string): void {
    this.memory.addMessage({ role, content });
  }
  
  protected isStuck(): boolean {
    // Default implementation to detect repetitive behavior
    const messages = this.memory.messages;
    if (messages.length < 6) return false;
    
    // Get last three assistant messages
    const assistantMessages = messages
      .filter(msg => msg.role === RoleType.ASSISTANT)
      .slice(-3)
      .map(msg => msg.content);
    
    // Check if all three messages are identical
    if (assistantMessages.length === 3) {
      const [msg1, msg2, msg3] = assistantMessages;
      if (msg1 === msg2 && msg2 === msg3 && msg1 !== undefined) {
        return true;
      }
    }
    
    return false;
  }
  
  protected handleStuckState(): void {
    const stuckPrompt = "I notice you seem to be repeating the same approach. Consider trying a different strategy to make progress.";
    this.updateMemory(RoleType.SYSTEM, stuckPrompt);
    logger.warn(`[${this.name}] Agent detected stuck state. Added stuck prompt.`);
  }
}