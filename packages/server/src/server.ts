// src/index.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import type { Agent, AgentContext, SendRequest, SendResponse, Message } from '@agentopolis/agnes-types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(process.cwd(), 'agnes.config.json');
console.log(`📄 Loading config from: ${configPath}`);
if (!fs.existsSync(configPath)) {
  console.error(`❌ Config file not found at ${configPath}`);
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Define expected structure for type safety
interface AgentConfigEntry {
  id: string;
  path: string; // Relative path to the agent directory
  route: string; // Base path for the agent's routes (e.g., "/faq")
}

interface AgnesConfigFile {
  agents?: AgentConfigEntry[]; // Make agents optional
}

// Type assertion for better access
const agnesConfig = config as AgnesConfigFile;

// Log found agents
if (agnesConfig.agents && agnesConfig.agents.length > 0) {
  const agentIds = agnesConfig.agents.map(agent => agent.id);
  console.log(`🤖 Found ${agentIds.length} agent(s): ${agentIds.join(', ')}`);
} else {
  console.log('🧐 No agents defined in config file.');
}

// Define a basic type for the expected request body
interface TaskRequestBody {
  id?: string | number | null;
  params?: {
    id?: string;
    task?: { id?: string }; // Check both locations for taskId
    message?: Message;
  };
  task?: { // Also check if task is directly under body
    id?: string;
    message?: Message;
  }
}

// Function to load and mount agents
async function loadAgents(app: FastifyInstance, config: AgnesConfigFile, configDir: string) {
  if (!config.agents || config.agents.length === 0) {
    return; // Nothing to load
  }

  console.log("\n🔄 Loading agents...");
  for (const agentEntry of config.agents) {
    const agentBasePath = agentEntry.route.startsWith('/') ? agentEntry.route : `/${agentEntry.route}`;
    try {
      // Resolve agent path relative to the config file directory
      const agentDir = path.resolve(configDir, agentEntry.path);
      // Try loading compiled .js first, fallback to .ts for development
      let agentDefinePath = path.join(agentDir, 'define.js'); 
      let isTs = false;
      if (!fs.existsSync(agentDefinePath)) {
        agentDefinePath = path.join(agentDir, 'define.ts');
        isTs = true;
        if (!fs.existsSync(agentDefinePath)) {
          console.error(`    ❌ Agent '${agentEntry.id}' entry point (define.js or define.ts) not found in: ${agentDir}`);
          continue;
        }
          console.warn(`    ⚠️ Agent '${agentEntry.id}' loading source file: ${agentDefinePath}. Compile agent for production.`);
      }

      // Dynamically import the agent's definition using file URL
      const agentModule = await import(pathToFileURL(agentDefinePath).href);
      if (!agentModule.default || typeof agentModule.default !== 'object') {
        console.error(`    ❌ Agent '${agentEntry.id}' at ${agentDefinePath} did not export a default object.`);
        continue;
      }

      // TODO: Validate agentModule.default against the Agent interface schema (e.g., using Zod)
      const agentDefinition = agentModule.default as Agent;

      if (!agentDefinition.id || !agentDefinition.name || !agentDefinition.handlers?.send) {
        console.error(`    ❌ Agent '${agentEntry.id}' definition is missing required fields (id, name, handlers.send).`);
        continue;
      }

      console.log(`    Mounting agent '${agentEntry.id}' at ${agentBasePath}`);

      // --- Mount /.well-known/agent.json --- 
      // TODO: Generate this dynamically based on agentDefinition and A2A spec
      const agentCard = agentDefinition.cardOverride || {
        id: agentDefinition.id,
        name: agentDefinition.name,
        description: agentDefinition.description || '',
        url: `${agentBasePath}/tasks/send`, // Simplified URL for now
        version: agentDefinition.version || '1.0.0',
        capabilities: agentDefinition.capabilities || {},
        authentication: agentDefinition.authentication || null,
        skills: agentDefinition.skills || [],
      };

      app.get(`${agentBasePath}/.well-known/agent.json`, async (_, reply) => {
        reply.send(agentCard);
      });

      // --- Mount /tasks/send --- 
      // TODO: Implement full JSON-RPC request/response handling & validation
      app.post(`${agentBasePath}/tasks/send`, async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as TaskRequestBody; 
        // More robust extraction needed here based on actual JSON-RPC structure
        const taskId = body?.params?.id || body?.params?.task?.id || body?.task?.id || `task-${Date.now()}`; 
        const message = body?.params?.message || body?.task?.message;
        
        if (!taskId || !message) {
          return reply.status(400).send({ jsonrpc: "2.0", error: { code: -32602, message: "Invalid params: missing task id or message" }, id: body?.id || null });
        }

        // Construct the simplified context for the agent handler
        const ctx: AgentContext = {
          taskId,
          agentId: agentDefinition.id,
          // userId: getUserIdFromAuth(request), // TODO: Implement auth
          // memory: agentDefinition.memory ? getMemoryStore(taskId) : undefined, // TODO: Implement memory
          logger: console, // Use Fastify logger later
        };

        const simplifiedRequest: SendRequest = { message };

        try {
          const agentResponse: SendResponse = await agentDefinition.handlers.send(simplifiedRequest, ctx);

          // Translate simplified response back to A2A format
          // TODO: Handle error responses from agentResponse.error
          // TODO: Handle state transitions if needed
          const result = {
            task: {
              id: taskId,
              status: { state: 'completed' }, // Simplification
              message: (agentResponse as { message: Message }).message
            }
          };
          reply.send({ jsonrpc: "2.0", result, id: body?.id || null });

        } catch (error: unknown) {
          ctx.logger.error(`Error processing task ${taskId} for agent ${agentEntry.id}:`, error);
          // Check if it's an Error object before accessing message
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          reply.status(500).send({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error", data: errorMessage }, id: body?.id || null });
        }
      });

      // TODO: Mount /tasks/get, /tasks/create, /tasks/cancel if defined

      console.log(`    ✅ Agent '${agentEntry.id}' mounted successfully.`);

    } catch (error: unknown) {
      // Check if it's an Error object before accessing message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`    ❌ Failed to load or mount agent '${agentEntry.id}':`, errorMessage);
      // Optionally log the full error object too for debugging
      // console.error(error);
    }
  }
  console.log("\n🏁 Agent loading complete.");
}

// Get the directory containing the config file
const configDir = path.dirname(configPath);

export async function buildServer() {
  const app = Fastify();

  // Load agents defined in the config file
  await loadAgents(app, agnesConfig, configDir);

  // Optional: Root-level endpoint (maybe list agents?)
  app.get('/', async (_, reply) => {
    reply.send({ message: 'Agnes server running. Agents loaded.' });
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
