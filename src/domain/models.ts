export type LanguagePreference = 'en' | 'zh';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
};

export type BrowserAction = {
  type: 'navigate' | 'click' | 'type' | 'extract-text' | 'dom-snapshot';
  payload: Record<string, unknown>;
  startedAt: number;
  finishedAt?: number;
  error?: string;
};

export type ShellCommand = {
  command: string;
  cwd: string;
  allowed: boolean;
  output?: string;
  error?: string;
};

export type FileOperation = {
  type: 'read' | 'write' | 'list';
  path: string;
  payload?: string;
};

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type TaskSession = {
  id: string;
  language: LanguagePreference;
  goal: string;
  createdAt: number;
  updatedAt: number;
  status: TaskStatus;
  summary?: string;
  messages: ChatMessage[];
  actions: BrowserAction[];
};

export type SessionEvent =
  | { type: 'session-created'; session: TaskSession }
  | { type: 'session-updated'; session: TaskSession }
  | { type: 'action-started'; sessionId: string; action: BrowserAction }
  | { type: 'action-finished'; sessionId: string; action: BrowserAction }
  | { type: 'message'; sessionId: string; message: ChatMessage };


export type AutomationWorkflowStep = {
  title: string;
  description: string;
  automation: string;
  tools: string[];
  successCriteria: string;
};

export type AutomationWorkflowStage = {
  name: string;
  goal: string;
  steps: AutomationWorkflowStep[];
};

export type AutomationIntegration = {
  platform: string;
  capability: string;
  trigger: string;
  actions: string[];
};

export type AutomationMetric = {
  metric: string;
  target: string;
  measurement: string;
};

export type AutomationBlueprint = {
  id: string;
  title: string;
  summary: string;
  primaryChannel: string;
  targetUsers: string;
  persona: string;
  promptTemplate: string;
  languages: string[];
  pains: string[];
  keyOutcomes: string[];
  workflow: AutomationWorkflowStage[];
  integrations: AutomationIntegration[];
  guardrails: string[];
  launchChecklist: string[];
  successMetrics: AutomationMetric[];
  followUpIdeas: string[];
};

export type AutomationOperatingModel = {
  intakeProcess: string[];
  communicationCadence: string[];
  observability: string[];
  ownership: string;
};

export type AutomationSuite = {
  executiveSummary: string;
  automations: AutomationBlueprint[];
  sharedOperatingModel?: AutomationOperatingModel;
  recommendations: string[];
};
