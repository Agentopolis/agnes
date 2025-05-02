// src/index.ts
import Fastify from 'fastify';

export async function buildServer() {
  const app = Fastify();

  app.get('/.well-known/agent.json', async (_, reply) => {
    reply.send({ name: 'Test Agent' });
  });

  return app;
}

// If run directly from CLI, start the server
if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {

  buildServer().then(app => {
    app.listen({ port: 3000 }, err => {
      if (err) throw err;
      console.log("Agnes running at http://localhost:3000");
    });
  });
}
