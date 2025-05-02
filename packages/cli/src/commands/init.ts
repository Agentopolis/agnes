import path from 'node:path';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function init(agentName: string) {
  const targetDir = path.resolve(process.cwd(), agentName);

  if (fs.existsSync(targetDir)) {
    console.error(`❌ Directory "${agentName}" already exists.`);
    process.exit(1);
  }

  await fs.mkdirp(targetDir);

  const templateDir = path.resolve(__dirname, '../../templates/example');

  await fs.copy(templateDir, targetDir);

  console.log(`✅ Agent "${agentName}" created!`);
}
