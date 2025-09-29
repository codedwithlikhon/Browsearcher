# Browsearcher

Browsearcher is a lightweight research agent that pairs [Vercel's AI SDK v5](https://ai-sdk.dev/) with Playwright-driven browser
control. It is designed to explore pages, extract structured content, and produce launch-ready summaries with minimal setup.

## Project Overview

* **AI-first automation:** The agent loop is implemented with the AI SDK `Agent` class so the language model can call typed tools
  for navigation, text extraction, and DOM inspection.
* **Headless browser control:** Playwright manages a sandboxed browser session locally or through the Playwright MCP server.
* **Provider flexibility:** Gemini (Google) is configured by default, with optional OpenAI support for GPT-4o style models.
* **Extensible tooling:** Additional tools—such as Browser-Use workflows or custom MCP integrations—can be layered on top by
  extending the tool schemas.

## Getting Started

1. Install dependencies with `npm install` (Node.js 18+ is recommended).
2. Copy `.env.example` to `.env` and supply your LLM credentials.
3. Run the default research task via `npm run dev`.

Comprehensive setup instructions, tooling guidance, and a development roadmap live in the `docs` directory:

* [`docs/README.md`](docs/README.md) – environment setup, usage, and MCP deployment guidance.
* [`docs/agent.md`](docs/agent.md) – architecture, tool definitions, and safety considerations.
* [`docs/plan.md`](docs/plan.md) – milestones, testing strategy, and future enhancements.
