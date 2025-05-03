import type { Agent, Message, AgentContext } from '../../types/agent';

// Handler to process messages
const handleSend = async (
  payload: { message: Message },
  context: AgentContext
): Promise<{ message: Message } | { error: string }> => {
  console.log(`Received message from task ${context.taskId}`);
  
  try {
    // Get the user message
    const userMessage = payload.message;
    const text = userMessage.parts
      .filter(part => part.type === 'text')
      .map(part => (part as { text: string }).text)
      .join(' ')
      .toLowerCase();
    
    // Get the current time
    const now = new Date();
    
    // Format responses based on the message content
    let response: string;
    
    if (text.includes('unix') || text.includes('timestamp')) {
      response = `The current Unix timestamp is: ${Math.floor(now.getTime() / 1000)}`;
    } else if (text.includes('utc') || text.includes('gmt')) {
      response = `The current UTC time is: ${now.toUTCString()}`;
    } else if (text.includes('iso') || text.includes('format')) {
      response = `The current time in ISO format is: ${now.toISOString()}`;
    } else if (text.includes('local') || text.includes('my time')) {
      response = `The current local time is: ${now.toLocaleString()}`;
    } else {
      response = `The current time is: ${now.toString()}`;
    }
    
    // Return the response
    return {
      message: {
        role: 'agent',
        parts: [
          {
            type: 'text',
            text: response
          }
        ],
        metadata: {
          // Add metadata to match client expectations
          timestamp: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    console.error('Error processing time request:', error);
    return {
      error: `Failed to get the current time: ${(error as Error).message}`
    };
  }
};

// Define the agent
export const agent: Agent = {
  id: 'agent://time',
  name: 'Time Agent',
  description: 'I provide the current time in various formats. Try asking for the time in UTC, local time, ISO format, or Unix timestamp!',
  version: '1.0.0',
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [
    {
      id: 'get-time',
      name: 'Get Current Time',
      description: 'Returns the current time in various formats',
      examples: [
        'What time is it?',
        'Tell me the current UTC time',
        'What is the current Unix timestamp?',
        'Show me the time in ISO format'
      ]
    }
  ],
  handlers: {
    send: handleSend
  }
};
