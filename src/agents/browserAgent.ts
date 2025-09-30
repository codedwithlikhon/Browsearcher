import {
  Experimental_Agent as Agent,
  generateText,
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
import { mergeUsage } from '../util/usage.js';

const DEFAULT_SYSTEM_PROMPT = `You are Browsearcher, an automation specialist that combines AI SDK tools with a Playwright browser.
Follow this workflow:
1. Always call the "navigate" tool with the target URL before attempting extraction.
2. Use "extractText" to gather the most relevant textual snippets (prefer selectors provided by the user).
3. Optionally call "domSnapshot" when HTML structure is required for reasoning.
4. Before you finalise, run a quick self-check to confirm the collected evidence covers the user's goal and note the tests you executed or still need.
5. Synthesize a concise Markdown report with sections for Summary, Tests, and Improvements, each containing actionable bullet points.
Finish your final response with a line that starts with "DONE:" to signal completion.`;

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
  enableReflection?: boolean;
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

const summariseToolTrace = (executions: ToolExecutionTrace[]): string => {
  if (executions.length === 0) {
    return 'No tool executions were recorded.';
  }

  return executions
    .slice(-6)
    .reverse()
    .map((execution, index) => {
      const cappedInput = JSON.stringify(execution.input).slice(0, 200);
      const cappedOutput = JSON.stringify(execution.output).slice(0, 200);
      return `#${index + 1} ${execution.toolName} | input=${cappedInput} | output=${cappedOutput}`;
    })
    .join('\n');
};

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch (error) {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1));
      } catch (innerError) {
        return undefined;
      }
    }
    return undefined;
  }
};

const runReflectionPass = async ({
  model,
  task,
  summary,
  toolExecutions
}: {
  model: LanguageModel;
  task: BrowserAgentTask;
  summary: string;
  toolExecutions: ToolExecutionTrace[];
}): Promise<{ summary: string; usage?: LanguageModelUsage }> => {
  const prompt = `You are Browsearcher's quality analyst. Review the agent's work and, if needed, produce an improved final response.

Goal: ${task.goal}
Target URL: ${task.url}

Tool execution trace (most recent first):
${summariseToolTrace(toolExecutions)}

The agent reported:
"""
${summary}
"""

Requirements:
- Return Markdown with sections "## Summary", "## Tests", and "## Improvements" using concise bullet points.
- Highlight validations already performed. If no automated tests ran, suggest the next best checks.
- Ensure the final line starts with "DONE:" followed by the closing guidance.
- Respond with a JSON object: { "finalSummary": "..." }.`;

  const reflection = await generateText({ model, prompt });
  const parsed = parseJson(reflection.text);

  if (
    parsed &&
    typeof parsed === 'object' &&
    'finalSummary' in parsed &&
    typeof (parsed as Record<string, unknown>).finalSummary === 'string'
  ) {
    const improved = ((parsed as { finalSummary: string }).finalSummary ?? '').trim();
    if (improved) {
      return { summary: improved, usage: reflection.usage };
    }
  }

  const fallback = reflection.text.trim();
  if (fallback) {
    return { summary: fallback, usage: reflection.usage };
  }

  return { summary, usage: reflection.usage };
};

const buildUserPrompt = (task: BrowserAgentTask): string => {
  const lines = [
    `Primary objective: ${task.goal}`,
    `Target URL: ${task.url}`,
    `Preferred selector: ${task.selector ?? 'none provided'}`,
    task.maxCharacters ? `Suggested text budget: ${task.maxCharacters} characters.` : undefined,
    '',
    'Execute the workflow step-by-step. Think aloud only via tool calls. When summarising, produce Markdown with "## Summary", "## Tests", and "## Improvements" sections and actionable bullet points for a free product launch.'
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

    let summary = response.text.trim();
    let usage = mergeUsage(response.totalUsage, undefined);

    if (options.enableReflection !== false) {
      const reflection = await runReflectionPass({
        model: options.model,
        task,
        summary,
        toolExecutions
      });

      if (/DONE:/i.test(reflection.summary)) {
        summary = reflection.summary.trim();
      } else if (/DONE:/i.test(summary)) {
        summary = summary.trim();
      } else {
        summary = `${summary.trim()}\nDONE: Review complete.`;
      }

      usage = mergeUsage(usage, reflection.usage);
    }

    return {
      summary,
      toolExecutions,
      usage
    };
  } finally {
    await controller.close();
  }
};

