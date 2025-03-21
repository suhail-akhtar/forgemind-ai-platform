// server/src/agents/ToolCallAgent.ts
import { ReActAgent } from './ReActAgent';
import { Memory } from '../services/Memory';
import { OpenAIService } from '../llm/OpenAIService';
import { AgentState, RoleType, ToolCall, ToolChoice } from '../types/agent';
import { ToolCollection } from '../services/ToolCollection';
import { logger } from '../utils/logger';

export class ToolCallAgent extends ReActAgent {
  toolCalls: ToolCall[] = [];
  availableTools: ToolCollection;
  toolChoice: ToolChoice = ToolChoice.AUTO;
  specialToolNames: string[] = ['terminate'];
  
  constructor(
    name: string,
    memory: Memory,
    llm: OpenAIService,
    tools: ToolCollection,
    config?: {
      description?: string;
      systemPrompt?: string;
      nextStepPrompt?: string;
      maxSteps?: number;
      toolChoice?: ToolChoice;
    }
  ) {
    super(name, memory, llm, config);
    this.availableTools = tools;
    
    if (config?.toolChoice) {
      this.toolChoice = config.toolChoice;
    }
    
    // Default system prompt for ToolCallAgent if not provided
    if (!this.systemPrompt) {
      this.systemPrompt = `You are a problem-solving agent with access to tools. For each step:
1. Think about the current state of the problem
2. Decide which tool(s) to use
3. Call the appropriate tool with the required parameters
4. Observe the results and plan your next step

Available tools: ${tools.getToolDescriptions()}

Use the terminate tool when you've completed the task.`;
    }
  }
  
  async think(): Promise<string> {
    try {
      // Add next step prompt if available
      if (this.nextStepPrompt) {
        this.updateMemory(RoleType.SYSTEM, this.nextStepPrompt);
        this.nextStepPrompt = undefined; // Clear for next iteration
      }
      
      // Get response with tool options
      const response = await this.llm.askWithTools(
        this.memory.messages,
        this.systemPrompt ? [{ role: RoleType.SYSTEM, content: this.systemPrompt }] : undefined,
        this.availableTools.toParams(),
        this.toolChoice
      );
      
      this.toolCalls = response.toolCalls || [];
      
      logger.info(`[${this.name}] Thinking: ${response.content.substring(0, 100)}...`);
      logger.info(`[${this.name}] Selected ${this.toolCalls.length} tools to use`);
      
      // Add assistant's response to memory
      this.memory.addMessage({
        role: RoleType.ASSISTANT,
        content: response.content,
        toolCalls: this.toolCalls.length > 0 ? this.toolCalls : undefined
      });
      
      return this.toolCalls.length > 0 ? "true" : "false";
    } catch (error: any) {
      logger.error(`[${this.name}] Error in think phase: ${error.message}`);
      this.updateMemory(RoleType.ASSISTANT, `Error encountered while processing: ${error.message}`);
      return "false";
    }
  }
  
  async act(): Promise<string> {
    if (this.toolCalls.length === 0) {
      return "No tools to execute";
    }
    
    const results: string[] = [];
    
    for (const command of this.toolCalls) {
      try {
        // Execute the tool
        const result = await this.executeTool(command);
        
        // Add tool response to memory
        this.memory.addMessage({
          role: RoleType.TOOL,
          content: result,
          name: command.function.name,
          toolCallId: command.id
        });
        
        results.push(`[${command.function.name}]: ${result}`);
        
        // Handle special tools like terminate
        if (this.isSpecialTool(command.function.name)) {
          await this.handleSpecialTool(command.function.name, result);
        }
      } catch (error: any) {
        logger.error(`[${this.name}] Error executing tool ${command.function.name}: ${error.message}`);
        const errorMessage = `Error executing ${command.function.name}: ${error.message}`;
        
        // Add error to memory
        this.memory.addMessage({
          role: RoleType.TOOL,
          content: errorMessage,
          name: command.function.name,
          toolCallId: command.id
        });
        
        results.push(errorMessage);
      }
    }
    
    return results.join('\n');
  }
  
  async executeTool(command: ToolCall): Promise<string> {
    const name = command.function.name;
    const args = JSON.parse(command.function.arguments || '{}');
    
    logger.info(`[${this.name}] Executing tool: ${name} with args: ${JSON.stringify(args)}`);
    return await this.availableTools.execute(name, args);
  }
  
  isSpecialTool(name: string): boolean {
    return this.specialToolNames.includes(name.toLowerCase());
  }
  
  async handleSpecialTool(name: string, result: string): Promise<void> {
    if (name.toLowerCase() === 'terminate') {
      logger.info(`[${this.name}] Terminate tool called. Setting state to FINISHED.`);
      this.state = AgentState.FINISHED;
    }
  }
  
  async step(): Promise<string> {
    try {
      // Check if stuck before proceeding
      if (this.isStuck()) {
        this.handleStuckState();
      }
      
      // Think phase - returns true if there are tools to execute
      const shouldAct = await this.think();
      
      // Act phase - execute tools if necessary
      if (shouldAct) {
        return await this.act();
      } else {
        return "Thinking complete - no action needed";
      }
    } catch (error: any) {
      logger.error(`[${this.name}] Step failed: ${error.message}`);
      return `Error in step execution: ${error.message}`;
    }
  }
}