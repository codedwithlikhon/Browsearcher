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

