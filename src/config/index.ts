import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

import { resolveTaskUrl } from './deployment.js';

loadEnv();

const RawConfigSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  PLAYWRIGHT_BROWSER: z.enum(['chromium', 'firefox', 'webkit']).optional(),
  PLAYWRIGHT_HEADLESS: z.string().optional(),
  NAVIGATION_TIMEOUT_MS: z.string().optional(),
  TASK_URL: z.string().url().optional(),
  TASK_GOAL: z.string().optional(),
  TASK_SELECTOR: z.string().optional(),
  TASK_MAX_CHARS: z.string().optional(),
  TASK_RELATED_PROJECT: z.string().optional(),
  TASK_RELATED_PATH: z.string().optional(),
  TASK_DEFAULT_HOST: z.string().optional(),
  MCP_SERVER_URL: z.string().url().optional(),
  MCP_SERVER_TOKEN: z.string().optional(),
  BROWSER_USE_ENABLED: z.string().optional(),
  BROWSER_USE_VISION: z.string().optional()
});

export type AppConfig = {
  apiKey: string;
  model: string;
  browserName: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  navigationTimeoutMs: number;
  task: {
    goal: string;
    url: string;
    selector?: string;
    maxCharacters?: number;
    source: 'explicit' | 'related-project' | 'default' | 'none';
  };
  mcp: {
    serverUrl?: string;
    token?: string;
  };
  browserUse: {
    enabled: boolean;
    vision: boolean;
  };
  deployment: {
    relatedProject?: string;
    relatedHostSource: 'explicit' | 'related-project' | 'default' | 'none';
  };
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  const normalised = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalised)) {
    return true;
  }

  if (['0', 'false', 'no', 'n'].includes(normalised)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
};

const toNumber = (value: string | undefined, fallback: number | undefined): number | undefined => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  throw new Error(`Invalid numeric value: ${value}`);
};

export const loadConfig = (
  overrides: Partial<Record<keyof z.infer<typeof RawConfigSchema>, string>> = {}
): AppConfig => {
  const merged = RawConfigSchema.parse({
    GEMINI_API_KEY: overrides.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY,
    AI_MODEL: overrides.AI_MODEL ?? process.env.AI_MODEL,
    PLAYWRIGHT_BROWSER: overrides.PLAYWRIGHT_BROWSER ?? process.env.PLAYWRIGHT_BROWSER,
    PLAYWRIGHT_HEADLESS: overrides.PLAYWRIGHT_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS,
    NAVIGATION_TIMEOUT_MS:
      overrides.NAVIGATION_TIMEOUT_MS ?? process.env.NAVIGATION_TIMEOUT_MS,
    TASK_URL: overrides.TASK_URL ?? process.env.TASK_URL,
    TASK_GOAL: overrides.TASK_GOAL ?? process.env.TASK_GOAL,
    TASK_SELECTOR: overrides.TASK_SELECTOR ?? process.env.TASK_SELECTOR,
    TASK_MAX_CHARS: overrides.TASK_MAX_CHARS ?? process.env.TASK_MAX_CHARS,
    TASK_RELATED_PROJECT: overrides.TASK_RELATED_PROJECT ?? process.env.TASK_RELATED_PROJECT,
    TASK_RELATED_PATH: overrides.TASK_RELATED_PATH ?? process.env.TASK_RELATED_PATH,
    TASK_DEFAULT_HOST: overrides.TASK_DEFAULT_HOST ?? process.env.TASK_DEFAULT_HOST,
    MCP_SERVER_URL: overrides.MCP_SERVER_URL ?? process.env.MCP_SERVER_URL,
    MCP_SERVER_TOKEN: overrides.MCP_SERVER_TOKEN ?? process.env.MCP_SERVER_TOKEN,
    BROWSER_USE_ENABLED:
      overrides.BROWSER_USE_ENABLED ?? process.env.BROWSER_USE_ENABLED,
    BROWSER_USE_VISION: overrides.BROWSER_USE_VISION ?? process.env.BROWSER_USE_VISION
  });

  const apiKey = merged.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to run the agent.');
  }

  const { url: resolvedTaskUrl, source: taskSource } = resolveTaskUrl({
    explicitUrl: merged.TASK_URL,
    projectName: merged.TASK_RELATED_PROJECT,
    defaultHost: merged.TASK_DEFAULT_HOST ?? process.env.RAILWAY_STATIC_URL,
    path: merged.TASK_RELATED_PATH
  });

  return {
    apiKey,
    model: merged.AI_MODEL ?? 'models/gemini-2.0-flash',
    browserName: merged.PLAYWRIGHT_BROWSER ?? 'chromium',
    headless: toBoolean(merged.PLAYWRIGHT_HEADLESS, true),
    navigationTimeoutMs: toNumber(merged.NAVIGATION_TIMEOUT_MS, 45000) ?? 45000,
    task: {
      goal:
        merged.TASK_GOAL ??
        'Research the page and return the most important actions for a free product launch.',
      url: resolvedTaskUrl,
      selector: merged.TASK_SELECTOR,
      maxCharacters: toNumber(merged.TASK_MAX_CHARS, undefined),
      source: taskSource
    },
    mcp: {
      serverUrl: merged.MCP_SERVER_URL,
      token: merged.MCP_SERVER_TOKEN
    },
    browserUse: {
      enabled: toBoolean(merged.BROWSER_USE_ENABLED, false),
      vision: toBoolean(merged.BROWSER_USE_VISION, true)
    },
    deployment: {
      relatedProject: merged.TASK_RELATED_PROJECT,
      relatedHostSource: taskSource
    }
  };
};
