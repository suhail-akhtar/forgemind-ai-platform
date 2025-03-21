// src/types/agent.ts
export enum AgentState {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    FINISHED = 'FINISHED',
  }
  
  export enum RoleType {
    SYSTEM = 'system',
    USER = 'user',
    ASSISTANT = 'assistant',
    TOOL = 'tool',
  }
  
  export interface Message {
    role: RoleType;
    content?: string;
    toolCalls?: ToolCall[];
    name?: string;
    toolCallId?: string;
    id?: string;
  }
  
  export interface ToolCall {
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }
  
  export enum ToolChoice {
    AUTO = 'auto',
    REQUIRED = 'required',
    NONE = 'none',
  }
  
  export interface LLMResponse {
    content: string;
    toolCalls?: ToolCall[];
  }