import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const RawConfigSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'Set GEMINI_API_KEY in your environment.'),
  GEMINI_MODEL: z.string().optional(),
  PLAYWRIGHT_BROWSER: z.enum(['chromium', 'firefox', 'webkit']).optional(),
  PLAYWRIGHT_HEADLESS: z.string().optional(),
  TASK_URL: z.string().url().optional(),
  TASK_GOAL: z.string().optional(),
  TASK_SELECTOR: z.string().optional(),
  TASK_MAX_CHARS: z.string().optional(),
  NAVIGATION_TIMEOUT_MS: z.string().optional()
});

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

export type AppConfig = {
  geminiApiKey: string;
  geminiModel: string;
  browserName: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  taskUrl: string;
  taskGoal: string;
  taskSelector?: string;
  taskMaxChars?: number;
  navigationTimeoutMs: number;
};

export const loadConfig = (overrides: Partial<Record<keyof AppConfig | string, string>> = {}): AppConfig => {
  const raw = {
    GEMINI_API_KEY: overrides.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '',
    GEMINI_MODEL: overrides.GEMINI_MODEL ?? process.env.GEMINI_MODEL,
    PLAYWRIGHT_BROWSER: overrides.PLAYWRIGHT_BROWSER ?? process.env.PLAYWRIGHT_BROWSER,
    PLAYWRIGHT_HEADLESS: overrides.PLAYWRIGHT_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS,
    TASK_URL: overrides.TASK_URL ?? process.env.TASK_URL,
    TASK_GOAL: overrides.TASK_GOAL ?? process.env.TASK_GOAL,
    TASK_SELECTOR: overrides.TASK_SELECTOR ?? process.env.TASK_SELECTOR,
    TASK_MAX_CHARS: overrides.TASK_MAX_CHARS ?? process.env.TASK_MAX_CHARS,
    NAVIGATION_TIMEOUT_MS:
      overrides.NAVIGATION_TIMEOUT_MS ?? process.env.NAVIGATION_TIMEOUT_MS
  };

  const parsed = RawConfigSchema.parse(raw);

  return {
    geminiApiKey: parsed.GEMINI_API_KEY,
    geminiModel: parsed.GEMINI_MODEL ?? 'gemini-2.5-pro',
    browserName: parsed.PLAYWRIGHT_BROWSER ?? 'chromium',
    headless: toBoolean(parsed.PLAYWRIGHT_HEADLESS, true),
    taskUrl: parsed.TASK_URL ?? 'https://example.com',
    taskGoal:
      parsed.TASK_GOAL ??
      'Summarise the important information from the target page for launch preparation.',
    taskSelector: parsed.TASK_SELECTOR,
    taskMaxChars: toNumber(parsed.TASK_MAX_CHARS, undefined),
    navigationTimeoutMs: toNumber(parsed.NAVIGATION_TIMEOUT_MS, 45000) ?? 45000
  };
};
