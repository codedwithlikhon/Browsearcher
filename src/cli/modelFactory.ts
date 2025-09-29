import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

import type { AppConfig } from '../config/index.js';

export const createModel = (config: AppConfig): LanguageModel => {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  return google.chat(config.model);
};
