#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';

// Load environment variables
dotenv.config();

const program = new Command();
let token: string | null = null;
let baseUrl = process.env.API_URL || 'http://localhost:3000/api';

// Define response types
interface LoginResponse {
  token: string;
  expiresAt: string;
  user: {
    id: number;
    email: string;
    name: string;
    llmProvider: string;
  };
}

interface ConversationResponse {
  conversation: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface ConversationsResponse {
  conversations: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface MessagesResponse {
  messages: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

interface RunResponse {
  result: string;
  messages: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

interface ErrorResponse {
  error: string;
}

// Config object
const config = {
  apiUrl: baseUrl,
  email: process.env.MINDFORGE_EMAIL || 'abc@123.com',
  password: process.env.MINDFORGE_PASSWORD || 'abc123',
  llmProvider: process.env.LLM_PROVIDER || 'google_gemini',
  llmKey: process.env.LLM_KEY || ''
};

// API client with auth handling
const apiClient = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to save config
async function saveConfig(): Promise<void> {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    console.error('Could not determine home directory');
    return;
  }
  
  const configDir = path.join(homeDir, '.mindforge');
  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(
      path.join(configDir, 'config.json'),
      JSON.stringify({
        apiUrl: baseUrl,
        email: config.email,
        llmProvider: config.llmProvider,
        token
      }, null, 2)
    );
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Helper to load config
async function loadConfig(): Promise<void> {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    console.error('Could not determine home directory');
    return;
  }
  
  const configDir = path.join(homeDir, '.mindforge');
  const configPath = path.join(configDir, 'config.json');
  
  try {
    const data = await fs.readFile(configPath, 'utf8');
    const savedConfig = JSON.parse(data) as {
      apiUrl?: string;
      email?: string;
      llmProvider?: string;
      token?: string;
    };
    
    if (savedConfig.apiUrl) baseUrl = savedConfig.apiUrl;
    if (savedConfig.email) config.email = savedConfig.email;
    if (savedConfig.llmProvider) config.llmProvider = savedConfig.llmProvider;
    if (savedConfig.token) token = savedConfig.token;
    
    apiClient.defaults.baseURL = baseUrl;
    
    // Validate token
    if (token) {
      try {
        await apiClient.get('/auth/profile');
      } catch (error) {
        console.log(chalk.yellow('⚠️  Session expired, please login again'));
        token = null;
      }
    }
  } catch (error) {
    // Config doesn't exist yet, that's fine
  }
}

// Login function
async function login(): Promise<boolean> {
  if (!config.email || !config.password) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        default: config.email,
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
      },
    ]);
    
    config.email = answers.email;
    config.password = answers.password;
  }
  
  const spinner = ora('Logging in...').start();
  
  try {
    const response = await axios.post<LoginResponse>(`${baseUrl}/auth/login`, {
      email: config.email,
      password: config.password,
    });
    
    token = response.data.token;
    await saveConfig();
    spinner.succeed(`Logged in as ${config.email}`);
    return true;
  } catch (error: any) {
    spinner.fail('Login failed');
    console.error(error.response?.data?.error || error.message);
    return false;
  }
}

// Ensure user is authenticated
async function ensureAuth(): Promise<boolean> {
  if (!token) {
    return await login();
  }
  return true;
}

// Command: Configure
program
  .command('config')
  .description('Configure the CLI')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: baseUrl,
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        default: config.email,
      },
      {
        type: 'list',
        name: 'llmProvider',
        message: 'LLM Provider:',
        choices: ['openai', 'azure_openai', 'google_gemini'],
        default: config.llmProvider,
      },
      {
        type: 'input',
        name: 'llmKey',
        message: 'LLM Key:',
        default: config.llmKey,
      },
    ]);
    
    baseUrl = answers.apiUrl;
    config.email = answers.email;
    config.llmProvider = answers.llmProvider;
    apiClient.defaults.baseURL = baseUrl;
    
    await saveConfig();
    console.log(chalk.green('✓ Configuration saved'));
  });

  // Add this before your init() function in client.js
program
.command('set-token')
.description('Manually set an authentication token')
.action(async () => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'token',
      message: 'Enter token:',
    }
  ]);
  token = answers.token;
  await saveConfig();
  console.log(chalk.green('Token saved successfully'));
});

// Command: Login
program
  .command('login')
  .description('Login to MindForge')
  .action(async () => {
    await login();
  });

  // Command: Set API key
program
.command('set-api-key')
.description('Set API key for the selected LLM provider')
.action(async () => {
  if (!await ensureAuth()) return;
  
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: `Enter API key for ${config.llmProvider}:`,
    }
  ]);
  
  const spinner = ora('Setting API key...').start();
  
  try {
    await apiClient.put('/auth/profile', {
      apiKey: answers.apiKey,
      llmProvider: config.llmProvider
    });
    
    spinner.succeed('API key set successfully');
  } catch (error :any) {
    spinner.fail('Failed to set API key');
    console.error(error.response?.data?.error || error.message);
  }
});

// Command: List conversations
program
  .command('conversations')
  .alias('ls')
  .description('List conversations')
  .action(async () => {
    if (!await ensureAuth()) return;
    
    const spinner = ora('Loading conversations...').start();
    
    try {
      const response = await apiClient.get<ConversationsResponse>('/conversations');
      spinner.stop();
      
      if (response.data.conversations.length === 0) {
        console.log(chalk.yellow('No conversations found'));
        return;
      }
      
      console.log(chalk.bold('\nConversations:'));
      response.data.conversations.forEach((conv) => {
        console.log(`${chalk.green(conv.id)} - ${conv.title} [${new Date(conv.createdAt).toLocaleString()}]`);
      });
    } catch (error: any) {
      spinner.fail('Failed to load conversations');
      console.error(error.response?.data?.error || error.message);
    }
  });

