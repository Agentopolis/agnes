import http from 'node:http';
import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import type { Agent, Message, AgentContext } from './types/agent';
import fs from 'node:fs/promises';
import path from 'node:path';

// Define error codes according to the JSON-RPC spec
export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TASK_NOT_FOUND: -32001,
  TASK_NOT_CANCELABLE: -32002,
  PUSH_NOTIFICATION_NOT_SUPPORTED: -32003,
  UNSUPPORTED_OPERATION: -32004
};

// Types for JSON-RPC handling
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// In-memory storage for tasks
// In a production system, this would be replaced with a database
interface TaskStorage {
  [taskId: string]: {
    id: string;
    agentId: string;
    sessionId?: string;
    status: {
      state: 'submitted' | 'working' | 'input-required' | 'completed' | 'canceled' | 'failed' | 'unknown';
      timestamp: string;
    };
    history: unknown[];
    artifacts?: unknown[];
  };
}

// A map to store loaded agents
interface AgentRegistry {
  [agentId: string]: Agent;
}

// Function to read the raw request body as a string
function getRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      resolve(body);
    });
    
    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}

// Server class to manage the A2A server
export class A2AServer {
  private server: Server;
  private agents: AgentRegistry = {};
  private tasks: TaskStorage = {};

  constructor() {
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || '/';
    const method = req.method?.toUpperCase() || 'GET';

    console.log(`${method} ${url}`);
    
    res.setHeader('Content-Type', 'application/json');
    
    try {
      if (method === 'POST' && url === '/rpc') {
        await this.handleRpcRequest(req, res);
      } else if (method === 'GET' && url.includes('/.well-known/agent.json')) {
        await this.handleAgentCard(req, res);
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Internal Server Error'
        }
      }));
    }
  }
  
  private async handleRpcRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let rpcRequest: JsonRpcRequest;
    
    try {
      const body = await getRawBody(req);
      rpcRequest = JSON.parse(body);
    } catch (err) {
      const response = this.createErrorResponse(null, ErrorCodes.PARSE_ERROR, 'Invalid JSON payload');
      res.statusCode = 400;
      res.end(JSON.stringify(response));
      return;
    }
    
    // Validate JSON-RPC structure
    if (rpcRequest.jsonrpc !== '2.0' || !rpcRequest.method) {
      const response = this.createErrorResponse(
        rpcRequest.id, 
        ErrorCodes.INVALID_REQUEST, 
        'Request payload validation error'
      );
      res.statusCode = 400;
      res.end(JSON.stringify(response));
      return;
    }
    
    // Extract agent ID from the request path or headers
    // For simplicity in testing, use the first available agent if none specified
    const headerAgentId = req.headers['x-agent-id'] as string;
    const agentId = headerAgentId || Object.keys(this.agents)[0];
    
    if (!agentId) {
      const response = this.createErrorResponse(
        rpcRequest.id, 
        ErrorCodes.METHOD_NOT_FOUND, 
        'No agents available'
      );
      res.statusCode = 404;
      res.end(JSON.stringify(response));
      return;
    }
    
    // Find the agent
    const agent = this.agents[agentId] || Object.values(this.agents)[0];
    if (!agent) {
      const response = this.createErrorResponse(
        rpcRequest.id, 
        ErrorCodes.METHOD_NOT_FOUND, 
        'Agent not found'
      );
      res.statusCode = 404;
      res.end(JSON.stringify(response));
      return;
    }
    
    console.log(`Handling RPC method ${rpcRequest.method} for agent ${agent.id}`);
    
    let response: JsonRpcResponse;
    
    // Handle the method based on A2A spec
    switch (rpcRequest.method) {
      case 'tasks/send':
        response = await this.handleTaskSend(rpcRequest.id, agent, rpcRequest.params);
        break;
      case 'tasks/get':
        response = await this.handleTaskGet(rpcRequest.id, rpcRequest.params);
        break;
      case 'tasks/cancel':
        response = await this.handleTaskCancel(rpcRequest.id, rpcRequest.params);
        break;
      default:
        response = this.createErrorResponse(
          rpcRequest.id, 
          ErrorCodes.METHOD_NOT_FOUND, 
          'Method not found'
        );
    }
    
    res.statusCode = 200;
    res.end(JSON.stringify(response));
  }
  
  private async handleAgentCard(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || '/';
    
    if (url === '/.well-known/agent.json') {
      // Return the first agent for now
      // Later we can define a default agent or root multi-agent card
      const defaultAgentId = Object.keys(this.agents)[0];
      if (!defaultAgentId) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'No agents found' }));
        return;
      }
      
      const agentCard = this.generateAgentCard(this.agents[defaultAgentId]);
      res.statusCode = 200;
      res.end(JSON.stringify(agentCard));
      return;
    } 
    
    // Handle /:agentId/.well-known/agent.json
    const match = url.match(/^\/([^\/]+)\/\.well-known\/agent\.json$/);
    if (match) {
      const agentId = match[1];
      
      // Find the agent by ID or by the 'agent://' prefix
      let agent = this.agents[agentId];
      if (!agent) {
        // Try to find by matching the last part of the agent:// URI
        const fullAgentId = `agent://${agentId}`;
        const foundAgent = Object.values(this.agents).find(a => a.id === fullAgentId);
        if (foundAgent) {
          agent = foundAgent;
        }
      }
      
      if (!agent) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Agent not found' }));
        return;
      }
      
      const agentCard = this.generateAgentCard(agent);
      res.statusCode = 200;
      res.end(JSON.stringify(agentCard));
      return;
    }
    
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
  
  private createErrorResponse(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
  }
  
  private async handleTaskSend(id: string | number | null, agent: Agent, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
    if (!params || !params.id || !params.message) {
      return this.createErrorResponse(id, ErrorCodes.INVALID_PARAMS, 'Missing required parameters');
    }
    
    const taskId = params.id as string;
    const message = params.message as Message;
    const sessionId = params.sessionId as string | undefined;
    
    try {
      // Create a task if it doesn't exist
      if (!this.tasks[taskId]) {
        this.tasks[taskId] = {
          id: taskId,
          agentId: agent.id,
          sessionId,
          status: {
            state: 'submitted',
            timestamp: new Date().toISOString()
          },
          history: []
        };
      }
      
      // Update task status to working
      this.tasks[taskId].status = {
        state: 'working',
        timestamp: new Date().toISOString()
      };
      
      // Add the message to history
      this.tasks[taskId].history.push(message);
      
      // Call the agent's send handler
      const context: AgentContext = {
        taskId,
        agentId: agent.id,
        sessionId,
        logger: console
      };
      
      const response = await agent.handlers.send(
        { message }, 
        context
      );
      
      // Update task based on response
      if ('message' in response) {
        // Success case
        this.tasks[taskId].status = {
          state: 'completed',
          timestamp: new Date().toISOString()
        };
        
        // Add response to history
        this.tasks[taskId].history.push(response.message);
        
        return {
          jsonrpc: '2.0',
          id,
          result: {
            id: taskId,
            status: this.tasks[taskId].status,
            artifacts: [
              {
                parts: [
                  {
                    type: 'text',
                    text: JSON.stringify(response.message)
                  }
                ]
              }
            ]
          }
        };
      }
      
      // Error case
      this.tasks[taskId].status = {
        state: 'failed',
        timestamp: new Date().toISOString()
      };
      
      return this.createErrorResponse(id, ErrorCodes.INTERNAL_ERROR, response.error);
    } catch (error) {
      // Handle errors
      console.error(`Error handling task ${taskId}:`, error);
      
      if (this.tasks[taskId]) {
        this.tasks[taskId].status = {
          state: 'failed',
          timestamp: new Date().toISOString()
        };
      }
      
      return this.createErrorResponse(
        id, 
        ErrorCodes.INTERNAL_ERROR, 
        `Internal error: ${(error as Error).message}`
      );
    }
  }
  
  private async handleTaskGet(id: string | number | null, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
    if (!params || !params.id) {
      return this.createErrorResponse(id, ErrorCodes.INVALID_PARAMS, 'Missing task ID');
    }
    
    const taskId = params.id as string;
    const task = this.tasks[taskId];
    
    if (!task) {
      return this.createErrorResponse(id, ErrorCodes.TASK_NOT_FOUND, 'Task not found');
    }
    
    return {
      jsonrpc: '2.0',
      id,
      result: task
    };
  }
  
  private async handleTaskCancel(id: string | number | null, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
    if (!params || !params.id) {
      return this.createErrorResponse(id, ErrorCodes.INVALID_PARAMS, 'Missing task ID');
    }
    
    const taskId = params.id as string;
    const task = this.tasks[taskId];
    
    if (!task) {
      return this.createErrorResponse(id, ErrorCodes.TASK_NOT_FOUND, 'Task not found');
    }
    
    // Check if task is in a cancelable state
    const cancelableStates = ['submitted', 'working'];
    if (!cancelableStates.includes(task.status.state)) {
      return this.createErrorResponse(id, ErrorCodes.TASK_NOT_CANCELABLE, 'Task cannot be canceled');
    }
    
    // Cancel the task
    task.status = {
      state: 'canceled',
      timestamp: new Date().toISOString()
    };
    
    return {
      jsonrpc: '2.0',
      id,
      result: task
    };
  }
  
  private generateAgentCard(agent: Agent) {
    // Generate an A2A compatible agent card
    return {
      name: agent.name,
      description: agent.description ?? null,
      url: agent.id, // Using agent.id as the URL
      version: agent.version ?? '1.0.0',
      provider: agent.provider ?? null,
      documentationUrl: agent.documentationUrl ?? null,
      capabilities: {
        streaming: agent.capabilities?.streaming ?? false,
        pushNotifications: agent.capabilities?.pushNotifications ?? false,
        stateTransitionHistory: agent.capabilities?.stateTransitionHistory ?? false
      },
      authentication: agent.authentication ? {
        schemes: agent.authentication.schemes,
        credentials: null
      } : null,
      defaultInputModes: agent.defaultInputModes ?? ['text'],
      defaultOutputModes: agent.defaultOutputModes ?? ['text'],
      skills: agent.skills ?? []
    };
  }
  
  // Load all agents from the agents directory
  public async loadAgents(): Promise<void> {
    const agentsDir = path.join(__dirname, 'agents');
    
    try {
      const agentFolders = await fs.readdir(agentsDir);
      
      for (const folder of agentFolders) {
        const agentPath = path.join(agentsDir, folder, 'index.ts');
        
        try {
          // Check if the file exists
          await fs.access(agentPath);
          
          // Import the agent
          const { agent } = await import(agentPath);
          
          if (agent?.id && agent.handlers?.send) {
            this.agents[agent.id] = agent;
            console.log(`Loaded agent: ${agent.id}`);
          } else {
            console.warn(`Invalid agent in ${folder}: missing required properties`);
          }
        } catch (err) {
          console.warn(`Failed to load agent from ${folder}:`, err);
        }
      }
      
      console.log(`Loaded ${Object.keys(this.agents).length} agents`);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  }
  
  // Start the server
  public async start(port = 3000): Promise<void> {
    await this.loadAgents();
    this.server.listen(port, () => {
      console.log(`A2A Server is running at http://localhost:${port}`);
    });
  }
  
  // Stop the server
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err: Error | undefined) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  // Get the HTTP server instance for testing
  public getServer(): Server {
    return this.server;
  }
}

// Function to build and configure the server for testing
export async function buildServer(): Promise<Server> {
  const server = new A2AServer();
  await server.loadAgents();
  return server.getServer();
}

// Start the server if this file is executed directly
if (require.main === module) {
  const server = new A2AServer();
  server.start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
