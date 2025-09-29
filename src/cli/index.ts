import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { runBrowserAgentTask, type BrowserAgentResult } from '../agents/browserAgent.js';
import { loadConfig, type AppConfig } from '../config/index.js';

type CliRunFormat = 'human' | 'json';

export type CliRunOptions = {
  format?: CliRunFormat;
};

const createModel = (config: AppConfig): LanguageModel => {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  return google.chat(config.model);
};

const formatUsage = (usage: Record<string, number | undefined>): string => {
  const parts: string[] = [];
  const maybePush = (label: string, value: number | undefined) => {
    if (typeof value === 'number') {
      parts.push(`${label}=${value}`);
    }
  };

  maybePush('inputTokens', usage.inputTokens);
  maybePush('outputTokens', usage.outputTokens);
  maybePush('totalTokens', usage.totalTokens);
  maybePush('cachedTokens', usage.cachedTokens);

  return parts.join(', ');
};

const parseCliArgs = (argv: string[]): CliRunOptions => {
  let format: CliRunFormat | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      format = 'json';
      continue;
    }

    if (arg === '--human') {
      format = 'human';
      continue;
    }

    if (arg === '--format' && typeof argv[index + 1] === 'string') {
      const value = argv[index + 1];
      if (value === 'json' || value === 'human') {
        format = value;
      }
      index += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      const value = arg.split('=')[1];
      if (value === 'json' || value === 'human') {
        format = value;
      }
    }
  }

  return format ? { format } : {};
};

export const runCli = async (options: CliRunOptions = {}): Promise<BrowserAgentResult> => {
  const config = loadConfig();
  const model = createModel(config);
  const format: CliRunFormat = options.format ?? 'human';

  if (config.task.source === 'related-project') {
    // eslint-disable-next-line no-console
    console.info(
      `Resolved task URL ${config.task.url} from Vercel related project ${config.deployment.relatedProject}.`
    );
  } else if (config.task.source === 'default') {
    // eslint-disable-next-line no-console
    console.info(`Task URL defaulted to ${config.task.url}. Provide TASK_URL to override.`);
  }

  if (config.mcp.serverUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      `MCP server configured at ${config.mcp.serverUrl} – remote control support is on the roadmap. Using local Playwright for now.`
    );
  }

  const result = await runBrowserAgentTask(
    {
      model,
      controller: {
        browser: config.browserName,
        headless: config.headless,
        navigationTimeoutMs: config.navigationTimeoutMs
      },
      maxSteps: 8,
      systemPrompt: undefined
    },
    {
      goal: config.task.goal,
      url: config.task.url,
      selector: config.task.selector,
      maxCharacters: config.task.maxCharacters
    }
  );

  if (format === 'json') {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        summary: result.summary,
        toolExecutions: result.toolExecutions,
        usage: result.usage
      })
    );
    return result;
  }

  // eslint-disable-next-line no-console
  console.log('\n=== Agent Summary ===');
  // eslint-disable-next-line no-console
  console.log(result.summary);

  if (result.toolExecutions.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n=== Tool Trace ===');
    result.toolExecutions.forEach((execution, index) => {
      // eslint-disable-next-line no-console
      console.log(`Step ${index + 1}: ${execution.toolName}`);
      // eslint-disable-next-line no-console
      console.log('  Input:', JSON.stringify(execution.input));
      // eslint-disable-next-line no-console
      console.log('  Output:', JSON.stringify(execution.output).slice(0, 800));
    });
  }

  const usageDetails = formatUsage(result.usage as Record<string, number | undefined>);
  if (usageDetails) {
    // eslint-disable-next-line no-console
    console.log('\nToken usage:', usageDetails);
  }

  return result;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  runCli(cliOptions).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Agent run failed:', error);
    process.exitCode = 1;
  });
}
