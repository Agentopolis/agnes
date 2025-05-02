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

> 💡 If you don’t have `pnpm` installed, run `npm install -g pnpm` first. Or see [pnpm.io](https://pnpm.io) for alternative installation methods.

```bash
pnpm install
```

### ▶️ Run the development server

```bash
pnpm dev
```

This runs the Agnes core server with live reload.

### 🚀 Run the production server

```bash
pnpm build
node dist/index.mjs
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
