import axios from 'axios';

/**
 * A simple client for interacting with an A2A server.
 * This demonstrates how an AI agent might communicate with our server.
 */
export class A2AClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Discover agent capabilities by fetching its card
   */
  async getAgentCard(agentId?: string): Promise<Record<string, unknown>> {
    const url = agentId 
      ? `${this.baseUrl}/${agentId}/.well-known/agent.json`
      : `${this.baseUrl}/.well-known/agent.json`;
      
    const response = await axios.get(url);
    return response.data;
  }
  
  /**
   * Send a message to the agent
   */
  async sendMessage(
    taskId: string,
    message: string,
    sessionId?: string
  ): Promise<Record<string, unknown>> {
    const response = await axios.post(`${this.baseUrl}/rpc`, {
      jsonrpc: '2.0',
      id: `request-${Date.now()}`,
      method: 'tasks/send',
      params: {
        id: taskId,
        sessionId,
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: message
            }
          ]
        }
      }
    });
    
    return response.data;
  }
  
  /**
   * Get the status and history of a task
   */
  async getTask(taskId: string, historyLength?: number): Promise<Record<string, unknown>> {
    const response = await axios.post(`${this.baseUrl}/rpc`, {
      jsonrpc: '2.0',
      id: `request-${Date.now()}`,
      method: 'tasks/get',
      params: {
        id: taskId,
        historyLength
      }
    });
    
    return response.data;
  }
  
  /**
   * Cancel an in-progress task
   */
  async cancelTask(taskId: string): Promise<Record<string, unknown>> {
    const response = await axios.post(`${this.baseUrl}/rpc`, {
      jsonrpc: '2.0',
      id: `request-${Date.now()}`,
      method: 'tasks/cancel',
      params: {
        id: taskId
      }
    });
    
    return response.data;
  }
}

/**
 * Example usage of the client
 */
async function main() {
  const client = new A2AClient('http://localhost:3000');
  
  try {
    // 1. Discover agent capabilities
    console.log('Discovering agent...');
    const agentCard = await client.getAgentCard();
    console.log(`Found agent: ${agentCard.name}`);
    console.log(`Skills: ${(agentCard.skills as any[]).map(s => s.name).join(', ')}`);
    
    // 2. Create a new conversation task
    const taskId = `task-${Date.now()}`;
    console.log(`\nStarting conversation with task ID: ${taskId}`);
    
    // 3. Send a message
    console.log('\nSending message...');
    const messageResponse = await client.sendMessage(
      taskId,
      'Hello, this is an AI client testing your server!'
    );
    
    if ('result' in messageResponse) {
      const result = messageResponse.result as any;
      // Extract and display the response text
      if (result.artifacts && result.artifacts.length > 0) {
        const textPart = result.artifacts[0].parts.find((p: any) => p.type === 'text');
        if (textPart) {
          console.log('\nAgent response:');
          console.log(JSON.parse(textPart.text));
        }
      }
    }
    
    // 4. Get task history
    console.log('\nRetrieving conversation history...');
    const taskResponse = await client.getTask(taskId);
    if ('result' in taskResponse) {
      const result = taskResponse.result as any;
      console.log(`Task status: ${result.status.state}`);
      console.log(`Message count: ${result.history.length}`);
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the example if executed directly
if (require.main === module) {
  main().catch(console.error);
} 