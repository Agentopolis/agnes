// packages/core/src/index.ts

import Fastify from "fastify";

const app = Fastify();

app.post<{ Body: { task: string } }>("/tasks/send", async (request, reply) => {
  const { task } = request.body;

  // Later: lookup correct agent by route or config
  const result = {
    message: {
      role: "assistant",
      parts: [{ type: "text", text: "Hello from Agnes 👋" }]
    }
  };

  reply.send(result);
});

app.get("/.well-known/agent.json", async (req, reply) => {
  reply.send({
    id: "agent://hello.agentopolis.ai",
    name: "Example Agent",
    version: "1.0.0"
  });
});

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Agnes running at ${address}`);
});
