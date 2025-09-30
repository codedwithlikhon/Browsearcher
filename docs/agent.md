# Agent Architecture

The Browsearcher agent is implemented with the AI SDK v5 `Agent` class so that the language model can iteratively request tools,
execute them via Playwright, and synthesise results. Each run spins up a dedicated `PlaywrightController`, registers typed tools,
then executes the reasoning loop until a completion signal (`DONE:`) is emitted or the step cap is reached.

## Reasoning Loop

1. Build the user prompt with the current task (goal, target URL, selector hints, and character limits).
2. Instantiate an `Agent` with:
   - system prompt enforcing the navigate → extract → summarise workflow,
   - registered tools (`navigate`, `extractText`, `domSnapshot`),
   - `stopWhen` conditions (`DONE:` marker or `stepCountIs(maxSteps)`), and
   - an `onStepFinish` callback that records tool inputs/outputs for auditing.
3. Call `agent.generate` to let the model decide which tool to use next. The AI SDK automatically validates inputs using the
   declared Zod schemas and streams tool results back into the conversation.
4. Produce a Markdown summary that ends with `DONE:` alongside actionable next steps for a free launch.

## Tool Catalogue

| Tool | Purpose | Input Schema | Output |
|------|---------|--------------|--------|
| `navigate` | Launches Playwright at the requested URL and returns the resolved URL + page title. | `navigateInputSchema` (`url` must be a valid URL). | `{ url, title }` |
| `extractText` | Collects normalised inner text from the entire page or a specific selector. | `extractTextInputSchema` (`selector?`, `maxCharacters?`). | `{ text, characters }` |
| `domSnapshot` | Captures the current HTML markup for structural reasoning (truncated to 60 kB). | `domSnapshotInputSchema` (`timeoutMs?`). | `{ html, length }` |

All schemas live in `src/types/toolSchemas.ts`, keeping tool contracts explicit and type-safe.

## Playwright Controller

`src/agents/playwrightController.ts` encapsulates browser lifecycle management. It lazily launches the configured browser,
provides utilities for navigation, text extraction with whitespace sanitisation, DOM snapshots, and ensures contexts are cleaned up
after each run.

## Model Providers

`src/cli/index.ts` selects a provider based on configuration:

- **Google Gemini:** `createGoogleGenerativeAI({ apiKey }).chat(model)`
- **OpenAI:** `createOpenAI({ apiKey }).chat(model)`

The resulting `LanguageModel` instance is passed into `runBrowserAgentTask`, so swapping providers requires only environment changes.

## Safety & Observability

- **Sandboxing:** Playwright runs in headless mode by default; connect to a remote MCP server when additional isolation is needed.
- **Step caps:** `stepCountIs(maxSteps)` prevents unbounded tool loops.
- **Auditing:** Each tool result is captured in a trace array and printed by the CLI for reproducibility.
- **DONE marker:** Forces an explicit completion signal before summarisation to avoid premature termination.
- **Environment flags:** MCP and Browser-Use toggles are environment-driven so production deployments can restrict capabilities.

## Extending the Agent

- Add new tools by defining a Zod schema and registering it with `tool({ ... })`. The AI SDK handles validation and streaming.
- Enable Browser-Use pipelines by exposing a Python service as an external tool—ideal for tasks requiring screenshot analysis.
- Employ `prepareStep` to compress context, switch models mid-run, or gate high-risk tools behind additional conditions.
