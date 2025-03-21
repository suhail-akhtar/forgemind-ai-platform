// server/src/tools/FileSystemTool.ts
import { BaseToolImpl } from './BaseTool';
import { ToolResult } from '../types/tools';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export class FileSystemTool extends BaseToolImpl {
  name = 'filesystem';
  description = 'Perform file system operations like reading, writing, and listing files';
  parameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'write', 'append', 'delete', 'list', 'exists'],
        description: 'The file system action to perform',
      },
      path: {
        type: 'string',
        description: 'Path to the file or directory',
      },
      content: {
        type: 'string',
        description: 'Content to write to a file',
      },
      encoding: {
        type: 'string',
        enum: ['utf8', 'base64', 'binary'],
        default: 'utf8',
        description: 'Encoding to use when reading or writing files',
      },
    },
    required: ['action', 'path'],
  };

  private basePath: string;

  constructor(basePath: string = './data') {
    super();
    this.basePath = basePath;
    // Create base directory if it doesn't exist
    this.ensureBaseDir();
  }

  private async ensureBaseDir(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create base directory: ${error}`);
    }
  }

  private resolvePath(filePath: string): string {
    // Prevent path traversal attacks by ensuring the path is within the base directory
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(this.basePath, normalizedPath);
    
    // Check if the resolved path is within the base directory
    if (!resolvedPath.startsWith(path.resolve(this.basePath))) {
      throw new Error('Path traversal attempt detected');
    }
    
    return resolvedPath;
  }

  async executeInternal(params: any): Promise<ToolResult> {
    try {
      const action = params.action;
      const filePath = params.path;
      
      if (!action || !filePath) {
        return { error: 'Action and path are required' };
      }
      
      const resolvedPath = this.resolvePath(filePath);
      
      switch (action) {
        case 'read':
          const encoding = params.encoding || 'utf8';
          const content = await fs.readFile(resolvedPath, { encoding: encoding as BufferEncoding });
          return { output: content };
          
        case 'write':
          if (!params.content) {
            return { error: 'Content is required for write action' };
          }
          
          // Ensure the directory exists
          await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
          
          // Write the file
          await fs.writeFile(resolvedPath, params.content, { encoding: params.encoding || 'utf8' });
          return { output: `File written successfully: ${filePath}` };
          
        case 'append':
          if (!params.content) {
            return { error: 'Content is required for append action' };
          }
          
          // Ensure the directory exists
          await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
          
          // Append to the file
          await fs.appendFile(resolvedPath, params.content, { encoding: params.encoding || 'utf8' });
          return { output: `Content appended to file: ${filePath}` };
          
        case 'delete':
          await fs.unlink(resolvedPath);
          return { output: `File deleted: ${filePath}` };
          
        case 'list':
          const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
          const result = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
          }));
          return { output: result };
          
        case 'exists':
          try {
            await fs.access(resolvedPath);
            return { output: true };
          } catch {
            return { output: false };
          }
          
        default:
          return { error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      logger.error(`File system operation failed: ${error.message}`);
      return { error: `File system operation failed: ${error.message}` };
    }
  }
}