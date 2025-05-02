// Basic Message structure (aligns with A2A Message)
export interface MessagePart {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: unknown;
  fileUrl?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>; // Added metadata to Part
}

export interface Message {
  role: 'user' | 'agent' | 'system';
  parts: MessagePart[];
  metadata?: Record<string, unknown>;
}

// Context provided by Agnes to handlers
export interface AgentContext {
  taskId: string;
  userId?: string; // Authenticated user ID
  agentId: string;
  sessionId?: string;
  memory?: {
    getHistory(): Promise<Message[]>;
    append(message: Message): Promise<void>;
  };
  auth?: { // Populated based on successful validation
    scheme: string; // e.g., 'api_key', 'oauth'
    credentials?: string; // The validated token/key
  };
  logger: Pick<Console, 'log' | 'warn' | 'error'>;
  config?: Record<string, unknown>; // Agent-specific runtime config
}

// Simplified Request/Response types for handlers
export type SendRequest = { message: Message };
export type SendResponse = { message: Message } | { error: string };
// TODO: Add types for create, get, cancel if needed

// --- Types matching A2A AgentCard structure --- 

export interface AgentProvider {
  organization: string;
  url?: string;
}

// Aligns with A2A AgentAuthentication but simplified for Agnes definition
export interface AgentAuthDefinition {
  schemes: ('api_key' | 'oauth' | string)[]; // Allow custom schemes
  // Credentials are not defined here; Agnes validates incoming requests
}

// Aligns with A2A AgentCapabilities
export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
}

// Aligns with A2A AgentSkill
export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}
// --- End AgentCard Types --- 

// The core interface an agent module must implement
export interface Agent {
  // --- Core Metadata (maps to AgentCard) ---
  id: string; // Agent URI (e.g., "agent://faq.example.com")
  name: string;
  description?: string;
  version?: string;
  provider?: AgentProvider;
  documentationUrl?: string;

  // --- Agnes Runtime & A2A Configuration ---
  // Controls how Agnes handles auth validation for this agent
  authentication?: AgentAuthDefinition;
  // Controls agent capabilities advertised in agent.json
  capabilities?: AgentCapabilities;
  // Default modes advertised in agent.json
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  // Structured skills advertised in agent.json
  skills?: AgentSkill[];
  // Should Agnes provide task memory?
  memory?: boolean;

  // --- Core Logic Handlers ---
  handlers: {
    send: (
      request: SendRequest,
      context: AgentContext
    ) => Promise<SendResponse>;
    // TODO: Add optional create, get, cancel handlers similarly
  };

  // --- Optional Lifecycle & Overrides ---
  init?: (context: { logger: Console }) => Promise<void>; // Called on agent load
  cardOverride?: Record<string, unknown>; // Manually override generated agent.json fields
}

// Helper to define agents with type safety
export function defineAgent(definition: Agent): Agent {
  if (!definition.id || !definition.name || !definition.handlers?.send) {
    throw new Error('Agent definition must include id, name, and a handlers.send function.');
  }
  // Default input/output modes if not provided
  definition.defaultInputModes = definition.defaultInputModes ?? ['text'];
  definition.defaultOutputModes = definition.defaultOutputModes ?? ['text'];
  return definition;
} 