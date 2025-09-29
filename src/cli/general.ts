import path from 'node:path';

import { runGeneralAgent } from '../agents/generalAgent.js';
import { loadConfig } from '../config/index.js';
import { createModel } from './modelFactory.js';

type OutputFormat = 'human' | 'json';

type GeneralCliOptions = {
  goal?: string;
  context?: string;
  workspace?: string;
  maxSteps?: number;
  format?: OutputFormat;
};

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseArgs = (argv: string[]): GeneralCliOptions => {
  const options: GeneralCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--goal' && typeof argv[index + 1] === 'string') {
      options.goal = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--goal=')) {
      options.goal = arg.slice('--goal='.length);
      continue;
    }

    if (arg === '--context' && typeof argv[index + 1] === 'string') {
      options.context = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--context=')) {
      options.context = arg.slice('--context='.length);
      continue;
    }

    if (arg === '--workspace' && typeof argv[index + 1] === 'string') {
      options.workspace = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--workspace=')) {
      options.workspace = arg.slice('--workspace='.length);
      continue;
    }

    if (arg === '--max-steps' && typeof argv[index + 1] === 'string') {
      options.maxSteps = parseNumber(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--max-steps=')) {
      options.maxSteps = parseNumber(arg.slice('--max-steps='.length));
      continue;
    }

    if (arg === '--json') {
      options.format = 'json';
      continue;
    }

    if (arg === '--human') {
      options.format = 'human';
      continue;
    }

    if (arg === '--format' && typeof argv[index + 1] === 'string') {
      const next = argv[index + 1];
      if (next === 'json' || next === 'human') {
        options.format = next;
      }
      index += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length);
      if (value === 'json' || value === 'human') {
        options.format = value;
      }
      continue;
    }
  }

  return options;
};

const formatUsage = (usage: Record<string, number | undefined>): string => {
  const parts: string[] = [];
  const maybePush = (label: string) => {
    const value = usage[label];
    if (typeof value === 'number') {
      parts.push(`${label}=${value}`);
    }
  };

  maybePush('inputTokens');
  maybePush('outputTokens');
  maybePush('totalTokens');
  maybePush('cachedTokens');

  return parts.join(', ');
};

export const runGeneralCli = async (options: GeneralCliOptions = {}): Promise<void> => {
  const config = loadConfig();
  const model = createModel(config);
  const format: OutputFormat = options.format ?? 'human';

  const goal = (options.goal ?? config.task.goal).trim();
  const context = options.context?.trim();
  const workspaceRoot = path.resolve(
    options.workspace ?? process.env.GENERAL_WORKSPACE ?? process.cwd()
  );

  const result = await runGeneralAgent(
    {
      model,
      controller: {
        browser: config.browserName,
        headless: config.headless,
        navigationTimeoutMs: config.navigationTimeoutMs
      },
      workspaceRoot,
      maxSteps: options.maxSteps
    },
    { goal, context }
  );

  if (format === 'json') {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        summary: result.summary,
        roadmap: result.roadmap,
        commandResults: result.commandResults,
        artifacts: result.artifacts,
        browserFindings: result.browserFindings,
        toolExecutions: result.toolExecutions,
        usage: result.usage
      })
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.log('\n=== Mission Summary ===');
  // eslint-disable-next-line no-console
  console.log(result.summary);

  if (result.roadmap) {
    // eslint-disable-next-line no-console
    console.log('\n=== Execution Roadmap ===');
    // eslint-disable-next-line no-console
    console.log('Mission:', result.roadmap.mission);
    if (result.roadmap.horizon) {
      // eslint-disable-next-line no-console
      console.log('Horizon:', result.roadmap.horizon);
    }
    if (result.roadmap.successCriteria.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Success criteria:');
      result.roadmap.successCriteria.forEach((item) => {
        // eslint-disable-next-line no-console
        console.log(`- ${item}`);
      });
    }
    if (result.roadmap.milestones.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Milestones:');
      result.roadmap.milestones.forEach((milestone, index) => {
        // eslint-disable-next-line no-console
        console.log(`  ${index + 1}. ${milestone.title} — ${milestone.objective}`);
        milestone.outputs.forEach((output) => {
          // eslint-disable-next-line no-console
          console.log(`     • Output: ${output}`);
        });
        milestone.metrics.forEach((metric) => {
          // eslint-disable-next-line no-console
          console.log(`     • Metric: ${metric}`);
        });
      });
    }
    if (result.roadmap.risks.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Risks:');
      result.roadmap.risks.forEach((risk) => {
        // eslint-disable-next-line no-console
        console.log(`- ${risk}`);
      });
    }
  }

  if (result.commandResults.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n=== Command Executions ===');
    result.commandResults.forEach((command) => {
      // eslint-disable-next-line no-console
      console.log(`$ ${command.command} ${command.args.join(' ')}`.trim());
      // eslint-disable-next-line no-console
      console.log(`  cwd=${command.cwd} exitCode=${command.exitCode} timedOut=${command.timedOut}`);
      if (command.stdout) {
        // eslint-disable-next-line no-console
        console.log('  stdout:');
        command.stdout.split('\n').forEach((line) => {
          // eslint-disable-next-line no-console
          console.log(`    ${line}`);
        });
      }
      if (command.stderr) {
        // eslint-disable-next-line no-console
        console.log('  stderr:');
        command.stderr.split('\n').forEach((line) => {
          // eslint-disable-next-line no-console
          console.log(`    ${line}`);
        });
      }
    });
  }

  if (result.artifacts.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n=== Artifacts ===');
    result.artifacts.forEach((artifact) => {
      // eslint-disable-next-line no-console
      console.log(`- ${artifact.path} (${artifact.bytes} bytes)${artifact.description ? ` — ${artifact.description}` : ''}`);
    });
  }

  if (result.browserFindings.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n=== Browser Findings ===');
    result.browserFindings.forEach((finding, index) => {
      // eslint-disable-next-line no-console
      console.log(`Report #${index + 1}:`);
      // eslint-disable-next-line no-console
      console.log(finding.summary);
    });
  }

  if (result.toolExecutions.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n=== Tool Trace ===');
    result.toolExecutions.forEach((execution) => {
      // eslint-disable-next-line no-console
      console.log(
        `#${execution.step} ${execution.toolName} input=${JSON.stringify(execution.input).slice(0, 200)} output=${JSON.stringify(execution.output).slice(0, 200)}`
      );
    });
  }

  const usageDetails = formatUsage(result.usage as Record<string, number | undefined>);
  if (usageDetails) {
    // eslint-disable-next-line no-console
    console.log('\nToken usage:', usageDetails);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  runGeneralCli(options).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('General agent run failed:', error);
    process.exitCode = 1;
  });
}

