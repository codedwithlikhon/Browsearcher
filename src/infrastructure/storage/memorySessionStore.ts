import type { TaskSession, TaskStatus } from '../../domain/models.js';

export class MemorySessionStore {
  private readonly sessions = new Map<string, TaskSession>();

  create(session: TaskSession): void {
    this.sessions.set(session.id, session);
  }

  update(sessionId: string, updates: Partial<Omit<TaskSession, 'id'>>): TaskSession {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated: TaskSession = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  setStatus(sessionId: string, status: TaskStatus): TaskSession {
    return this.update(sessionId, { status });
  }

  appendMessage(sessionId: string, message: TaskSession['messages'][number]): TaskSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated: TaskSession = {
      ...session,
      messages: [...session.messages, message],
      updatedAt: Date.now()
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  appendAction(sessionId: string, action: TaskSession['actions'][number]): TaskSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated: TaskSession = {
      ...session,
      actions: [...session.actions, action],
      updatedAt: Date.now()
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  completeAction(sessionId: string, action: TaskSession['actions'][number]): TaskSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const actions = session.actions.map((existing) => {
      if (existing.startedAt === action.startedAt && existing.type === action.type) {
        return { ...existing, ...action };
      }
      return existing;
    });

    const updated: TaskSession = {
      ...session,
      actions,
      updatedAt: Date.now()
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  get(sessionId: string): TaskSession | undefined {
    return this.sessions.get(sessionId);
  }
}

