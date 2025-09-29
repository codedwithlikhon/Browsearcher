import {
  Experimental_Agent as Agent,
  stepCountIs,
  tool,
  type LanguageModel,
  type StopCondition,
  type Tool,
  type LanguageModelUsage,
  type StepResult
} from 'ai';
import { PlaywrightController, type PlaywrightControllerOptions } from './playwrightController.js';
import {
  domSnapshotInputSchema,
  extractTextInputSchema,
  navigateInputSchema,
  type DomSnapshotInput,
  type ExtractTextInput,
  type NavigateInput
} from '../types/toolSchemas.js';

const DEFAULT_SYSTEM_PROMPT = `You are Browsearcher, an automation specialist that combines AI SDK tools with a Playwright browser.
Follow this workflow:
1. Always call the \\"navigate\\" tool with the target URL before attempting extraction.
2. Use \\"extractText\\" to gather the most relevant textual snippets (prefer selectors provided by the user).
3. Optionally call \\"domSnapshot\\" when HTML structure is required for reasoning.
4. Synthesize a concise Markdown summary with bullet points and next-step recommendations.
Finish your final response with a line that starts with \\"DONE:\\\" to signal completion.`;

export type BrowserAgentTask = {
  goal: string;
  url: string;
  selector?: string;
  maxCharacters?: number;
};

export type ToolExecutionTrace = {
  step: number;
  toolName: string;
  input: unknown;
  output: unknown;
};

export type BrowserAgentResult = {
  summary: string;
  toolExecutions: ToolExecutionTrace[];
  usage: LanguageModelUsage;
};

export type BrowserAgentOptions = {
  model: LanguageModel;
  controller: PlaywrightControllerOptions;
  systemPrompt?: string;
  maxSteps?: number;
  controllerFactory?: () => {
    navigate: PlaywrightController['navigate'];
    extractText: PlaywrightController['extractText'];
    domSnapshot: PlaywrightController['domSnapshot'];
    close: PlaywrightController['close'];
  };
};

type BrowserToolSet = {
  navigate: Tool<NavigateInput, Awaited<ReturnType<PlaywrightController['navigate']>>>;
  extractText: Tool<ExtractTextInput, Awaited<ReturnType<PlaywrightController['extractText']>>>;
  domSnapshot: Tool<DomSnapshotInput, { html: string; length: number }>;
};

const doneCondition: StopCondition<BrowserToolSet> = ({ steps }) => {
  const last = steps.at(-1);
  if (!last) {
    return false;
  }

  return /DONE:/i.test(last.text ?? '');
};

const buildUserPrompt = (task: BrowserAgentTask): string => {
  const lines = [
    `Primary objective: ${task.goal}`,
    `Target URL: ${task.url}`,
    `Preferred selector: ${task.selector ?? 'none provided'}`,
    task.maxCharacters ? `Suggested text budget: ${task.maxCharacters} characters.` : undefined,
    '',
    'Execute the workflow step-by-step. Think aloud only via tool calls. '
      + 'When summarising, provide actionable insights for launching a product for free.'
  ].filter(Boolean);

  lines.push('', 'Remember to end with "DONE:" once the summary is ready.');

  return lines.join('\n');
};

export const runBrowserAgentTask = async (
  options: BrowserAgentOptions,
  task: BrowserAgentTask
): Promise<BrowserAgentResult> => {
  const controller = options.controllerFactory?.() ?? new PlaywrightController(options.controller);
  const toolExecutions: ToolExecutionTrace[] = [];

  const tools: BrowserToolSet = {
    navigate: tool({
      description: 'Navigate the shared Playwright browser to a URL and return the resolved location and title.',
      inputSchema: navigateInputSchema,
      execute: async ({ url }) => controller.navigate(url)
    }),
    extractText: tool({
      description:
        'Extract normalised text from the current page. Optionally limit the extraction to a CSS selector and character budget.',
      inputSchema: extractTextInputSchema,
      execute: async ({ selector, maxCharacters }) => {
        const fallbackSelector = task.selector;
        const limit = maxCharacters ?? task.maxCharacters;
        return controller.extractText({ selector: selector ?? fallbackSelector, maxCharacters: limit });
      }
    }),
    domSnapshot: tool({
      description: 'Return the current page HTML. Use sparingly for structural reasoning.',
      inputSchema: domSnapshotInputSchema,
      execute: async () => {
        const html = await controller.domSnapshot();
        const trimmed = html.length > 60000 ? `${html.slice(0, 59997)}...` : html;
        return { html: trimmed, length: trimmed.length };
      }
    })
  };

  const agent = new Agent<BrowserToolSet>({
    model: options.model,
    system: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    tools,
    stopWhen: [doneCondition, stepCountIs(options.maxSteps ?? 6)],
    experimental_context: task,
    onStepFinish: (step: StepResult<BrowserToolSet>) => {
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

  try {
    const response = await agent.generate({ prompt: buildUserPrompt(task) });

    return {
      summary: response.text.trim(),
      toolExecutions,
      usage: response.totalUsage
    };
  } finally {
    await controller.close();
  }
};

