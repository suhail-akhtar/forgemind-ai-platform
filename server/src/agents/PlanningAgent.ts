// server/src/agents/PlanningAgent.ts
import { ToolCallAgent } from './ToolCallAgent';
import { Memory } from '../services/Memory';
import { OpenAIService } from '../llm/OpenAIService';
import { ToolCollection } from '../services/ToolCollection';
import { AgentState, RoleType, ToolChoice } from '../types/agent';
import { logger } from '../utils/logger';

export interface PlanStep {
  id: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  currentStepIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PlanningAgent extends ToolCallAgent {
  plan: Plan | null = null;
  planRequired: boolean = true;
  
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
      planRequired?: boolean;
    }
  ) {
    super(name, memory, llm, tools, config);
    
    if (config?.planRequired !== undefined) {
      this.planRequired = config.planRequired;
    }
    
    // Default system prompt for PlanningAgent if not provided
    if (!this.systemPrompt) {
      this.systemPrompt = `You are a problem-solving agent that creates and follows plans. Your process:
1. Understand the task and create a detailed step-by-step plan
2. Execute each step in the plan systematically
3. Update the plan as needed based on new information
4. Use available tools to complete each step

Available tools: ${tools.getToolDescriptions()}

Use the terminate tool when you've completed all steps in your plan.`;
    }
  }
  
  async initialize(): Promise<void> {
    await super.initialize();
    
    // Reset plan
    this.plan = null;
  }
  
  async createInitialPlan(request: string): Promise<Plan> {
    // Create plan prompt
    const planPrompt = `Create a detailed step-by-step plan to accomplish this task: "${request}"

Your plan should:
1. Break down the task into logical steps
2. Be specific about what tools to use for each step
3. Include any necessary information gathering steps
4. End with a verification step to ensure the task is complete

Respond with a JSON object in this format:
{
  "title": "Short descriptive title for the plan",
  "description": "Brief overview of what the plan will accomplish",
  "steps": [
    {
      "id": 1,
      "description": "First step description",
      "status": "pending"
    },
    ...more steps...
  ]
}`;

    try {
      // Get plan from LLM
      this.updateMemory(RoleType.SYSTEM, planPrompt);
      const planResponse = await this.llm.ask(this.memory.messages);
      
      // Extract JSON from response
      const jsonMatch = planResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        planResponse.match(/```\n([\s\S]*?)\n```/) ||
                        planResponse.match(/{[\s\S]*?}/);
      
      let planJson: any;
      
      if (jsonMatch) {
        planJson = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
      } else {
        // Fallback: try to parse the entire response
        planJson = JSON.parse(planResponse);
      }
      
      // Create plan object
      const plan: Plan = {
        id: Date.now().toString(),
        title: planJson.title || 'Untitled Plan',
        description: planJson.description || '',
        steps: planJson.steps.map((step: any) => ({
          id: step.id,
          description: step.description,
          status: 'pending',
        })),
        currentStepIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      logger.info(`[${this.name}] Created plan: ${plan.title} with ${plan.steps.length} steps`);
      
      // Add plan to memory
      const planSummary = `Generated plan: ${plan.title}
${plan.description}

Steps:
${plan.steps.map(step => `${step.id}. ${step.description}`).join('\n')}`;
      
      this.updateMemory(RoleType.ASSISTANT, planSummary);
      
      return plan;
    } catch (error: any) {
      logger.error(`[${this.name}] Error creating plan: ${error.message}`);
      
      // Create fallback plan
      const fallbackPlan: Plan = {
        id: Date.now().toString(),
        title: 'Fallback Plan',
        description: `Fallback plan for request: ${request}`,
        steps: [
          {
            id: 1,
            description: 'Analyze the request',
            status: 'pending',
          },
          {
            id: 2,
            description: 'Execute the task directly',
            status: 'pending',
          },
          {
            id: 3,
            description: 'Verify the result',
            status: 'pending',
          },
        ],
        currentStepIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.updateMemory(RoleType.SYSTEM, `Error creating detailed plan: ${error.message}. Using fallback plan instead.`);
      
      return fallbackPlan;
    }
  }
  
  getCurrentStep(): PlanStep | null {
    if (!this.plan || this.plan.steps.length === 0) {
      return null;
    }
    
    return this.plan.steps[this.plan.currentStepIndex];
  }
  
  updatePlanStatus(stepResult: string): void {
    if (!this.plan) return;
    
    const currentStep = this.getCurrentStep();
    if (!currentStep) return;
    
    // Mark current step as completed
    currentStep.status = 'completed';
    currentStep.result = stepResult;
    
    // Move to next step if not at the end
    if (this.plan.currentStepIndex < this.plan.steps.length - 1) {
      this.plan.currentStepIndex++;
      // Mark next step as in progress
      this.plan.steps[this.plan.currentStepIndex].status = 'in_progress';
    } else {
      // All steps completed
      logger.info(`[${this.name}] All steps in plan completed`);
    }
    
    this.plan.updatedAt = new Date();
    
    // Log current plan status
    const completedSteps = this.plan.steps.filter(step => step.status === 'completed').length;
    logger.info(`[${this.name}] Plan progress: ${completedSteps}/${this.plan.steps.length} steps completed`);
  }
  
  formatCurrentPlanStatus(): string {
    if (!this.plan) return 'No active plan';
    
    const currentStep = this.getCurrentStep();
    if (!currentStep) return 'Plan has no steps';
    
    const stepStatuses = this.plan.steps.map(step => {
      const statusMarker = step.id === currentStep.id ? '→' : 
        step.status === 'completed' ? '✓' : 
        step.status === 'failed' ? '✗' : ' ';
      
      return `${statusMarker} ${step.id}. ${step.description} [${step.status}]`;
    }).join('\n');
    
    return `Current Plan: ${this.plan.title}
Progress: ${this.plan.currentStepIndex + 1}/${this.plan.steps.length}

${stepStatuses}`;
  }
  
  async run(request?: string): Promise<string> {
    // Initialize if needed
    if (this.state === AgentState.IDLE) {
      await this.initialize();
    }
    
    // Add user request if provided
    if (request) {
      this.updateMemory(RoleType.USER, request);
      
      // Create initial plan if required
      if (this.planRequired && !this.plan) {
        this.plan = await this.createInitialPlan(request);
      }
    }
    
    const results: string[] = [];
    this.state = AgentState.RUNNING;
    
    try {
      while (this.currentStep < this.maxSteps && this.state !== (AgentState.FINISHED as AgentState)) {
        this.currentStep++;
        logger.info(`[${this.name}] Executing step ${this.currentStep}/${this.maxSteps}`);
        
        // Add current plan status to context if we have a plan
        if (this.plan) {
          const currentStepInfo = `Current plan status:
${this.formatCurrentPlanStatus()}

Focus on completing the current step: ${this.getCurrentStep()?.description}`;
          
          this.nextStepPrompt = currentStepInfo;
        }
        
        // Execute step
        const stepResult = await this.step();
        results.push(stepResult);
        
        // Update plan status
        if (this.plan) {
          this.updatePlanStatus(stepResult);
          
          // Check if all steps are completed
          const allCompleted = this.plan.steps.every(step => step.status === 'completed');
          if (allCompleted && this.state !== AgentState.FINISHED as AgentState) {
            logger.info(`[${this.name}] All steps completed, but terminate wasn't called. Adding reminder.`);
            this.updateMemory(RoleType.SYSTEM, "All plan steps are now completed. Use the terminate tool to finish the task.");
          }
        }
      }
      
      if (this.currentStep >= this.maxSteps) {
        this.state = AgentState.FINISHED;
        results.push(`Terminated: Reached max steps (${this.maxSteps})`);
      }
      
      const finalResult = results.join('\n');
      
      // Add completion message
      if (this.plan) {
        this.updateMemory(RoleType.SYSTEM, `Plan execution completed. Final status:
${this.formatCurrentPlanStatus()}`);
      }
      
      return finalResult;
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
}