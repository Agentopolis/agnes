import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Message, AgentContext } from '../../types/agent';

// Mock the OpenAI module
vi.mock('openai', () => {
  // Define the mock inside the mock function
  const mockCompletionsCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: 'Hello, I am your friendly AI assistant! How can I help you today?'
        }
      }
    ]
  });
  
  // Expose the mock so we can reference it in the tests
  vi.stubGlobal('mockCompletionsCreate', mockCompletionsCreate);
  
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: mockCompletionsCreate
        }
      }
    }))
  };
});

// Import the agent after mocking
import { agent } from '../../agents/friend';

describe('Friend Agent', () => {
  // Create a mock context
  const mockContext: AgentContext = {
    taskId: 'test-task-id',
    agentId: 'agent://friend',
    sessionId: 'test-session',
    logger: console
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).mockCompletionsCreate.mockClear();
  });

  it('should respond in a friendly manner to a greeting', async () => {
    // Create input message
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'Hello Friend!' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify response
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message.role).toBe('agent');
      expect(result.message.parts[0].type).toBe('text');
      expect(result.message.parts[0].text).toContain('Hello');
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should include metadata in the response', async () => {
    // Create simple input message
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'How are you doing?' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify response includes metadata
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message).toHaveProperty('metadata');
      if (result.message.metadata) {
        expect(result.message.metadata).toHaveProperty('timestamp');
      }
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should pass the system prompt to OpenAI', async () => {
    // Create input message
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'Tell me something nice' }]
    };
    
    // Call the agent
    await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify the API was called with expected parameters
    expect((global as any).mockCompletionsCreate).toHaveBeenCalled();
    
    // Verify the first parameter contains the expected messages
    const callArgs = (global as any).mockCompletionsCreate.mock.calls[0][0];
    expect(callArgs).toHaveProperty('messages');
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe('system');
    expect(callArgs.messages[1].role).toBe('user');
    expect(callArgs.messages[1].content).toBe('Tell me something nice');
  });

  it('should handle errors gracefully', async () => {
    // Make the API call fail for this test
    (global as any).mockCompletionsCreate.mockRejectedValueOnce(new Error('API error'));
    
    // Create input message
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'This will fail' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify error response
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('Failed to generate friendly response');
      expect(result.error).toContain('API error');
    } else {
      throw new Error('Expected error response but got message');
    }
  });
}); 