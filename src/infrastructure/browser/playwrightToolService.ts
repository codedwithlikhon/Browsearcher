import { EventEmitter } from 'node:events';

import type { BrowserAction } from '../../domain/models.js';
import {
  PlaywrightController,
  type PlaywrightControllerOptions,
  type NavigationResult,
  type ExtractionResult
} from '../../agents/playwrightController.js';

export type BrowserToolEvents = {
  'action-started': (action: BrowserAction) => void;
  'action-finished': (action: BrowserAction) => void;
};

type EventKeys = keyof BrowserToolEvents;

export class BrowserToolService extends EventEmitter {
  private readonly controller: PlaywrightController;

  constructor(options: PlaywrightControllerOptions) {
    super();
    this.controller = new PlaywrightController(options);
  }

  override on<Event extends EventKeys>(event: Event, listener: BrowserToolEvents[Event]): this {
    return super.on(event, listener);
  }

  override once<Event extends EventKeys>(event: Event, listener: BrowserToolEvents[Event]): this {
    return super.once(event, listener);
  }

  override off<Event extends EventKeys>(event: Event, listener: BrowserToolEvents[Event]): this {
    return super.off(event, listener);
  }

  private trackAction<T>(action: BrowserAction, fn: () => Promise<T>): Promise<T> {
    this.emit('action-started', action);
    return fn()
      .then((result) => {
        this.emit('action-finished', { ...action, finishedAt: Date.now() });
        return result;
      })
      .catch((error: unknown) => {
        this.emit('action-finished', {
          ...action,
          finishedAt: Date.now(),
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      });
  }

  async navigate(url: string): Promise<NavigationResult> {
    const action: BrowserAction = {
      type: 'navigate',
      payload: { url },
      startedAt: Date.now()
    };
    return this.trackAction(action, () => this.controller.navigate(url));
  }

  async extractText(input: { selector?: string; maxCharacters?: number }): Promise<ExtractionResult> {
    const action: BrowserAction = {
      type: 'extract-text',
      payload: input,
      startedAt: Date.now()
    };
    return this.trackAction(action, () => this.controller.extractText(input));
  }

  async domSnapshot(): Promise<string> {
    const action: BrowserAction = {
      type: 'dom-snapshot',
      payload: {},
      startedAt: Date.now()
    };
    return this.trackAction(action, () => this.controller.domSnapshot());
  }

  async close(): Promise<void> {
    await this.controller.close();
  }
}

