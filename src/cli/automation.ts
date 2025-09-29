import type { LanguageModelUsage } from 'ai';

import { designAutomationSuite } from '../agents/automationDesigner.js';
import { loadConfig } from '../config/index.js';
import { createModel } from './modelFactory.js';

type AutomationCliFormat = 'human' | 'json';

type AutomationCliOptions = {
  prompt?: string;
  channels?: string[];
  languages?: string[];
  format?: AutomationCliFormat;
};

const splitList = (value: string | undefined): string[] | undefined => {
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const parseArgs = (argv: string[]): AutomationCliOptions => {
  const options: AutomationCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--prompt' && typeof argv[index + 1] === 'string') {
      options.prompt = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--prompt=')) {
      options.prompt = arg.slice('--prompt='.length);
      continue;
    }

    if (arg === '--channels' && typeof argv[index + 1] === 'string') {
      options.channels = splitList(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--channels=')) {
      options.channels = splitList(arg.slice('--channels='.length));
      continue;
    }

    if (arg === '--languages' && typeof argv[index + 1] === 'string') {
      options.languages = splitList(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--languages=')) {
      options.languages = splitList(arg.slice('--languages='.length));
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
      const value = argv[index + 1];
      if (value === 'json' || value === 'human') {
        options.format = value;
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

const ensurePrompt = (prompt: string | undefined): string => {
  if (!prompt || prompt.trim().length === 0) {
    return 'Design automations that delegate repetitive launch tasks to channel-specific copilots.';
  }
  return prompt.trim();
};

const printUsage = (usage: LanguageModelUsage | undefined): void => {
  if (!usage) {
    return;
  }

  const details = usage as Record<string, number | undefined>;
  const parts: string[] = [];

  const maybePush = (label: string) => {
    const value = details[label];
    if (typeof value === 'number') {
      parts.push(`${label}=${value}`);
    }
  };

  maybePush('inputTokens');
  maybePush('outputTokens');
  maybePush('totalTokens');
  maybePush('cachedTokens');

  if (parts.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Token usage:', parts.join(', '));
  }
};

export const runAutomationCli = async (options: AutomationCliOptions = {}): Promise<void> => {
  const config = loadConfig();
  const model = createModel(config);
  const prompt = ensurePrompt(options.prompt);
  const channels = options.channels;
  const languages = options.languages;
  const format: AutomationCliFormat = options.format ?? 'human';

  const result = await designAutomationSuite(model, {
    prompt,
    targetChannels: channels,
    preferredLanguages: languages
  });

  if (format === 'json') {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        executiveSummary: result.executiveSummary,
        automations: result.automations,
        sharedOperatingModel: result.sharedOperatingModel,
        recommendations: result.recommendations,
        usage: result.usage
      })
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.log('\n=== Automation Executive Summary ===');
  // eslint-disable-next-line no-console
  console.log(result.executiveSummary);

  result.automations.forEach((automation, index) => {
    // eslint-disable-next-line no-console
    console.log(`\n=== Automation #${index + 1}: ${automation.title} (${automation.primaryChannel}) ===`);
    // eslint-disable-next-line no-console
    console.log(automation.summary);
    // eslint-disable-next-line no-console
    console.log('\nPersona:', automation.persona);
    // eslint-disable-next-line no-console
    console.log('Target users:', automation.targetUsers);
    // eslint-disable-next-line no-console
    console.log('Prompt template:', automation.promptTemplate);
    // eslint-disable-next-line no-console
    console.log('Key outcomes:', automation.keyOutcomes.join('; '));
    // eslint-disable-next-line no-console
    console.log('Guardrails:', automation.guardrails.join('; '));

    if (automation.workflow.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\nWorkflow:');
      automation.workflow.forEach((stage) => {
        // eslint-disable-next-line no-console
        console.log(`- ${stage.name}: ${stage.goal}`);
        stage.steps.forEach((step) => {
          // eslint-disable-next-line no-console
          console.log(`  • ${step.title} -> ${step.automation}`);
        });
      });
    }

    if (automation.integrations.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\nIntegrations:');
      automation.integrations.forEach((integration) => {
        // eslint-disable-next-line no-console
        console.log(`- ${integration.platform}: ${integration.capability} (trigger: ${integration.trigger})`);
      });
    }

    if (automation.successMetrics.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\nSuccess metrics:');
      automation.successMetrics.forEach((metric) => {
        // eslint-disable-next-line no-console
        console.log(`- ${metric.metric}: ${metric.target} (${metric.measurement})`);
      });
    }

    if (automation.launchChecklist.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\nLaunch checklist:');
      automation.launchChecklist.forEach((item) => {
        // eslint-disable-next-line no-console
        console.log(`- ${item}`);
      });
    }

    if (automation.followUpIdeas.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\nFollow-up ideas:');
      automation.followUpIdeas.forEach((idea) => {
        // eslint-disable-next-line no-console
        console.log(`- ${idea}`);
      });
    }
  });

  if (result.sharedOperatingModel) {
    // eslint-disable-next-line no-console
    console.log('\n=== Shared Operating Model ===');
    // eslint-disable-next-line no-console
    console.log('Ownership:', result.sharedOperatingModel.ownership);
    if (result.sharedOperatingModel.intakeProcess.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Intake process:');
      result.sharedOperatingModel.intakeProcess.forEach((item) => {
        // eslint-disable-next-line no-console
        console.log(`- ${item}`);
      });
    }
    if (result.sharedOperatingModel.communicationCadence.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Communication cadence:');
      result.sharedOperatingModel.communicationCadence.forEach((item) => {
        // eslint-disable-next-line no-console
        console.log(`- ${item}`);
      });
    }
    if (result.sharedOperatingModel.observability.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Observability:');
      result.sharedOperatingModel.observability.forEach((item) => {
        // eslint-disable-next-line no-console
        console.log(`- ${item}`);
      });
    }
  }

  if (result.recommendations.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n=== Program Recommendations ===');
    result.recommendations.forEach((recommendation) => {
      // eslint-disable-next-line no-console
      console.log(`- ${recommendation}`);
    });
  }

  printUsage(result.usage);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  runAutomationCli(options).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Automation design failed:', error);
    process.exitCode = 1;
  });
}
