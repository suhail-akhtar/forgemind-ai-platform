// server/src/tools/CodeExecutionTool.ts
import { BaseToolImpl } from './BaseTool';
import { ToolResult } from '../types/tools';
import { VM, VMScript } from 'vm2';
import { logger } from '../utils/logger';

export class CodeExecutionTool extends BaseToolImpl {
  name = 'execute_code';
  description = 'Execute JavaScript/Node.js code in a sandboxed environment';
  parameters = {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'JavaScript code to execute',
      },
      timeout: {
        type: 'number',
        description: 'Execution timeout in milliseconds',
        default: 5000,
      },
      allowRequire: {
        type: 'boolean',
        description: 'Whether to allow importing modules via require',
        default: false,
      },
    },
    required: ['code'],
  };

  // List of allowed modules that can be imported if allowRequire is true
  private allowedModules: string[] = [
    'lodash', 'moment', 'axios', 'mathjs',
    'crypto', 'fs', 'path', 'util', 'querystring',
  ];

  async executeInternal(params: any): Promise<ToolResult> {
    const code = params.code;
    const timeout = params.timeout || 5000;
    const allowRequire = params.allowRequire || false;
    
    if (!code) {
      return { error: 'Code is required' };
    }
    
    // Capture console outputs
    let logs: string[] = [];
    let errors: string[] = [];
    
    const console = {
      log: (...args: any[]) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      },
      error: (...args: any[]) => {
        errors.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push(`[WARN] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`);
      },
      info: (...args: any[]) => {
        logs.push(`[INFO] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`);
      },
    };
    
    try {
      const vm = new VM({
        timeout,
        sandbox: { console },
        eval: false,
        wasm: false,
      });
      
      // Add allowed modules to the sandbox if requested
      if (allowRequire) {
        vm.freeze(require, 'require');
        
        // Only allow specific modules to be imported
        const originalRequire = require;
        const sandboxRequire = (moduleName: string) => {
          if (!this.allowedModules.includes(moduleName)) {
            throw new Error(`Module '${moduleName}' is not allowed to be imported`);
          }
          return originalRequire(moduleName);
        };
        
        vm.sandbox.require = sandboxRequire;
      }
      
      // Execute the code
      const script = new VMScript(code);
      const result = vm.run(script);
      
      // Format the result
      const formattedResult = typeof result === 'object' ? 
        JSON.stringify(result, null, 2) : 
        result !== undefined ? String(result) : 'undefined';
      
      return {
        output: {
          result: formattedResult,
          logs: logs,
          errors: errors,
        }
      };
    } catch (error: any) {
      logger.error(`Code execution failed: ${error.message}`);
      return {
        error: `Code execution failed: ${error.message}`,
        output: {
          logs: logs,
          errors: [...errors, error.message],
        }
      };
    }
  }
}