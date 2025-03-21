// server/src/services/ToolFactory.ts
import { BaseTool } from '../types/tools';
import { ToolCollection } from './ToolCollection';
import { BrowserTool } from '../tools/BrowserTool';
import { FileSystemTool } from '../tools/FileSystemTool';
import { CodeExecutionTool } from '../tools/CodeExecutionTool';
import { SearchTool } from '../tools/SearchTool';
import { TerminateTool } from '../tools/TerminateTool';
import { logger } from '../utils/logger';

export class ToolFactory {
  static createDefaultTools(config: {
    basePath?: string;
    searchApiKey?: string;
    searchEngineId?: string;
  } = {}): ToolCollection {
    const tools: BaseTool[] = [
      new TerminateTool(),
      new BrowserTool(),
      new FileSystemTool(config.basePath || './data'),
      new CodeExecutionTool(),
    ];
    
    // Only add search tool if API key and engine ID are provided
    if (config.searchApiKey && config.searchEngineId) {
      tools.push(new SearchTool(config.searchApiKey, config.searchEngineId));
    } else {
      logger.warn('Search tool not registered: Missing API key or search engine ID');
    }
    
    return new ToolCollection(tools);
  }
  
  static createBrowserTool(): BrowserTool {
    return new BrowserTool();
  }
  
  static createFileSystemTool(basePath: string = './data'): FileSystemTool {
    return new FileSystemTool(basePath);
  }
  
  static createCodeExecutionTool(): CodeExecutionTool {
    return new CodeExecutionTool();
  }
  
  static createSearchTool(apiKey: string, searchEngineId: string): SearchTool {
    return new SearchTool(apiKey, searchEngineId);
  }
  
  static createTerminateTool(): TerminateTool {
    return new TerminateTool();
  }
}