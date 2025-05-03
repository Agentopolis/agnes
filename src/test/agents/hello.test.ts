import { describe, it, expect, beforeAll } from 'vitest';
import { agent } from '../../agents/hello';
import type { AgentContext, SendResponse } from '../../types/agent';

describe('Hello Agent', () => {
  // Test basic properties
  it('should have the correct ID and metadata', () => {
    expect(agent.id).toBe('agent://hello');
    expect(agent.name).toBe('Hello Agent');
    expect(agent.description).toContain('greeting');
    expect(agent.version).toBe('1.0.0');
  });

  // Test skills
  it('should have the greeting skill defined', () => {
    expect(agent.skills).toBeDefined();
    expect(agent.skills?.length).toBe(1);
    
    const skill = agent.skills?.[0];
    expect(skill?.id).toBe('greeting');
    expect(skill?.name).toBe('Greeting');
    expect(skill?.examples?.length).toBeGreaterThan(0);
  });

  // Test handler functionality
  it('should respond to greetings with the extracted name', async () => {
    // Mock context
    const context: AgentContext = {
      taskId: 'test-task-123',
      agentId: agent.id,
      logger: console
    };

    // Test with a simple greeting
    const response1 = await agent.handlers.send(
      {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello there John' }]
        }
      },
      context
    );

    // Check if we got a message response (not an error)
    expect('message' in response1).toBe(true);
    if ('message' in response1) {
      // Verify response contains the name "John"
      expect(response1.message.role).toBe('agent');
      expect(response1.message.parts[0].text).toContain('Hello John');
    }

    // Test with a different name
    const response2 = await agent.handlers.send(
      {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hi from Alice' }]
        }
      },
      context
    );

    // Check if we got a message response
    expect('message' in response2).toBe(true);
    if ('message' in response2) {
      // Verify response contains the name "Alice"
      expect(response2.message.parts[0].text).toContain('Hello Alice');
    }
  });

  // Test empty message handling
  it('should handle empty messages gracefully', async () => {
    const context: AgentContext = {
      taskId: 'test-task-empty',
      agentId: agent.id,
      logger: console
    };

    // Test with an empty message
    const response = await agent.handlers.send(
      {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: '' }]
        }
      },
      context
    );

    // Check if we got a message response
    expect('message' in response).toBe(true);
    if ('message' in response) {
      // Should use default greeting "there"
      expect(response.message.parts[0].text).toContain('Hello there');
    }
  });

  // Test multiple parts handling
  it('should handle messages with multiple parts', async () => {
    const context: AgentContext = {
      taskId: 'test-task-parts',
      agentId: agent.id,
      logger: console
    };

    // Test with multiple parts
    const response = await agent.handlers.send(
      {
        message: {
          role: 'user',
          parts: [
            { type: 'text', text: 'First part' },
            { type: 'text', text: 'Second part with Bob' }
          ]
        }
      },
      context
    );

    // Check if we got a message response
    expect('message' in response).toBe(true);
    if ('message' in response) {
      // Should extract name from the first text part
      expect(response.message.parts[0].text).toContain('Hello part');
    }
  });
}); 