import { describe, it, expect } from 'vitest';
import { agent } from '../../agents/time';
import type { Message, AgentContext } from '../../types/agent';

describe('Time Agent', () => {
  // Create a mock context
  const mockContext: AgentContext = {
    taskId: 'test-task-id',
    agentId: 'agent://time',
    sessionId: 'test-session',
    logger: console
  };

  it('should return the current time when asked generally', async () => {
    // Create input message asking for the time
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'What time is it?' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify response
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message.role).toBe('agent');
      expect(result.message.parts[0].type).toBe('text');
      expect(result.message.parts[0].text).toContain('current time');
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should return UTC time when requested', async () => {
    // Create input message asking for UTC time
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'What is the current UTC time?' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify response
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message.role).toBe('agent');
      expect(result.message.parts[0].type).toBe('text');
      expect(result.message.parts[0].text).toContain('UTC');
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should return Unix timestamp when requested', async () => {
    // Create input message asking for Unix timestamp
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'What is the current Unix timestamp?' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify response
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message.role).toBe('agent');
      expect(result.message.parts[0].type).toBe('text');
      expect(result.message.parts[0].text).toContain('Unix timestamp');
      
      // Extract the timestamp and verify it's a number close to current time
      const text = result.message.parts[0]?.text;
      if (text) {
        const timestampMatch = text.match(/(\d+)/);
        if (timestampMatch?.[1]) {
          const timestamp = Number.parseInt(timestampMatch[1], 10);
          const now = Math.floor(Date.now() / 1000);
          expect(timestamp).toBeGreaterThan(now - 5);
          expect(timestamp).toBeLessThan(now + 5);
        }
      }
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should return ISO format when requested', async () => {
    // Create input message asking for ISO format
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'Show me the time in ISO format' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify response
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message.role).toBe('agent');
      expect(result.message.parts[0].type).toBe('text');
      expect(result.message.parts[0].text).toContain('ISO format');
      
      // Verify it includes a correctly formatted ISO timestamp
      const responseText = result.message.parts[0]?.text;
      if (responseText) {
        const isoMatch = responseText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(isoMatch).toBeTruthy();
      }
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should include metadata in the response', async () => {
    // Create simple input message
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'time please' }]
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
