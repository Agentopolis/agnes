// Basic Message structure (can be refined later)
export interface MessagePart {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: unknown; // Define specific data structures later if needed
  fileUrl?: string;
  mimeType?: string;
}

export interface Message {
  role: 'user' | 'agent' | 'system';
  parts: MessagePart[];
  metadata?: Record<string, unknown>;
}

// Context provided by Agnes to handlers
export interface AgentContext {
  taskId: string;
  userId?: string; // Populated if auth is successful
  // Basic memory helper provided by Agnes
  memory?: {
    getHistory(): Promise<Message[]>;
    append(message: Message): Promise<void>;
  };
  // Logger provided by Agnes
  logger: Pick<Console, 'log' | 'warn' | 'error'>;
  // Agent-specific configuration (if needed)
  config?: Record<string, unknown>;
}

// Simplified Request/Response types for handlers
// Agnes translates the full A2A request/response internally
export type SendRequest = { message: Message };
export type SendResponse = { message: Message } | { error: string }; // Or a structured error
// Add types for create, get, cancel if needed

// The core interface an agent module must implement
export interface Agent {
  // --- Essential Metadata ---
  id: string; // Unique Agent URI (e.g., "agent://faq.example.com")
  name: string;
  description?: string;

  // --- Optional Agnes Features ---
  memory?: boolean; // Should Agnes provide task memory?
  auth?: 'required' | 'optional' | 'none'; // Does this agent need authentication?

  // --- Core Logic Handlers ---
  handlers: {
    // The primary handler for responding to messages
    send: (
      request: SendRequest,
      context: AgentContext
    ) => Promise<SendResponse>;

    // Add optional create, get, cancel handlers similarly if needed
    // create?: (request: SimpleCreateRequest, context: AgentContext) => Promise<SimpleCreateResponse>;
    // get?: (request: SimpleGetRequest, context: AgentContext) => Promise<SimpleGetResponse>;
    // cancel?: (request: SimpleCancelRequest, context: AgentContext) => Promise<SimpleCancelResponse>;
  };

  // --- Optional Lifecycle & Overrides ---
  init?: (context: { logger: Console }) => Promise<void>; // Called on agent load
  cardOverride?: Record<string, unknown>;
}

// Helper to define agents with type safety
export function defineAgent(definition: Agent): Agent {
  // Basic validation (e.g., ensure required fields exist)
  if (!definition.id || !definition.name || !definition.handlers?.send) {
    throw new Error('Agent definition must include id, name, and a send handler.');
  }
  return definition;
} 