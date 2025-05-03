import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { A2AServer } from '../server';
import { ErrorCodes } from '../server';

/**
 * This test suite verifies that our server implementation 
 * complies with the A2A protocol specification.
 */
describe('A2A Protocol Specification Compliance', () => {
  let server: A2AServer;
  const TEST_PORT = 6500;
  const BASE_URL = `http://localhost:${TEST_PORT}`;
  
  beforeAll(async () => {
    server = new A2AServer({ port: TEST_PORT });
    await server.start();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  describe('Agent Card specification', () => {
    it('should serve a valid agent card at /.well-known/agent.json', async () => {
      const res = await request(BASE_URL)
        .get('/.well-known/agent.json');
      
      expect(res.status).toBe(200);
      
      // Required fields according to A2A spec
      expect(res.body.name).toBeDefined();
      expect(res.body.url).toBeDefined();
      expect(res.body.version).toBeDefined();
      expect(res.body.capabilities).toBeDefined();
      expect(res.body.skills).toBeDefined();
      
      // Capabilities object validation
      expect(res.body.capabilities).toHaveProperty('streaming');
      expect(res.body.capabilities).toHaveProperty('pushNotifications');
      expect(res.body.capabilities).toHaveProperty('stateTransitionHistory');
      
      // Default modes
      expect(Array.isArray(res.body.defaultInputModes)).toBe(true);
      expect(Array.isArray(res.body.defaultOutputModes)).toBe(true);
      
      // Skills structure
      expect(Array.isArray(res.body.skills)).toBe(true);
      if (res.body.skills.length > 0) {
        const skill = res.body.skills[0];
        expect(skill.id).toBeDefined();
        expect(skill.name).toBeDefined();
      }
    });
  });
  
  describe('JSON-RPC compliance', () => {
    it('should follow JSON-RPC 2.0 specification', async () => {
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'tasks/send',
          params: {
            id: 'task-jsonrpc-test',
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Test JSON-RPC' }]
            }
          }
        });
      
      // Check JSON-RPC response structure
      expect(res.status).toBe(200);
      expect(res.body.jsonrpc).toBe('2.0');
      expect(res.body.id).toBe('test-1');
      expect(res.body.result).toBeDefined();
      expect(res.body.error).toBeUndefined();
    });
    
    it('should return appropriate error for invalid JSON', async () => {
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send('{"jsonrpc": "2.0", "method": "tasks/send", "id": 1, invalid');
      
      expect(res.status).toBe(400);
      expect(res.body.jsonrpc).toBe('2.0');
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(ErrorCodes.PARSE_ERROR);
    });
    
    it('should return error for invalid request structure', async () => {
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          // Missing jsonrpc field
          id: 'test-2',
          method: 'tasks/send'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.jsonrpc).toBe('2.0');
      expect(res.body.id).toBe('test-2');
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(ErrorCodes.INVALID_REQUEST);
    });
    
    it('should return error for non-existent method', async () => {
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-3',
          method: 'non_existent_method',
          params: {}
        });
      
      expect(res.status).toBe(200);
      expect(res.body.jsonrpc).toBe('2.0');
      expect(res.body.id).toBe('test-3');
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
    });
  });
  
  describe('tasks/send endpoint', () => {
    it('should process a valid tasks/send request', async () => {
      const taskId = `task-send-${Date.now()}`;
      
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-send',
          method: 'tasks/send',
          params: {
            id: taskId,
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Test message' }]
            }
          }
        });
      
      // Check response structure
      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
      expect(res.body.result.id).toBe(taskId);
      expect(res.body.result.status).toBeDefined();
      expect(res.body.result.status.state).toBe('completed');
      
      // Check artifacts
      expect(Array.isArray(res.body.result.artifacts)).toBe(true);
      expect(res.body.result.artifacts[0].parts).toBeDefined();
      expect(res.body.result.artifacts[0].parts[0].type).toBe('text');
    });
    
    it('should return error for missing required params', async () => {
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-params',
          method: 'tasks/send',
          params: {
            // Missing 'id' and 'message'
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(ErrorCodes.INVALID_PARAMS);
    });
  });
  
  describe('tasks/get endpoint', () => {
    it('should retrieve task status', async () => {
      // First create a task
      const taskId = `task-get-${Date.now()}`;
      await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-create',
          method: 'tasks/send',
          params: {
            id: taskId,
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Get test' }]
            }
          }
        });
      
      // Now retrieve it
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-get',
          method: 'tasks/get',
          params: {
            id: taskId
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
      expect(res.body.result.id).toBe(taskId);
      expect(res.body.result.status).toBeDefined();
      expect(res.body.result.history).toBeDefined();
    });
    
    it('should return error for non-existent task', async () => {
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-missing',
          method: 'tasks/get',
          params: {
            id: 'non-existent-task'
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(ErrorCodes.TASK_NOT_FOUND);
    });
  });
  
  describe('tasks/cancel endpoint', () => {
    it('should cancel an in-progress task', async () => {
      // Create a task
      const taskId = `task-cancel-${Date.now()}`;
      await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-create-cancel',
          method: 'tasks/send',
          params: {
            id: taskId,
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Cancel test' }]
            }
          }
        });
      
      // Create a new task to cancel (the first task completes too quickly)
      const cancelTaskId = `task-to-cancel-${Date.now()}`;
      
      // Manually modify the task state to be 'working' so we can cancel it
      // This is implementation-specific, but necessary for testing
      type TaskStorage = {
        id: string;
        agentId: string;
        status: {
          state: string;
          timestamp: string;
        };
        history: unknown[];
      };
      
      (server as unknown as { tasks: Record<string, TaskStorage> }).tasks[cancelTaskId] = {
        id: cancelTaskId,
        agentId: 'agent://hello',
        status: {
          state: 'working',
          timestamp: new Date().toISOString()
        },
        history: []
      };
      
      // Now cancel it
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-cancel',
          method: 'tasks/cancel',
          params: {
            id: cancelTaskId
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
      expect(res.body.result.id).toBe(cancelTaskId);
      expect(res.body.result.status.state).toBe('canceled');
    });
    
    it('should return error for non-existent task', async () => {
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-cancel-missing',
          method: 'tasks/cancel',
          params: {
            id: 'non-existent-task'
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(ErrorCodes.TASK_NOT_FOUND);
    });
    
    it('should return error for non-cancelable task', async () => {
      // Create a completed task (not cancelable)
      const taskId = `task-completed-${Date.now()}`;
      await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-create-completed',
          method: 'tasks/send',
          params: {
            id: taskId,
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Completed task' }]
            }
          }
        });
      
      // Try to cancel the completed task
      const res = await request(BASE_URL)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .send({
          jsonrpc: '2.0',
          id: 'test-cancel-completed',
          method: 'tasks/cancel',
          params: {
            id: taskId
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(ErrorCodes.TASK_NOT_CANCELABLE);
    });
  });
}); 