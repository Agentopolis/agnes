#!/usr/bin/env node

import { init } from './commands/init.js';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'init') {
  const name = args[1];
  if (!name) {
    console.error('Please provide a directory name, e.g., `agnes init faq-agent`');
    process.exit(1);
  }
  await init(name);
} else {
  console.log('Usage: agnes init <agent-name>');
}
