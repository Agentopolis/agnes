import { defineAgent } from '@agentopolis/agnes-core';
import handlers from './handlers.ts';

export default defineAgent({
  id: 'agent://faq.local',
  name: 'FAQ Agent',
  memory: true,
  auth: 'optional',
  handlers
});
