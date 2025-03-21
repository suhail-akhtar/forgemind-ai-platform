// src/services/Memory.ts
import { Message, RoleType } from '../types/agent';

export class Memory {
  messages: Message[] = [];
  maxMessages: number;
  
  constructor(maxMessages: number = 100) {
    this.maxMessages = maxMessages;
  }
  
  addMessage(message: Message): void {
    this.messages.push(message);
    
    // Trim if exceeding max messages
    if (this.messages.length > this.maxMessages) {
      // Keep system messages
      const systemMessages = this.messages.filter(
        msg => msg.role === RoleType.SYSTEM
      );
      
      // Keep latest messages (excluding system)
      const otherMessages = this.messages
        .filter(msg => msg.role !== RoleType.SYSTEM)
        .slice(-(this.maxMessages - systemMessages.length));
      
      this.messages = [...systemMessages, ...otherMessages];
    }
  }
  
  addMessages(messages: Message[]): void {
    messages.forEach(msg => this.addMessage(msg));
  }
  
  clear(): void {
    this.messages = [];
  }
  
  getRecentMessages(n: number): Message[] {
    return this.messages.slice(-n);
  }
}