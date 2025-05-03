👵 Agnes
====

Agnes is a customizable A2A server runtime that handles all the boilerplate of the Agent-to-Agent protocol — so you can focus on logic, not plumbing.

Agnes is built to run one or many A2A agents using the same structure and configuration. It manages protocol handling, task memory, authentication, and agent metadata so you can just implement the logic that makes your agent useful.

## 🚀 Features

- 🏠 Multi-agent aware by default
- ⚖️ Built-in memory and task context support
- 🔑 Optional API key support via environment variables
- 📝 Dynamic agent card serving via /.well-known/agent.json
- 🌐 Modular agents: run independently or together
- 📡 Supports the A2A protocol with JSON-RPC methods

## 🚗 Getting Started

### 🔧 Install dependencies

```bash
npm install
```

### 🔐 Configuration

Agnes uses environment variables for configuration. You can set these in a `.env` file in the project root:

```
# A2A Server Configuration
PORT=7777
BASE_URL=http://localhost:7777

# OpenAI API Key for Friend Agent (if you want to use it)
OPENAI_API_KEY=your-openai-api-key-here
```

### ▶️ Run the development server

```bash
# Run with auto-reload for development
npm run dev:watch

# Or run without auto-reload
npm run dev
```

This runs the Agnes development server and loads all available agents in the `src/agents` directory.

By default, the server runs on port 7777, but you can customize this by using the `--port` parameter:

```bash
npm run dev -- --port 8888
```

### 🚀 Run the production server

Build and start the production server:

```bash
# Build the project
npm run build

# Start the production server
npm start
```
Console output:
```
==================================
👵 Agnes is running at http://localhost:7777
==================================

Loaded agents:
- Friendly Agent (http://localhost:7777/friend)
- Hello Agent (http://localhost:7777/hello)
- Time Agent (http://localhost:7777/time)

Ready to receive requests...
```

## 🐳 Docker Deployment

Agnes can be easily deployed using Docker:

```bash
# Build the Docker image
npm run docker:build

# Run the Docker container
npm run docker:run

# Stop the Docker container
npm run docker:stop
```

The Docker container will use the `.env` file in the project root for configuration if available.

## ☁️ Heroku Deployment

Agnes can also be deployed to Heroku using Docker containers:

### Setup for Heroku

Before deploying to Heroku, create a `.env.heroku` file in the project root with the following content:

```
# Heroku deployment settings
HEROKU_APP_NAME=your-heroku-app-name
BASE_URL=https://your-heroku-app-name.herokuapp.com
```

**Important:** The `BASE_URL` must be your actual Heroku app URL, including any unique identifier that Heroku assigns (e.g., `https://agnes-demos-edb428e5168c.herokuapp.com`).

### Deployment Commands

```bash
# Deploy to Heroku (builds, sets config, pushes, and releases)
npm run heroku:deploy

# Individual steps if needed:
npm run heroku:config   # Set the BASE_URL in Heroku config
npm run heroku:push     # Build and push the Docker container
npm run heroku:release  # Release the container
```

The deployment process:
1. Builds the TypeScript application
2. Sets environment variables in Heroku (especially the crucial BASE_URL)
3. Pushes the Docker container to Heroku
4. Releases the application

**Note:** Agnes no longer tries to guess the Heroku URL - it relies entirely on the `BASE_URL` environment variable, which must be correctly set to enable agent endpoints and proper agent card URLs.

## 👷‍♀️ Creating new agents

Agents are located in the `src/agents` directory. Each agent has its own subdirectory with an `index.ts` file that exports an agent object.

To create a new agent:

1. Create a new directory under `src/agents` (e.g., `src/agents/my-agent`)
2. Create an `index.ts` file that exports an agent object following the Agent interface

Example of a simple agent:

```typescript
import type { Agent, Message, AgentContext } from '../../types/agent';

// Handler to process messages
const handleSend = async (
  payload: { message: Message },
  context: AgentContext
): Promise<{ message: Message } | { error: string }> => {
  console.log(`Received message from task ${context.taskId}`);
  
  return {
    message: {
      role: 'agent',
      parts: [
        {
          type: 'text',
          text: 'Hello from my agent!'
        }
      ]
    }
  };
};

// Define the agent
export const agent: Agent = {
  id: 'agent://my-agent',
  name: 'My Agent',
  description: 'This is my custom agent',
  version: '1.0.0',
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false
  },
  handlers: {
    send: handleSend
  }
};
```

### 🧪 Running tests

Agnes includes a comprehensive test suite for both the server and individual agents:

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:server      # Test the server components
npm run test:agents      # Test all agents
npm run test:spec        # Test A2A protocol compliance
npm run test:client      # Test client interaction

# Run tests for a specific file
npm test src/test/agents/time.test.ts
```
