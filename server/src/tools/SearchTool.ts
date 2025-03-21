// server/src/tools/SearchTool.ts
import { BaseToolImpl } from './BaseTool';
import { ToolResult } from '../types/tools';
import axios from 'axios';
import { logger } from '../utils/logger';

export class SearchTool extends BaseToolImpl {
  name = 'search';
  description = 'Search the web for information';
  parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      num_results: {
        type: 'number',
        description: 'Number of search results to return',
        default: 5,
      },
    },
    required: ['query'],
  };

  private apiKey: string;
  private searchEngineId: string;

  constructor(apiKey: string, searchEngineId: string) {
    super();
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
  }

  async executeInternal(params: any): Promise<ToolResult> {
    const query = params.query;
    const numResults = params.num_results || 5;
    
    if (!query) {
      return { error: 'Search query is required' };
    }
    
    try {
      // Use Google Custom Search API
      const response = await axios.get<{ items: any[] }>('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          num: numResults,
        },
      });
      
      const data = response.data as { items: any[] };
      if (!data.items || data.items.length === 0) {
        return { output: 'No results found for the query.' };
      }
      
      // Format the search results
      const results = response.data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
      
      return { output: results };
    } catch (error: any) {
      logger.error(`Search failed: ${error.message}`);
      
      if (error.response && error.response.status === 429) {
        return { error: 'Search API rate limit exceeded. Try again later.' };
      }
      
      return { error: `Search failed: ${error.message}` };
    }
  }
}