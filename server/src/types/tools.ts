// src/types/tools.ts
export interface ToolResult {
    output?: any;
    error?: string;
    system?: string;
  }
  
  export interface BaseTool {
    name: string;
    description: string;
    parameters: object;
    
    execute(params: any): Promise<string>;
    toParam(): object;
  }