import { defineAgent } from '../../types/agent';

export const agent = defineAgent({
  id: 'agent://hello',
  name: 'Hello Agent',
  description: 'A simple agent that responds with a greeting',
  version: '1.0.0',
  
  // Define provider information
  provider: {
    organization: 'Agentopolis',
  },
  
  // Define agent capabilities
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false
  },
  
  // Default input/output modes
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  
  // Define the agent skills
  skills: [
    {
      id: 'greeting',
      name: 'Greeting',
      description: 'Responds with a friendly greeting',
      examples: [
        'Hello',
        'Hi there',
        'How are you?'
      ]
    }
  ],
  
  // Handlers for agent functionality
  handlers: {
    send: async (request, context) => {
      console.log(`Received message from task ${context.taskId}`);
      
      // Simple greeting logic - in a real agent, this would be more sophisticated
      const userName = request.message.parts?.[0]?.text?.split(' ').pop() || 'there';
      
      // Create the response message
      return {
        message: {
          role: 'agent',
          parts: [
            {
              type: 'text',
              text: `Hello ${userName}! I'm the greeting agent. How can I help you today?`
            }
          ]
        }
      };
    }
  }
});
