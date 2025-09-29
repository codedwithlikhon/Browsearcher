import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';

import { runBrowserAgentTask } from '../agents/browserAgent.js';
import type { AppConfig } from '../config/index.js';
import type {
  ChatMessage,
  LanguagePreference,
  SessionEvent,
  TaskSession,
  TaskStatus
} from '../domain/models.js';
import { buildSystemPrompt } from '../domain/prompts.js';
import { BrowserToolService } from '../infrastructure/browser/playwrightToolService.js';
import { GeminiLLMService } from '../infrastructure/gemini/geminiLLMService.js';
import { MemorySessionStore } from '../infrastructure/storage/memorySessionStore.js';

export type CreateSessionInput = {
  goal?: string;
  url?: string;
  selector?: string;
  maxCharacters?: number;
  language?: LanguagePreference;
};

export class TaskSessionService {
  private readonly store: MemorySessionStore;
  private readonly llm: GeminiLLMService;
  private readonly config: AppConfig;
  private readonly streams = new Map<string, EventEmitter>();

  constructor(store: MemorySessionStore, llm: GeminiLLMService, config: AppConfig) {
    this.store = store;
    this.llm = llm;
    this.config = config;
  }

  createSession(input: CreateSessionInput = {}): TaskSession {
    const id = nanoid();
    const language: LanguagePreference = input.language ?? 'en';
    const createdAt = Date.now();

    const session: TaskSession = {
      id,
      language,
      goal: input.goal ?? this.config.task.goal,
      createdAt,
      updatedAt: createdAt,
      status: 'pending',
      messages: [
        {
          role: 'user',
          content: input.goal ?? this.config.task.goal,
          timestamp: createdAt
        }
      ],
      actions: []
    };

    this.store.create(session);
    this.ensureStream(id).emit('session-created', { type: 'session-created', session });

    void this.runSession(session.id, {
      language,
      url: input.url ?? this.config.task.url,
      selector: input.selector ?? this.config.task.selector,
      maxCharacters: input.maxCharacters ?? this.config.task.maxCharacters
    });

    return session;
  }

  getSession(sessionId: string): TaskSession | undefined {
    return this.store.get(sessionId);
  }

  getStream(sessionId: string): EventEmitter {
    return this.ensureStream(sessionId);
  }

  private ensureStream(sessionId: string): EventEmitter {
    let stream = this.streams.get(sessionId);
    if (!stream) {
      stream = new EventEmitter();
      this.streams.set(sessionId, stream);
    }
    return stream;
  }

  private emit(sessionId: string, event: SessionEvent): void {
    const stream = this.ensureStream(sessionId);
    stream.emit(event.type, event);
  }

  private updateStatus(sessionId: string, status: TaskStatus): TaskSession {
    const session = this.store.setStatus(sessionId, status);
    this.emit(sessionId, { type: 'session-updated', session });
    return session;
  }

  private async runSession(
    sessionId: string,
    taskOverrides: { language: LanguagePreference; url: string; selector?: string; maxCharacters?: number }
  ): Promise<void> {
    this.updateStatus(sessionId, 'running');

    const session = this.store.get(sessionId);
    if (!session) {
      return;
    }

    const browserService = new BrowserToolService({
      browser: this.config.browserName,
      headless: this.config.headless,
      navigationTimeoutMs: this.config.navigationTimeoutMs
    });

    const handleActionStart = (action: TaskSession['actions'][number]) => {
      const updated = this.store.appendAction(sessionId, action);
      this.emit(sessionId, { type: 'action-started', sessionId, action });
      this.emit(sessionId, { type: 'session-updated', session: updated });
    };

    const handleActionFinish = (action: TaskSession['actions'][number]) => {
      const updated = this.store.completeAction(sessionId, action);
      this.emit(sessionId, { type: 'action-finished', sessionId, action });
      this.emit(sessionId, { type: 'session-updated', session: updated });
    };

    browserService.on('action-started', handleActionStart);
    browserService.on('action-finished', handleActionFinish);

    try {
      const result = await runBrowserAgentTask(
        {
          model: this.llm.getModel(),
          controller: {
            browser: this.config.browserName,
            headless: this.config.headless,
            navigationTimeoutMs: this.config.navigationTimeoutMs
          },
          systemPrompt: buildSystemPrompt(taskOverrides.language),
          controllerFactory: () => browserService
        },
        {
          goal: session.goal,
          url: taskOverrides.url,
          selector: taskOverrides.selector,
          maxCharacters: taskOverrides.maxCharacters
        }
      );

      const completion: ChatMessage = {
        role: 'assistant',
        content: result.summary,
        timestamp: Date.now()
      };

      const updated = this.store.appendMessage(sessionId, completion);
      const finalised = this.store.update(sessionId, {
        summary: result.summary,
        status: 'completed'
      });

      this.emit(sessionId, { type: 'message', sessionId, message: completion });
      this.emit(sessionId, { type: 'session-updated', session: updated });
      this.emit(sessionId, { type: 'session-updated', session: finalised });
    } catch (error) {
      const message: ChatMessage = {
        role: 'assistant',
        content: `Task failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
      this.store.appendMessage(sessionId, message);
      const failed = this.store.update(sessionId, { status: 'failed' });
      this.emit(sessionId, { type: 'message', sessionId, message });
      this.emit(sessionId, { type: 'session-updated', session: failed });
    } finally {
      browserService.off('action-started', handleActionStart);
      browserService.off('action-finished', handleActionFinish);
      await browserService.close();
    }
  }
}

