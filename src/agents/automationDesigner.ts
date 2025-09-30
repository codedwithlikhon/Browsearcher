import { generateText, type LanguageModel, type LanguageModelUsage } from 'ai';
import { z } from 'zod';

import type {
  AutomationBlueprint,
  AutomationOperatingModel,
  AutomationSuite
} from '../domain/models.js';
import { extractJson } from '../util/json.js';

export type AutomationDesignerTask = {
  prompt: string;
  targetChannels?: string[];
  preferredLanguages?: string[];
};

export type AutomationDesignerResult = AutomationSuite & {
  usage: LanguageModelUsage;
};

const workflowStepSchema = z.object({
  title: z.string(),
  description: z.string(),
  automation: z.string(),
  tools: z.array(z.string()).optional().default([]),
  successCriteria: z.string()
});

const workflowStageSchema = z.object({
  name: z.string(),
  goal: z.string(),
  steps: z.array(workflowStepSchema).optional().default([])
});

const integrationSchema = z.object({
  platform: z.string(),
  capability: z.string(),
  trigger: z.string(),
  actions: z.array(z.string()).optional().default([])
});

const metricSchema = z.object({
  metric: z.string(),
  target: z.string(),
  measurement: z.string()
});

const blueprintSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    primaryChannel: z.string(),
    targetUsers: z.string(),
    persona: z.string(),
    promptTemplate: z.string(),
    languages: z.array(z.string()).optional().default([]),
    pains: z.array(z.string()).optional().default([]),
    keyOutcomes: z.array(z.string()).optional().default([]),
    workflow: z.array(workflowStageSchema).optional().default([]),
    integrations: z.array(integrationSchema).optional().default([]),
    guardrails: z.array(z.string()).optional().default([]),
    launchChecklist: z.array(z.string()).optional().default([]),
    successMetrics: z.array(metricSchema).optional().default([]),
    followUpIdeas: z.array(z.string()).optional().default([])
  })
  .transform((value) => ({
    ...value,
    workflow: value.workflow ?? [],
    integrations: value.integrations ?? [],
    guardrails: value.guardrails ?? [],
    launchChecklist: value.launchChecklist ?? [],
    successMetrics: value.successMetrics ?? [],
    followUpIdeas: value.followUpIdeas ?? []
  }));

const operatingModelSchema = z
  .object({
    intakeProcess: z.array(z.string()).optional().default([]),
    communicationCadence: z.array(z.string()).optional().default([]),
    observability: z.array(z.string()).optional().default([]),
    ownership: z.string().optional().default('Automation program owner')
  })
  .transform((value) => ({
    ...value,
    ownership: value.ownership ?? 'Automation program owner'
  }));

const suiteSchema = z.object({
  executiveSummary: z.string(),
  automations: z.array(blueprintSchema),
  sharedOperatingModel: operatingModelSchema.optional(),
  recommendations: z.array(z.string()).optional().default([])
});

const toArray = (values: string[] | undefined, fallback: string[]): string[] => {
  if (!values || values.length === 0) {
    return fallback;
  }

  return values.map((value) => value.trim()).filter((value) => value.length > 0);
};

const buildPrompt = (task: AutomationDesignerTask): string => {
  const channels = toArray(task.targetChannels, ['Telegram bot', 'Slack bot', 'Email digest']);
  const languages = toArray(task.preferredLanguages, ['en']);

  const sections = [
    'You are an automation program architect who turns business prompts into multi-channel agent blueprints.',
    'Return strictly valid JSON with this shape: {"executiveSummary": string, "automations": AutomationBlueprint[], "sharedOperatingModel": AutomationOperatingModel | null, "recommendations": string[]}.',
    '',
    'AutomationBlueprint fields:',
    '- id (string slug), title, summary, primaryChannel, targetUsers, persona, promptTemplate, languages (array), pains (array), keyOutcomes (array).',
    '- workflow (array) with { name, goal, steps }, and each step has { title, description, automation, tools (array), successCriteria }.',
    '- integrations (array) with { platform, capability, trigger, actions }, guardrails (array), launchChecklist (array), successMetrics (array of { metric, target, measurement }), followUpIdeas (array).',
    '',
    'AutomationOperatingModel fields:',
    '- intakeProcess (array of steps for collecting automation requests).',
    '- communicationCadence (array describing standups, demos, reporting).',
    '- observability (array describing monitoring dashboards, alerts, review rituals).',
    '- ownership (string describing the accountable team or role).',
    '',
    `Use the user prompt: "${task.prompt}".`,
    `Design at least ${channels.length} automation blueprints optimised for these focus channels: ${channels.join(', ')}.`,
    `Ensure every blueprint supports the following languages: ${languages.join(', ')}.`,
    'Each blueprint must explain how the agent collects requirements, executes tasks, tests the workflow, and hands off results.',
    'Include guardrails for safety, privacy, and escalation.',
    'Recommendations should list the next experiments or integrations that will expand the automation program.',
    'Do not include Markdown or commentary outside of the JSON payload.'
  ];

  return sections.join('\n');
};

const validateSuite = (data: unknown): AutomationSuite => {
  const parsed = suiteSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Failed to parse automation suite: ${parsed.error.message}`);
  }

  const suite = parsed.data;
  const automations: AutomationBlueprint[] = suite.automations.map((automation) => ({
    ...automation,
    workflow: automation.workflow ?? [],
    integrations: automation.integrations ?? [],
    guardrails: automation.guardrails ?? [],
    launchChecklist: automation.launchChecklist ?? [],
    successMetrics: automation.successMetrics ?? [],
    followUpIdeas: automation.followUpIdeas ?? []
  }));

  const sharedOperatingModel: AutomationOperatingModel | undefined = suite.sharedOperatingModel
    ? {
        intakeProcess: suite.sharedOperatingModel.intakeProcess ?? [],
        communicationCadence: suite.sharedOperatingModel.communicationCadence ?? [],
        observability: suite.sharedOperatingModel.observability ?? [],
        ownership: suite.sharedOperatingModel.ownership ?? 'Automation program owner'
      }
    : undefined;

  return {
    executiveSummary: suite.executiveSummary,
    automations,
    sharedOperatingModel,
    recommendations: suite.recommendations ?? []
  };
};

export const designAutomationSuite = async (
  model: LanguageModel,
  task: AutomationDesignerTask
): Promise<AutomationDesignerResult> => {
  const response = await generateText({
    model,
    prompt: buildPrompt(task)
  });

  const raw = extractJson(response.text);
  const parsed = validateSuite(raw);

  return {
    ...parsed,
    usage: response.usage ?? {}
  };
};
