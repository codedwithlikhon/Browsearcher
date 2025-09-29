export type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GenerateParams = {
  systemPrompt?: string;
  userPrompt: string;
  contextMessages?: LlmMessage[];
  onChunk?: (chunk: string) => void;
};

export interface LlmClient {
  generate(params: GenerateParams): Promise<string>;
}
