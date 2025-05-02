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

Ensure your `agnes.config.json` file is present in the project root (or provide a path using `--config`). This file tells Agnes which agents to load.

```bash
# Run from the project root
pnpm dev
```

This runs the Agnes development server using `tsx` (with hot-reload), loading agents specified in `agnes.config.json`.

*   **Custom Config:** To use a different configuration file, pass the `--config` flag after `--`:
    ```bash
    pnpm dev -- --config path/to/your-config.json
    ```

### 🚀 Run the production server

This command first builds all necessary packages and then starts the production server using `tsx`.

```bash
# Run from the project root
pnpm start
```

*   **Custom Config:** To use a different configuration file, pass the `--config` flag after `--`:
    ```bash
    pnpm start -- --config path/to/your-config.json
    ```

### 🧪 Run tests

```bash
pnpm test
```

### 📈 Run test coverage

```