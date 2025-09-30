import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';

import type { TaskSessionService, CreateSessionInput } from '../../application/taskSessionService.js';
import type { SessionEvent } from '../../domain/models.js';

const createSessionSchema = z.object({
  goal: z.string().optional(),
  url: z.string().url().optional(),
  selector: z.string().optional(),
  maxCharacters: z.number().int().positive().optional(),
  language: z.enum(['en', 'zh']).optional()
});

const eventNames: SessionEvent['type'][] = [
  'session-created',
  'session-updated',
  'action-started',
  'action-finished',
  'message'
];

const sendSseEvent = (reply: FastifyReply, event: SessionEvent): void => {
  const data = JSON.stringify(event);
  reply.raw.write(`id: ${randomUUID()}\n`);
  reply.raw.write(`event: ${event.type}\n`);
  reply.raw.write(`data: ${data}\n\n`);
};

export const buildServer = (service: TaskSessionService): FastifyInstance => {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/sessions', async (request, reply) => {
    const parseResult = createSessionSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      return;
    }

    const session = service.createSession(parseResult.data as CreateSessionInput);
    reply.status(201).send({ session });
  });

  app.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const sessionId = id;
    const session = service.getSession(sessionId);
    if (!session) {
      reply.status(404).send({ error: 'Session not found' });
      return;
    }

    reply.send({ session });
  });

  app.get('/sessions/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const sessionId = id;
    const session = service.getSession(sessionId);
    if (!session) {
      reply.status(404).send({ error: 'Session not found' });
      return;
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    sendSseEvent(reply, { type: 'session-updated', session });

    const stream = service.getStream(sessionId);
    const listeners = new Map<SessionEvent['type'], (event: SessionEvent) => void>();

    eventNames.forEach((eventName) => {
      const handler = (event: SessionEvent) => sendSseEvent(reply, event);
      listeners.set(eventName, handler);
      stream.on(eventName, handler);
    });

    request.raw.on('close', () => {
      listeners.forEach((handler, eventName) => {
        stream.off(eventName, handler);
      });
    });
  });

  return app;
};

