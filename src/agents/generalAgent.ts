import {
  Experimental_Agent as Agent,
  generateText,
  stepCountIs,
  tool,
  type LanguageModel,
  type LanguageModelUsage,
  type StepResult
} from 'ai';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { designAutomationSuite } from './automationDesigner.js';
import {
  runBrowserAgentTask,
  type BrowserAgentResult,
  type BrowserAgentTask,
  type ToolExecutionTrace as BrowserToolExecutionTrace
} from './browserAgent.js';
import { type PlaywrightControllerOptions } from './playwrightController.js';
import {
  automationPromptInputSchema,
  browserReconInputSchema,
  executionPlanInputSchema,
  listArtifactsInputSchema,
  readArtifactInputSchema,
  shellCommandInputSchema,
  writeArtifactInputSchema,
  type AutomationPromptInput,
  type BrowserReconInput,
  type ExecutionPlanInput,
  type ListArtifactsInput,
  type ReadArtifactInput,
  type ShellCommandInput,
  type WriteArtifactInput
} from '../types/toolSchemas.js';
import { extractJson } from '../util/json.js';
import { truncateText } from '../util/text.js';
import { mergeUsage } from '../util/usage.js';

type ToolExecutionTrace = BrowserToolExecutionTrace;

type CommandResult = {
  command: string;
  args: string[];
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
};

type ArtifactRecord = {
  path: string;
  bytes: number;
  description?: string;
};

export type ExecutionMilestone = {
  title: string;
  objective: string;
  outputs: string[];
  metrics: string[];
};

export type ExecutionRoadmap = {
  mission: string;
  horizon?: string;
  successCriteria: string[];
  risks: string[];
  milestones: ExecutionMilestone[];
};

type PlanSchema = {
  mission: string;
  horizon?: string;
  successCriteria: string[];
  risks: string[];
  milestones: {
    title: string;
    objective: string;
    outputs: string[];
    metrics: string[];
  }[];
};

const commandAllowList = new Set([
  'npm',
  'npx',
  'node',
  'pnpm',
  'yarn',
  'python',
  'python3',
  'pip',
  'uv',
  'ls',
  'cat',
  'pwd',
  'echo',
  'touch',
  'mkdir',
  'rm',
  'cp',
  'mv',
  'grep',
  'sed',
  'tail',
  'head'
]);

const hasDoneSignal = (steps: Array<{ text?: string }>): boolean => {
  const last = steps.at(-1);
  if (!last) {
    return false;
  }
  return /DONE:/i.test(last.text ?? '');
};