// Command: Create a new conversation
program
  .command('new [title]')
  .description('Create a new conversation')
  .action(async (title) => {
    if (!await ensureAuth()) return;
    
    if (!title) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Conversation title:',
          default: `Conversation ${new Date().toLocaleDateString()}`,
        },
      ]);
      title = answers.title;
    }
    
    const spinner = ora('Creating conversation...').start();
    
    try {
      const response = await apiClient.post<ConversationResponse>('/conversations', { title });
      spinner.succeed(`Conversation created: ${title}`);
      console.log(`ID: ${chalk.green(response.data.conversation.id)}`);
    } catch (error: any) {
      spinner.fail('Failed to create conversation');
      console.error(error.response?.data?.error || error.message);
    }
  });

// Command: Chat in a conversation
program
  .command('chat [conversationId]')
  .description('Chat in a conversation')
  .action(async (conversationId) => {
    if (!await ensureAuth()) return;
    
    if (!conversationId) {
      try {
        const response = await apiClient.get<ConversationsResponse>('/conversations');
        
        if (response.data.conversations.length === 0) {
          console.log(chalk.yellow('No conversations found. Create one first.'));
          return;
        }
        
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'conversationId',
            message: 'Select a conversation:',
            choices: response.data.conversations.map((conv) => ({
              name: `${conv.title} [${new Date(conv.createdAt).toLocaleString()}]`,
              value: conv.id,
            })),
          },
        ]);
        
        conversationId = answers.conversationId;
      } catch (error: any) {
        console.error('Failed to list conversations:', error.response?.data?.error || error.message);
        return;
      }
    }
    
    console.log(chalk.bold(`\nChat session started. Type "${chalk.cyan('/exit')}" to leave.`));
    
    // Load existing messages
    try {
      const messagesResponse = await apiClient.get<MessagesResponse>(`/conversations/${conversationId}/messages`);
      const messages = messagesResponse.data.messages;
      
      if (messages.length > 0) {
        console.log(chalk.dim('\n--- Previous messages ---'));
        messages.forEach((msg) => {
          if (msg.role === 'user') {
            console.log(chalk.blue(`You: ${msg.content}`));
          } else if (msg.role === 'assistant') {
            console.log(chalk.green(`AI: ${msg.content}`));
          }
        });
        console.log(chalk.dim('--- End of history ---\n'));
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error.response?.data?.error || error.message);
    }
    
    // Start chat loop
    let chatActive = true;
    while (chatActive) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'You:',
        },
      ]);
      
      if (message.toLowerCase() === '/exit') {
        chatActive = false;
        continue;
      }
      
      const spinner = ora('MindForge is thinking...').start();
      
      try {
        // Use settings with Google Gemini
        await apiClient.put('/auth/profile', {
          llmProvider: config.llmProvider,
        });
        
        // Send message to run agent
        const response = await apiClient.post<RunResponse>(`/conversations/${conversationId}/run`, { message });
        
        spinner.stop();
        
        // Display the response
        console.log(chalk.green('AI:'), response.data.result);
      } catch (error: any) {
        spinner.fail('Error getting response');
        console.error(error.response?.data?.error || error.message);
      }
    }
  });

  // Add this command to your CLI
program
.command('register')
.description('Register a new user')
.action(async () => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
    },
    {
      type: 'input',
      name: 'name',
      message: 'Name:',
    }
  ]);
  
  const spinner = ora('Registering user...').start();
  
  try {
    const response = await axios.post<LoginResponse>(`${baseUrl}/auth/register`, {
      email: answers.email,
      password: answers.password,
      name: answers.name
    });
    
    token = response.data.token;
    await saveConfig();
    spinner.succeed(`Registered and logged in as ${answers.email}`);
  } catch (error: any) {
    spinner.fail('Registration failed');
    console.error(error.response?.data?.error || error.message);
  }
});

// Command: Execute a single command
program
  .command('run [conversationId] [message]')
  .description('Run a single agent command')
  .action(async (conversationId, message) => {
    if (!await ensureAuth()) return;
    
    if (!conversationId) {
      try {
        // Create a new conversation
        const createResponse = await apiClient.post<ConversationResponse>('/conversations', { 
          title: `CLI Run ${new Date().toLocaleDateString()}`
        });
        conversationId = createResponse.data.conversation.id;
        console.log(`Created conversation: ${chalk.green(conversationId)}`);
      } catch (error: any) {
        console.error('Failed to create conversation:', error.response?.data?.error || error.message);
        return;
      }
    }
    
    if (!message) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Enter your command:',
        },
      ]);
      message = answers.message;
    }
    
    const spinner = ora('Running MindForge agent...').start();
    
    try {
      // Set provider to Google Gemini
      await apiClient.put('/auth/profile', {
        llmProvider: config.llmProvider,
      });
      
      // Run the agent
      const response = await apiClient.post<RunResponse>(`/conversations/${conversationId}/run`, { message });
      
      spinner.succeed('Agent execution complete');
      
      console.log(chalk.green('\nResult:'));
      console.log(response.data.result);
    } catch (error: any) {
      spinner.fail('Failed to run agent');
      console.error(error.response?.data?.error || error.message);
    }
  });

// Initialize and run
async function init() {
  await loadConfig();
  
  program
    .name('mindforge')
    .description('MindForge CLI - interact with the MindForge AI Agent Framework')
    .version('1.0.0');
  
  program.parse(process.argv);
  
  // If no args, show help
  if (process.argv.length <= 2) {
    program.help();
  }
}

init().catch(console.error);