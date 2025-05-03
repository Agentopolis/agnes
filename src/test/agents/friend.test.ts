import { describe, it, expect } from 'vitest';
import { agent } from '../../agents/friend';
import type { Message, AgentContext } from '../../types/agent';

describe('Friend Agent', () => {
  // Create a mock context
  const mockContext: AgentContext = {
    taskId: 'test-task-id',
    agentId: 'agent://friend',
    sessionId: 'test-session',
    logger: console
  };

  it('should respond to a greeting with a non-empty message', async () => {
    // Skip the test if no API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping test: No OpenAI API key available');
      return;
    }

    // Create input message
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'Hello Friend!' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify we get a response (not checking specific content)
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message.role).toBe('agent');
      expect(result.message.parts[0].type).toBe('text');
      
      // Just check we got some reasonable text (more than 5 characters)
      const responseText = result.message.parts[0]?.text || '';
      expect(responseText.length).toBeGreaterThan(5);
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should include metadata in the response', async () => {
    // Skip the test if no API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping test: No OpenAI API key available');
      return;
    }

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
}); 