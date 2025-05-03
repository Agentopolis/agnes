import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { A2AServer } from '../server';
import { agent as helloAgent } from '../agents/hello';

describe('A2A Server Configuration', () => {
  let server: A2AServer;
  const originalEnv = { ...process.env };
  
  // Clean up after each test
  afterEach(async () => {
    // Restore original environment variables
    process.env = { ...originalEnv };
    
    // Stop the server if it was started
    if (server) {
      await server.stop();
    }
  });

  it('should use the port specified in constructor options', async () => {
    const testPort = 6001;
    server = new A2AServer({ port: testPort });
    await server.start();
    
    // Make sure server is running on the specified port
    const res = await request(`http://localhost:${testPort}`)
      .get('/.well-known/agent.json');
    
    expect(res.status).toBe(200);
  });

  it('should use PORT environment variable if no port option provided', async () => {
    const testPort = 6002;
    process.env.PORT = testPort.toString();
    
    server = new A2AServer();
    await server.start();
    
    // Make sure server is running on the port from environment variable
    const res = await request(`http://localhost:${testPort}`)
      .get('/.well-known/agent.json');
    
    expect(res.status).toBe(200);
  });

  it('should use the correct base URL in agent cards', async () => {
    const testPort = 6003;
    server = new A2AServer({ port: testPort });
    await server.start();
    
    // Get the agent card and verify the URL
    const res = await request(`http://localhost:${testPort}`)
      .get('/.well-known/agent.json');
    
    expect(res.status).toBe(200);
    // Expect the relative URL format
    expect(res.body.url).toBe('/hello');
  });

  it('should use custom BASE_URL if provided', async () => {
    const testPort = 6004;
    const customBaseUrl = 'https://example.com/api';
    process.env.BASE_URL = customBaseUrl;
    
    server = new A2AServer({ port: testPort });
    await server.start();
    
    // Get the agent card and verify the URL uses the custom base URL
    const res = await request(`http://localhost:${testPort}`)
      .get('/.well-known/agent.json');
    
    expect(res.status).toBe(200);
    // When custom base URL is provided, it should use that
    expect(res.body.url).toBe(`${customBaseUrl}/hello`);
  });
});

describe('A2A Protocol Endpoint Handling', () => {
  let server: A2AServer;
  const testPort = 6005;
  
  beforeEach(async () => {
    server = new A2AServer({ port: testPort });
    await server.start();
  });
  
  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should handle requests to /rpc endpoint', async () => {
    const res = await request(`http://localhost:${testPort}`)
      .post('/rpc')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 'test-rpc',
        method: 'tasks/send',
        params: {
          id: 'task-rpc-test',
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Test RPC endpoint' }]
          }
        }
      });
    
    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe('2.0');
    expect(res.body.id).toBe('test-rpc');
  });

  it('should handle requests to /task/ endpoint', async () => {
    const res = await request(`http://localhost:${testPort}`)
      .post('/task/send')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 'test-task',
        method: 'tasks/send',
        params: {
          id: 'task-endpoint-test',
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Test task endpoint' }]
          }
        }
      });
    
    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe('2.0');
    expect(res.body.id).toBe('test-task');
  });

  it('should handle requests to /message/ endpoint', async () => {
    const res = await request(`http://localhost:${testPort}`)
      .post('/message/send')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 'test-message',
        method: 'tasks/send',
        params: {
          id: 'message-endpoint-test',
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Test message endpoint' }]
          }
        }
      });
    
    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe('2.0');
    expect(res.body.id).toBe('test-message');
  });

  it('should handle CORS preflight requests', async () => {
    const res = await request(`http://localhost:${testPort}`)
      .options('/rpc')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');
    
    expect(res.status).toBe(204);
    expect(res.header['access-control-allow-origin']).toBe('*');
    expect(res.header['access-control-allow-methods']).toContain('POST');
  });
}); 