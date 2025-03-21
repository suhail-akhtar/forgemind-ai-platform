// src/tools/BaseTool.ts
import { BaseTool, ToolResult } from '../types/tools';

export abstract class BaseToolImpl implements BaseTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: object;
  
  async execute(params: any): Promise<string> {
    try {
      const result = await this.executeInternal(params);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }
  
  abstract executeInternal(params: any): Promise<ToolResult>;
  
  toParam(): object {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }
}