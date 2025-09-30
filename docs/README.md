# Browsearcher Documentation

Browsearcher orchestrates Vercel's AI SDK v5 with Playwright and optional Browser-Use workflows to automate browser research tasks
with large language models. This guide walks through environment preparation, dependency installation, and day-to-day usage.

## Requirements

- **Node.js 18+ and npm.** Required for the TypeScript agent and AI SDK runtime.
- **Playwright browsers.** Install automatically via npm, or run the Playwright MCP server in a containerised environment.
- **LLM provider credentials.** Gemini (Google) is enabled by default; OpenAI can be switched in via configuration.
- **Optional Python 3.9+** if you plan to launch Browser-Use powered workflows.
- **Optional Docker/QEMU** when deploying inside Termux or other mobile sandboxes.

## Installation

1. Clone the repository and install Node dependencies:

   ```bash
   npm install
   ```

2. Copy the sample environment file and provide API credentials that match your chosen provider:

   ```bash
   cp .env.example .env
   # Edit .env to set GEMINI_API_KEY or OPENAI_API_KEY and adjust task defaults
   ```

3. (Optional) Install Browser-Use and its browser dependencies when you need DOM+vision powered agents:

   ```bash
   pip install browser-use
   playwright install
   ```

4. (Optional) Prepare Docker inside Termux by running a lightweight Alpine VM via QEMU, then install Docker within the VM to host
   headless Playwright MCP containers.

## Running the Agent

Execute the built-in CLI to launch the default research workflow:

```bash
npm run dev
```

The agent will load configuration from `.env`, create the appropriate AI model via the AI SDK, and orchestrate Playwright to
navigate, extract text, and produce a Markdown summary ending with a `DONE:` marker. Tool invocations and token usage are printed to
STDOUT for auditing.

### Switching Providers

Update the `.env` file to choose a different provider and model:

```ini
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

## Playwright MCP Server

Browsearcher can connect to Microsoft's [`@playwright/mcp`](https://www.npmjs.com/package/@playwright/mcp) server instead of
launching browsers locally. Add the server to your MCP configuration with `npx`:

```bash
npx @playwright/mcp@latest --help
```

Or run the official container headlessly (ideal for Termux/Android deployments):

```bash
docker run -d -i --rm --init --pull=always \
  -p 8931:8931 \
  mcr.microsoft.com/playwright/mcp \
  cli.js --headless --browser chromium --no-sandbox --port 8931
```

Expose the MCP endpoint URL via `MCP_SERVER_URL` and, if required, an authentication token through `MCP_SERVER_TOKEN`.

## Browser-Use Workflows

Browser-Use combines LLM reasoning with DOM+vision analysis and Playwright execution. Enable Browser-Use specific behaviour via
environment flags (`BROWSER_USE_ENABLED`, `BROWSER_USE_VISION`) and wire your Python agent as an external tool when richer visual
reasoning is required.

## Troubleshooting

- Ensure Playwright browsers are installed (`npx playwright install`) on first run.
- When running inside restricted environments (Termux, CI), prefer the Docker-based MCP server to avoid missing system libraries.
- Guard API keys carefully; never commit `.env` files to version control.
