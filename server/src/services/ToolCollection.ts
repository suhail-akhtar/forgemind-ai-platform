// server/src/services/ToolCollection.ts
import { BaseTool } from '../types/tools';
import { logger } from '../utils/logger';

export class ToolCollection {
  private tools: Map<string, BaseTool> = new Map();
  
  constructor(initialTools: BaseTool[] = []) {
    initialTools.forEach(tool => this.addTool(tool));
  }
  
  addTool(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool with name ${tool.name} already exists. Overwriting.`);
    }
    
    this.tools.set(tool.name, tool);
    logger.info(`Added tool: ${tool.name}`);
  }
  
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }
  
  async execute(name: string, params: any): Promise<string> {
    const tool = this.getTool(name);
    
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    
    try {
      return await tool.execute(params);
    } catch (error: any) {
      logger.error(`Error executing tool ${name}: ${error.message}`);
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }
  
  toParams(): object[] {
    return Array.from(this.tools.values()).map(tool => tool.toParam());
  }
  
  getToolDescriptions(): string {
    return Array.from(this.tools.entries())
      .map(([name, tool]) => `- ${name}: ${tool.description}`)
      .join('\n');
  }
  
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }
}