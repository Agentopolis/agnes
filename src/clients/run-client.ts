import { A2AClient } from './ai-client';

/**
 * Demo script that shows how to use the A2A client
 * to interact with the A2A server.
 */
async function runDemo() {
  console.log('Starting A2A client demo...');
  console.log('-----------------------------');
  
  // Create client pointed at the running server
  const client = new A2AClient('http://localhost:3000');
  
  try {
    // Step 1: Discover agent
    console.log('\n📋 STEP 1: Discovering agent capabilities...');
    const card = await client.getAgentCard();
    console.log(`Found agent: ${card.name as string}`);
    console.log(`Description: ${card.description as string}`);
    console.log(`Skills: ${(card.skills as any[]).map(s => s.name).join(', ')}`);
    
    // Step 2: Start a conversation
    const taskId = `demo-${Date.now()}`;
    console.log(`\n💬 STEP 2: Starting conversation (Task ID: ${taskId})...`);
    
    // Step 3: Send first message
    console.log('\n🔹 Sending first message...');
    const response1 = await client.sendMessage(
      taskId,
      'Hello! Can you tell me about yourself?'
    );
    
    // Print the response
    printAgentResponse(response1);
    
    // Step 4: Continue the conversation
    console.log('\n🔹 Sending follow-up message...');
    const response2 = await client.sendMessage(
      taskId,
      'What skills do you have?'
    );
    
    // Print the response
    printAgentResponse(response2);
    
    // Step 5: Get conversation history
    console.log('\n📜 STEP 3: Retrieving conversation history...');
    const taskHistory = await client.getTask(taskId);
    
    if ('result' in taskHistory) {
      const result = taskHistory.result as any;
      console.log(`Task status: ${result.status.state}`);
      console.log(`Number of messages: ${result.history.length}`);
      console.log('\nConversation summary:');
      
      // Print a simplified view of the conversation
      result.history.forEach((msg: any, index: number) => {
        console.log(`[${index + 1}] ${msg.role}: ${msg.parts[0].text.substring(0, 60)}...`);
      });
    }
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Error occurred:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

/**
 * Helper function to print agent responses
 */
function printAgentResponse(response: Record<string, unknown>): void {
  if ('result' in response) {
    const result = response.result as any;
    if (result.artifacts && result.artifacts.length > 0) {
      const textPart = result.artifacts[0].parts.find((p: any) => p.type === 'text');
      if (textPart) {
        console.log('\nAgent responded:');
        try {
          // The text might be JSON-stringified, so try to parse it
          const text = JSON.parse(textPart.text);
          console.log(typeof text === 'object' ? JSON.stringify(text, null, 2) : text);
        } catch {
          // If not JSON, just print it directly
          console.log(textPart.text);
        }
      }
    }
  } else if ('error' in response) {
    console.error('Error from server:', response.error);
  }
}

// Run the demo
runDemo().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 