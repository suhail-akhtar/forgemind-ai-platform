// server/src/tools/TerminateTool.ts
import { BaseToolImpl } from './BaseTool';
import { ToolResult } from '../types/tools';

export class TerminateTool extends BaseToolImpl {
  name = 'terminate';
  description = 'Terminates the agent execution when the task is complete';
  parameters = {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Reason for termination',
      },
    },
    required: ['reason'],
  };
  
  async executeInternal(params: any): Promise<ToolResult> {
    return {
      output: `Task completed: ${params.reason}`,
      system: 'TERMINATE',
    };
  }
}