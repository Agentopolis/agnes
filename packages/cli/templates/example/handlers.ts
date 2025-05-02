import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const faqPath = path.resolve(__dirname, 'faq.md');
const faqText = fs.readFileSync(faqPath, 'utf8');

export default {
  async send(req, ctx) {
    return {
      message: {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `Here are the FAQs:\n\n${faqText}`
          }
        ]
      }
    };
  }
};
