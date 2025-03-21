// server/src/tools/BrowserTool.ts
import { BaseToolImpl } from './BaseTool';
import { ToolResult } from '../types/tools';
import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger';

export class BrowserTool extends BaseToolImpl {
  name = 'browser';
  description = 'Automate web browser actions like navigation, clicking, and extracting content';
  parameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['navigate', 'click', 'input_text', 'screenshot', 'get_html', 'extract_text', 'execute_js'],
        description: 'The browser action to perform',
      },
      url: {
        type: 'string',
        description: 'URL for navigation',
      },
      selector: {
        type: 'string',
        description: 'CSS selector for elements to interact with',
      },
      text: {
        type: 'string',
        description: 'Text to input in form fields',
      },
      javascript: {
        type: 'string',
        description: 'JavaScript code to execute in browser context',
      },
    },
    required: ['action'],
  };

  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.page = await this.browser.newPage();
      logger.info(`Browser initialized`);
    }
  }

  async executeInternal(params: any): Promise<ToolResult> {
    await this.initialize();
    
    try {
      switch (params.action) {
        case 'navigate':
          if (!params.url) {
            return { error: 'URL is required for navigate action' };
          }
          await this.page!.goto(params.url, { waitUntil: 'domcontentloaded' });
          const title = await this.page!.title();
          const url = this.page!.url();
          return { output: `Navigated to ${url} - Page title: ${title}` };
          
        case 'click':
          if (!params.selector) {
            return { error: 'Selector is required for click action' };
          }
          await this.page!.click(params.selector);
          return { output: `Clicked element: ${params.selector}` };
          
        case 'input_text':
          if (!params.selector || !params.text) {
            return { error: 'Selector and text are required for input_text action' };
          }
          await this.page!.fill(params.selector, params.text);
          return { output: `Entered text into ${params.selector}` };
          
        case 'screenshot':
          const screenshotBuffer = await this.page!.screenshot();
          const base64Screenshot = screenshotBuffer.toString('base64');
          // In a real implementation, you might save this to disk or a database
          return { output: `Screenshot taken (Base64, first 50 chars): ${base64Screenshot.substring(0, 50)}...` };
          
        case 'get_html':
          const html = await this.page!.content();
          // Truncate HTML for readability
          const truncatedHtml = html.length > 2000 ? 
            `${html.substring(0, 2000)}... (truncated, total length: ${html.length})` : 
            html;
          return { output: truncatedHtml };
          
        case 'extract_text':
          if (!params.selector) {
            const bodyText = await this.page!.innerText('body');
            const truncatedText = bodyText.length > 2000 ? 
              `${bodyText.substring(0, 2000)}... (truncated, total length: ${bodyText.length})` : 
              bodyText;
            return { output: truncatedText };
          } else {
            const elements = await this.page!.$$(params.selector);
            let texts: string[] = [];
            for (const element of elements) {
              const text = await element.innerText();
              texts.push(text);
            }
            return { output: texts.join('\n') };
          }
          
        case 'execute_js':
          if (!params.javascript) {
            return { error: 'JavaScript code is required for execute_js action' };
          }
          const result = await this.page!.evaluate(params.javascript);
          return { 
            output: typeof result === 'object' ? 
              JSON.stringify(result, null, 2) : 
              String(result) 
          };
          
        default:
          return { error: `Unknown action: ${params.action}` };
      }
    } catch (error: any) {
      logger.error(`Browser action failed: ${error.message}`);
      return { error: `Browser action failed: ${error.message}` };
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info(`Browser closed`);
    }
  }
}