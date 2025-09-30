import { config as loadEnv } from 'dotenv';

import { TaskSessionService } from './application/taskSessionService.js';
import { loadConfig } from './config/index.js';
import { buildServer } from './interface/http/server.js';
import { GeminiLLMService } from './infrastructure/gemini/geminiLLMService.js';
import { MemorySessionStore } from './infrastructure/storage/memorySessionStore.js';

loadEnv();

const bootstrap = async (): Promise<void> => {
  const config = loadConfig();
  const store = new MemorySessionStore();
  const llm = new GeminiLLMService({ apiKey: config.apiKey, model: config.model });
  const service = new TaskSessionService(store, llm, config);
  const server = buildServer(service);

  const port = Number.parseInt(process.env.PORT ?? '3333', 10);
  await server.listen({ host: '0.0.0.0', port });
};

void bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start HTTP interface', error);
  process.exit(1);
});

