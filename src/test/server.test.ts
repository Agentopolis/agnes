import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { A2AServer } from '../server';

describe('Agnes A2A Server', () => {
  let server: A2AServer;
  const TEST_PORT = 5555; // Using a different port than the dev server

  beforeAll(async () => {
    // Create and start the server for testing
    server = new A2AServer();
    await server.start(TEST_PORT); // Actually start the server
  });

  afterAll(async () => {
    // Cleanup after tests
    await server.stop();
  });

  it('should return the hello agent card', async () => {
    const res = await request(`http://localhost:${TEST_PORT}`)
      .get('/.well-known/agent.json');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Hello Agent');
    expect(res.body.url).toBe('/hello');
    expect(res.body.capabilities).toBeDefined();
    expect(Array.isArray(res.body.skills)).toBe(true);
  });

  it('should return the agent card for a specific agent', async () => {
    const res = await request(`http://localhost:${TEST_PORT}`)
      .get('/hello/.well-known/agent.json');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Hello Agent');
  });

  it('should handle invalid agent requests with 404', async () => {
    const res = await request(`http://localhost:${TEST_PORT}`)
      .get('/nonexistent-agent/.well-known/agent.json');
    
    expect(res.status).toBe(404);
  });

  it('should process a tasks/send request', async () => {
    const res = await request(`http://localhost:${TEST_PORT}`)
      .post('/rpc')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'tasks/send',
        params: {
          id: 'task-123',
          message: {
            role: 'user',
            parts: [
              {
                type: 'text',
                text: 'Hello from Test'
              }
            ]
          }
        }
      });
    
    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe('2.0');
    expect(res.body.id).toBe('test-123');
    expect(res.body.result).toBeDefined();
    expect(res.body.result.id).toBe('task-123');
    
    // The agent should respond with a message that includes "Hello Test"
    const artifacts = res.body.result.artifacts;
    expect(Array.isArray(artifacts)).toBe(true);
    expect(artifacts[0].parts[0].type).toBe('text');
    expect(artifacts[0].parts[0].text).toContain('Test');
  });

  it('should process a tasks/get request', async () => {
    // First send a task to create it
    await request(`http://localhost:${TEST_PORT}`)
      .post('/rpc')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 'test-create',
        method: 'tasks/send',
        params: {
          id: 'task-get-test',
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Test message' }]
          }
        }
      });
    
    // Now get the task
    const res = await request(`http://localhost:${TEST_PORT}`)
      .post('/rpc')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 'test-get',
        method: 'tasks/get',
        params: {
          id: 'task-get-test'
        }
      });
    
    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe('2.0');
    expect(res.body.id).toBe('test-get');
    expect(res.body.result).toBeDefined();
    expect(res.body.result.id).toBe('task-get-test');
    expect(res.body.result.status.state).toBe('completed');
  });

  it('should handle invalid JSON-RPC requests', async () => {
    const res = await request(`http://localhost:${TEST_PORT}`)
      .post('/rpc')
      .set('Content-Type', 'application/json')
      .send({ invalid: 'request' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe(-32600); // Invalid request
  });
}); 