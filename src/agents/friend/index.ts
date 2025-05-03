import type { Agent, Message, AgentContext } from '../../types/agent';
import OpenAI from 'openai';

// Initialize OpenAI client
// Note: This assumes OPENAI_API_KEY is set in the environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here', // Replace with your actual key or use environment variable
});

// OpenAI message types
type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// The system prompt that instructs the AI to be friendly
const SYSTEM_PROMPT = `You are a friendly AI assistant responding to another AI. 
Your purpose is to be warm, supportive, and engaging. 
Always maintain a positive, cheerful tone.
Offer encouragement and validation.
Keep responses relatively concise but personal and friendly.
If the other AI seems confused or struggling, be especially supportive and helpful.
`;

// Handler to process messages
const handleSend = async (
  payload: { message: Message },
  context: AgentContext
): Promise<{ message: Message } | { error: string }> => {
  console.log(`Received message from task ${context.taskId}`);
  
  try {
    // Get the user message content
    const userMessage = payload.message;
    const messageText = userMessage.parts
      .filter(part => part.type === 'text')
      .map(part => (part as { text: string }).text)
      .join(' ');
    
    // Create the conversation for OpenAI
    const messages: OpenAIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: messageText }
    ];
    
    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 150
    });
    
    // Extract the response text
    const responseText = response.choices[0]?.message?.content || "I'm here to be your friend!";
    
    // Return the friendly response
    return {
      message: {
        role: 'agent',
        parts: [
          {
            type: 'text',
            text: responseText
          }
        ],
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    console.error('Error processing friend request:', error);
    return {
      error: `Failed to generate friendly response: ${(error as Error).message}`
    };
  }
};

// Define the agent
export const agent: Agent = {
  id: 'agent://friend',
  name: 'Friendly Agent',
  description: 'I am a friendly AI assistant that is always supportive and warm. I aim to be a positive presence in your day!',
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
      id: 'be-friendly',
      name: 'Be Friendly',
      description: 'Responds in a warm, supportive, and friendly manner',
      examples: [
        'Hello there!',
        'How are you doing today?',
        'Can you help me feel better?',
        'I need some encouragement'
      ]
    }
  ],
  handlers: {
    send: handleSend
  }
};
