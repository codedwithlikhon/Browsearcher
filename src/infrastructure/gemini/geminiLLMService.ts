import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type GeminiLLMServiceOptions = {
  apiKey: string;
  model: string;
};

export class GeminiLLMService {
  private readonly model: LanguageModel;

  constructor(options: GeminiLLMServiceOptions) {
    const provider = createGoogleGenerativeAI({ apiKey: options.apiKey });
    this.model = provider.chat(options.model);
  }

  getModel(): LanguageModel {
    return this.model;
  }
}

