import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { A2AServer } from '../server';
import axios from 'axios';

/**
 * These tests simulate an AI client interacting with the A2A server.
 * Instead of using supertest, we make actual HTTP requests using axios
 * to better simulate real-world client behavior.
 */
describe('AI Client Simulation', () => {
  let server: A2AServer;
  const TEST_PORT = 4444;
  const BASE_URL = `http://localhost:${TEST_PORT}`;
  
  // Store task IDs for later reference
  const taskIds: string[] = [];

  beforeAll(async () => {
    // Create and start the server for testing
    server = new A2AServer();
    await server.start(TEST_PORT);
    
    // Give the server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should retrieve the agent card', async () => {
    // AI client first discovers the agent capabilities
    const response = await axios.get(`${BASE_URL}/.well-known/agent.json`);
    
    // Verify basic agent info
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.name).toBe('Hello Agent');
    expect(response.data.url).toBe('agent://hello');
    
    // Check agent capabilities
    expect(response.data.capabilities).toBeDefined();
    expect(response.data.capabilities.streaming).toBe(false);
    
    // Verify the agent has skills
    expect(Array.isArray(response.data.skills)).toBe(true);
    expect(response.data.skills.length).toBeGreaterThan(0);
    expect(response.data.skills[0].id).toBe('greeting');
  });

  it('should send a message and get a response', async () => {
    // Generate a unique task ID
    const taskId = `task-${Date.now()}`;
    taskIds.push(taskId);
    
    // Simulate an AI client sending a message
    const response = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      id: 'client-1',
      method: 'tasks/send',
      params: {
        id: taskId,
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Hello from AI Client'
            }
          ]
        }
      }
    });
    
    // Verify the response format
    expect(response.status).toBe(200);
    expect(response.data.jsonrpc).toBe('2.0');
    expect(response.data.id).toBe('client-1');
    expect(response.data.result).toBeDefined();
    expect(response.data.result.id).toBe(taskId);
    
    // Check that we received artifacts in response
    expect(response.data.result.artifacts).toBeDefined();
    expect(Array.isArray(response.data.result.artifacts)).toBe(true);
    
    // Verify the message content includes proper greeting
    const textContent = response.data.result.artifacts[0].parts[0].text;
    expect(textContent).toContain('Hello');
    expect(textContent).toContain('Client');
  });

  it('should get task status with history', async () => {
    // Use the task ID from the previous test
    const taskId = taskIds[0];
    
    // Request task status
    const response = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      id: 'client-2',
      method: 'tasks/get',
      params: {
        id: taskId,
        historyLength: 10 // Request conversation history
      }
    });
    
    // Verify basic response structure
    expect(response.status).toBe(200);
    expect(response.data.jsonrpc).toBe('2.0');
    expect(response.data.id).toBe('client-2');
    expect(response.data.result).toBeDefined();
    expect(response.data.result.id).toBe(taskId);
    
    // Check task status
    expect(response.data.result.status).toBeDefined();
    expect(response.data.result.status.state).toBe('completed');
    
    // Verify task history contains messages
    expect(response.data.result.history).toBeDefined();
    expect(Array.isArray(response.data.result.history)).toBe(true);
    expect(response.data.result.history.length).toBeGreaterThan(0);
  });

  it('should simulate a multi-turn conversation', async () => {
    // Generate a unique task ID for conversation
    const conversationTaskId = `conversation-${Date.now()}`;
    
    // First message from AI client
    const firstResponse = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      id: 'conv-1',
      method: 'tasks/send',
      params: {
        id: conversationTaskId,
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello, what can you do?' }]
        }
      }
    });
    
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.data.result.id).toBe(conversationTaskId);
    
    // Second message in same conversation
    const secondResponse = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      id: 'conv-2',
      method: 'tasks/send',
      params: {
        id: conversationTaskId, // Same task ID for conversation continuity
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Thanks for explaining' }]
        }
      }
    });
    
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.data.result.id).toBe(conversationTaskId);
    
    // Get the conversation history
    const historyResponse = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      id: 'conv-history',
      method: 'tasks/get',
      params: {
        id: conversationTaskId
      }
    });
    
    // Verify the conversation has multiple messages
    expect(historyResponse.data.result.history.length).toBeGreaterThan(2);
  });
}); 