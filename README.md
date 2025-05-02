# 👵 Agnes

**Agnes** is a customizable A2A server runtime that handles all the boilerplate of the Agent-to-Agent protocol — so you can focus on logic, not plumbing.

Agnes is built to run one or many A2A agents using the same structure and configuration. It manages protocol handling, task memory, authentication, and agent metadata so you can just implement the logic that makes your agent useful.

---

## 🚀 Features

* 🏠 **Multi-agent aware by default**
* ⚖️ Built-in **memory and task context** support
* 🔑 Optional **API key / token-based auth**
* 📝 Dynamic `.well-known/agent.json` serving
* 🌐 **Modular agents**: run independently or together
* ⚙️ Config-driven setup using a standard JSON format
* ✨ CLI scaffolding and local dev mode

---

## 📄 Example `agnes.config.json`

```json
{
  "agents": [
    {
      "id": "faq",
      "path": "./agents/faq-agent",
      "route": "/faq"
    },
    {
      "id": "scheduler",
      "path": "./agents/scheduler-agent",
      "route": "/schedule"
    }
  ]
}
```

Want to run just one agent? Just include one entry in the list and assign it a route:

```json
{
  "agents": [
    {
      "id": "faq",
      "path": "./agents/faq-agent",
      "route": "/"
    }
  ]
}
```

---

## 🚗 Getting Started

### 🔧 Install dependencies

> 💡 If you don't have `pnpm` installed, run `npm install -g pnpm` first. Or see [pnpm.io](https://pnpm.io) for alternative installation methods.

```bash
pnpm install
```

### ▶️ Run the development server

Ensure your `agnes.config.json` file is present in the project root (the directory where you run the command). This file tells Agnes which agents to load.

```bash
# Run from the project root
pnpm dev
```

This runs the Agnes development server (typically with hot-reload), loading agents specified in `agnes.config.json`.

### 🚀 Run the production server

This command first builds all necessary packages and then starts the production server.

```bash
# Run from the project root
pnpm start
```

### 🧪 Run tests

```bash
pnpm test
```

### 📈 Run test coverage

```bash
pnpm test --coverage
```

Then open the report at `coverage/index.html`

---

## 📁 Agent Structure

Each agent module exports a handler object with a standard shape:

```ts
export default defineAgent({
  id: "agent://faq.agentopolis.ai",
  name: "FAQ Agent",
  memory: true,
  auth: "optional",
  handlers: {
    create,
    send,
    get
  }
});
```

Agnes handles HTTP routing, memory, authentication, and metadata serving. Your job is to provide logic for each task endpoint.

---

## 🔍 Why Agnes?

Because A2A agents need to:

* Respond to standard task protocol endpoints
* Store and retrieve task memory
* Manage per-user or per-agent auth tokens
* Provide metadata in `.well-known/agent.json`

Agnes provides all of that so you can focus on the parts that make your agent unique.

---

## ❓ FAQ

### Is Agnes a multi-agent framework like CrewAI, AutoGen, or LangGraph?

No. Agnes is **not** a multi-agent coordination system.

Agnes is a **server runtime for implementing A2A servers** using Google's [Agent-to-Agent (A2A) protocol](https://github.com/google/a2a).

You can use any internal logic inside your A2A server — even multi-agent frameworks like CrewAI, AutoGen, LangChain, or your own custom logic. Agnes simply takes care of:

* Handling the A2A JSON-RPC task protocol
* Providing routes like `/tasks/send`, `/tasks/create`, etc.
* Managing memory and task state
* Serving your `.well-known/agent.json`
* Supporting authentication, config, and modular deployment

The **A2A agent behavior** is up to you.

---

## ⚙️ Config-Driven by Design

Agnes uses a simple `agnes.config.json` file to declare:

* The agents to load
* Their filesystem paths
* Their base routes

This avoids inventing a new standard and stays familiar for developers used to JSON-based CLI frameworks. It makes agent loading and multi-agent composition transparent and predictable.

For agent developers, getting started is as simple as:

1. Run `npx agnes init my-agent`
2. Write logic in `handlers.ts`
3. Add your agent to `agnes.config.json`
4. Run `pnpm dev`

That's it.
