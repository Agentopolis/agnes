import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildServer } from './server';

describe('Agnes core API', () => {
  it('should return an agent card', async () => {
    const app = await buildServer();
    await app.ready(); // 🧠 Wait for Fastify to be fully initialized

    const res = await request(app.server).get('/.well-known/agent.json');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Agent');

    await app.close(); // 🔐 Important to clean up after the test
  });
});
