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

  it('should respond with time information when asked generally', async () => {
    // Create input message asking for the time
    const inputMessage: Message = {
      role: 'user',
      parts: [{ type: 'text', text: 'What time is it?' }]
    };

    // Call the agent
    const result = await agent.handlers.send({ message: inputMessage }, mockContext);
    
    // Verify we get a non-empty response
    expect(result).toHaveProperty('message');
    if ('message' in result) {
      expect(result.message.role).toBe('agent');
      expect(result.message.parts[0].type).toBe('text');
      
      // Just check that we get a reasonably sized response
      const responseText = result.message.parts[0]?.text || '';
      expect(responseText.length).toBeGreaterThan(10);
    } else {
      throw new Error('Expected message response but got error');
    }
  });

  it('should respond differently when asking for different time formats', async () => {
    // Create input messages asking for different time formats
    const formats = [
      'What is the current UTC time?',
      'What is the current Unix timestamp?',
      'Show me the time in ISO format'
    ];
    
    const responses: string[] = [];
    
    // Get responses for each format
    for (const format of formats) {
      const inputMessage: Message = {
        role: 'user',
        parts: [{ type: 'text', text: format }]
      };

      const result = await agent.handlers.send({ message: inputMessage }, mockContext);
      
      if ('message' in result) {
        const responseText = result.message.parts[0]?.text || '';
        responses.push(responseText);
      }
    }
    
    // Check we got different responses for different formats
    // This is a loose check since we're not testing exact output
    expect(responses.length).toBe(3);
    expect(new Set(responses).size).toBeGreaterThan(1); // At least some responses should be different
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