const ensureWorkspacePath = (workspaceRoot: string, target: string): string => {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedTarget = path.resolve(workspaceRoot, target);
  const relative = path.relative(resolvedRoot, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path ${target} escapes the configured workspace.`);
  }

  return resolvedTarget;
};

const writeFileSafe = async (
  workspaceRoot: string,
  input: WriteArtifactInput
): Promise<{ path: string; bytes: number }> => {
  const resolved = ensureWorkspacePath(workspaceRoot, input.path);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, input.content, 'utf8');
  return { path: path.relative(workspaceRoot, resolved), bytes: Buffer.byteLength(input.content, 'utf8') };
};

const readFileSafe = async (
  workspaceRoot: string,
  input: ReadArtifactInput
): Promise<{ path: string; content: string; bytes: number }> => {
  const resolved = ensureWorkspacePath(workspaceRoot, input.path);
  const maxBytes = input.maxBytes ?? 100_000;
  const data = await fs.readFile(resolved, 'utf8');
  const truncated = truncateText(data, maxBytes);
  return {
    path: path.relative(workspaceRoot, resolved),
    content: truncated,
    bytes: Buffer.byteLength(truncated, 'utf8')
  };
};

const listFilesSafe = async (
  workspaceRoot: string,
  input: ListArtifactsInput
): Promise<{ entries: { path: string; type: 'file' | 'directory' }[] }> => {
  const start = ensureWorkspacePath(workspaceRoot, input.path ?? '.');
  const limit = input.maxEntries ?? 100;
  const recursive = input.recursive ?? false;
  const results: { path: string; type: 'file' | 'directory' }[] = [];

  const stats = await fs.stat(start);
  if (!stats.isDirectory()) {
    results.push({
      path: path.relative(workspaceRoot, start),
      type: 'file'
    });
    return { entries: results };
  }

  const walk = async (current: string) => {
    const items = await fs.readdir(current, { withFileTypes: true });
    for (const item of items) {
      if (results.length >= limit) {
        return;
      }

      const absolute = path.join(current, item.name);
      const relative = path.relative(workspaceRoot, absolute);

      if (item.isDirectory()) {
        results.push({ path: relative, type: 'directory' });
        if (recursive) {
          await walk(absolute);
        }
      } else {
        results.push({ path: relative, type: 'file' });
      }
    }
  };

  await walk(start);

  return { entries: results };
};

const runAllowedCommand = async (
  workspaceRoot: string,
  input: ShellCommandInput
): Promise<CommandResult> => {
  const command = input.command.trim();
  const executable = path.basename(command);

  if (!commandAllowList.has(executable)) {
    throw new Error(`Command "${command}" is not permitted in the sandbox.`);
  }

  const args = input.args ?? [];
  const cwd = ensureWorkspacePath(workspaceRoot, input.cwd ?? '.');
  const timeoutMs = input.timeoutMs ?? 120_000;

  return await new Promise<CommandResult>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        cwd: path.relative(workspaceRoot, cwd) || '.',
        stdout: truncateText(stdout, 4000),
        stderr: truncateText(stderr, 4000),
        exitCode: typeof code === 'number' ? code : -1,
        timedOut
      });
    });
  });
};

const parseRoadmap = (value: unknown): ExecutionRoadmap => {
  if (!value || typeof value !== 'object') {
    throw new Error('Roadmap response was empty.');
  }

  const candidate = value as Partial<PlanSchema>;
  if (typeof candidate.mission !== 'string') {
    throw new Error('Roadmap missing mission.');
  }

  const toArray = (input: unknown): string[] => {
    if (!Array.isArray(input)) {
      return [];
    }
    return input
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  };

  const milestones = Array.isArray(candidate.milestones)
    ? candidate.milestones
        .map((milestone) => ({
          title: typeof milestone?.title === 'string' ? milestone.title : 'Milestone',
          objective: typeof milestone?.objective === 'string' ? milestone.objective : '',
          outputs: toArray(milestone?.outputs),
          metrics: toArray(milestone?.metrics)
        }))
        .filter((milestone) => milestone.objective.length > 0)
    : [];

  return {
    mission: candidate.mission,
    horizon: typeof candidate.horizon === 'string' ? candidate.horizon : undefined,
    successCriteria: toArray(candidate.successCriteria),
    risks: toArray(candidate.risks),
    milestones
  };
};

export type GeneralAgentTask = {
  goal: string;
  context?: string;
};

export type GeneralAgentOptions = {
  model: LanguageModel;
  controller: PlaywrightControllerOptions;
  workspaceRoot: string;
  maxSteps?: number;
};

export type GeneralAgentResult = {
  summary: string;
  roadmap?: ExecutionRoadmap;
  commandResults: CommandResult[];
  artifacts: ArtifactRecord[];
  toolExecutions: ToolExecutionTrace[];
  usage: LanguageModelUsage;
  browserFindings: BrowserAgentResult[];
};

const buildSystemPrompt = (): string => `You are Vanguard, a world-class general-purpose agent that converts ambitious ideas into executed outcomes.

Follow this operating model:
1. Clarify the mission and constraints. If missing, ask the user.
2. Call the "plan" tool first to outline milestones, deliverables, metrics, and risks.
3. Execute the milestones by leveraging the available tools. Use "browserResearch" for web work, "designAutomation" for workflow design, "runCommand" for sandboxed commands, and the artifact tools to persist results.
4. After each major action, evaluate progress and adjust the plan if new information emerges.
5. When the mission is achieved, summarise outcomes in Markdown with sections "## Summary", "## Executed Steps", "## Artifacts", and "## Next Actions". Use bullet lists with concrete details.
6. End with a final line that begins with "DONE:" followed by the headline result.`;

export const runGeneralAgent = async (
  options: GeneralAgentOptions,
  task: GeneralAgentTask
): Promise<GeneralAgentResult> => {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const toolExecutions: ToolExecutionTrace[] = [];
  const commandResults: CommandResult[] = [];
  const browserFindings: BrowserAgentResult[] = [];
  const artifacts: ArtifactRecord[] = [];
  let roadmap: ExecutionRoadmap | undefined;
  let extraUsage: LanguageModelUsage | undefined;

  const tools = {
    plan: tool<ExecutionPlanInput, ExecutionRoadmap>({
      description: 'Draft an execution roadmap that turns the mission into milestones, outputs, metrics, and risks.',
      inputSchema: executionPlanInputSchema,
      execute: async (input) => {
        const prompt = `You are an operations strategist. Convert the mission into a JSON roadmap.

Mission: ${input.mission}
Desired deliverable: ${input.deliverable ?? 'Follow the mission guidance.'}
Planning horizon: ${input.horizon ?? 'Immediate execution'}
Constraints: ${(input.constraints ?? []).join('; ') || 'None specified'}

Respond with JSON {"mission": string, "horizon": string | null, "successCriteria": string[], "risks": string[], "milestones": [{"title": string, "objective": string, "outputs": string[], "metrics": string[]}]}.
Do not include Markdown.`;

        const response = await generateText({ model: options.model, prompt });
        extraUsage = mergeUsage(extraUsage, response.usage);
        const parsed = extractJson(response.text);
        roadmap = parseRoadmap(parsed);
        return roadmap;
      }
    }),
    browserResearch: tool<BrowserReconInput, BrowserAgentResult>({
      description: 'Investigate a web page to answer a research question and capture findings.',
      inputSchema: browserReconInputSchema,
      execute: async ({ url, question, selector, maxCharacters }) => {
        const browserTask: BrowserAgentTask = {
          goal: question,
          url,
          selector,
          maxCharacters
        };

        const result = await runBrowserAgentTask(
          {
            model: options.model,
            controller: options.controller,
            maxSteps: 6,
            enableReflection: true
          },
          browserTask
        );

        browserFindings.push(result);
        extraUsage = mergeUsage(extraUsage, result.usage);
        return result;
      }
    }),
    designAutomation: tool<
      AutomationPromptInput,
      Awaited<ReturnType<typeof designAutomationSuite>>
    >({
      description: 'Design automation blueprints that connect agents, guardrails, and operating models.',
      inputSchema: automationPromptInputSchema,
      execute: async ({ prompt, channels, languages }) => {
        const result = await designAutomationSuite(options.model, {
          prompt,
          targetChannels: channels,
          preferredLanguages: languages
        });
        extraUsage = mergeUsage(extraUsage, result.usage);
        return result;
      }
    }),
    runCommand: tool<ShellCommandInput, CommandResult>({
      description: 'Execute a sandboxed shell command from the project workspace (allow-listed binaries only).',
      inputSchema: shellCommandInputSchema,
      execute: async (input) => {
        const result = await runAllowedCommand(workspaceRoot, input);
        commandResults.push(result);
        return result;
      }
    }),
    writeArtifact: tool<WriteArtifactInput, { path: string; bytes: number }>({
      description: 'Persist an artifact to the workspace so humans or downstream tools can review it.',
      inputSchema: writeArtifactInputSchema,
      execute: async (input) => {
        const record = await writeFileSafe(workspaceRoot, input);
        artifacts.push({ path: record.path, bytes: record.bytes, description: input.description });
        return record;
      }
    }),
    readArtifact: tool<
      ReadArtifactInput,
      { path: string; content: string; bytes: number }
    >({
      description: 'Read a stored artifact for further reasoning or transformation.',
      inputSchema: readArtifactInputSchema,
      execute: async (input) => readFileSafe(workspaceRoot, input)
    }),
    listArtifacts: tool<
      ListArtifactsInput,
      { entries: { path: string; type: 'file' | 'directory' }[] }
    >({
      description: 'List artifacts within the workspace to understand available resources.',
      inputSchema: listArtifactsInputSchema,
      execute: async (input) => listFilesSafe(workspaceRoot, input)
    })
  };

  const agent = new Agent<typeof tools>({
    model: options.model,
    system: buildSystemPrompt(),
    tools,
    stopWhen: [({ steps }) => hasDoneSignal(steps), stepCountIs(options.maxSteps ?? 14)],
    experimental_context: {
      goal: task.goal,
      context: task.context ?? '',
      workspace: workspaceRoot
    },
    onStepFinish: (step: StepResult<typeof tools>) => {
      step.toolResults.forEach((result) => {
        toolExecutions.push({
          step: toolExecutions.length + 1,
          toolName: result.toolName,
          input: result.input,
          output: result.output
        });
      });
    }
  });

  const userPromptLines = [
    `Mission: ${task.goal}`,
    task.context ? `Context: ${task.context}` : undefined,
    'Operate autonomously until the mission is complete. Use the tools to gather facts and ship tangible outputs.'
  ].filter(Boolean);

  const response = await agent.generate({ prompt: userPromptLines.join('\n') });

  const usage = mergeUsage(response.totalUsage, extraUsage);

  return {
    summary: response.text.trim(),
    roadmap,
    commandResults,
    artifacts,
    toolExecutions,
    usage,
    browserFindings
  };
};

