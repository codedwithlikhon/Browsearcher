export type AutomationTask = {
  goal: string;
  url: string;
  selector?: string;
  maxCharacters?: number;
};

export type AutomationResult = {
  url: string;
  summary: string;
  extractedText: string;
};
