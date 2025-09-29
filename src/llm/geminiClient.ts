import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import type { GenerateParams, LlmClient, LlmMessage } from './types.js';

export type GeminiClientOptions = {
  apiKey: string;
  model: string;
};

const mapMessage = (message: LlmMessage): Content => ({
  role: message.role,
  parts: [{ text: message.content }]
});

export class GeminiClient implements LlmClient {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(options: GeminiClientOptions) {
    this.client = new GoogleGenerativeAI(options.apiKey);
    this.model = options.model;
  }

  async generate(params: GenerateParams): Promise<string> {
    const { systemPrompt, userPrompt, contextMessages = [], onChunk } = params;
    const contents = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt } satisfies LlmMessage] : []),
      ...contextMessages,
      { role: 'user', content: userPrompt } satisfies LlmMessage
    ].map(mapMessage);

    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
      safetySettings: []
    });

    const streamResult = await generativeModel.generateContentStream({ contents });

    let fullText = '';
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (!text) {
        continue;
      }

      fullText += text;
      onChunk?.(text);
    }

    await streamResult.response;

    return fullText.trim();
  }
}
