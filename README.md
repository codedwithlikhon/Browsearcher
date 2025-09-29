# Browsearcher

## Research Summary: Building a Human-AI Browser Agent

This repository documents research into combining modern AI tooling to build an end-to-end "human-like" browser agent capable of automating product launches and other complex web tasks. The investigation focused on four pillars: Vercel's AI SDK v5, Playwright and the Chrome DevTools Protocol (CDP), the Browser-Use automation framework, and Google's Gemini models.

### AI SDK v5 (Core & UI)
- **Unified LLM Interface:** The AI SDK Core exposes provider-agnostic helpers (e.g., `generateText`, `streamObject`) that standardize text and structured generation, streaming, and tool invocation across providers.【F:README.md†L6-L12】
- **Redesigned Chat Architecture:** Version 5 separates persisted `UIMessage`s from compact `ModelMessage`s, enabling straightforward history storage and fine-grained streaming of typed data parts and transient status updates.【F:README.md†L12-L15】
- **Agent Primitives:** New `Agent` class, `stopWhen`, and `prepareStep` primitives provide tight control over multi-step agent loops, including dynamic context compression, tool toggling, and termination conditions.【F:README.md†L15-L20】
- **Tooling Enhancements:** Tools now align with the Model Context Protocol via `inputSchema`/`output`, support dynamic definitions, streamable partial inputs/outputs, automatic result insertion, lifecycle hooks, and a global provider option for shared configuration.【F:README.md†L20-L25】
- **Speech Capabilities:** Experimental helpers (`experimental_generateSpeech`, `experimental_transcribe`) unify speech synthesis and transcription across multiple providers for voice-enabled agents.【F:README.md†L25-L27】
- **AI SDK UI Hooks:** Framework-agnostic hooks (`useChat`, `useCompletion`, `useObject`) deliver real-time streaming UIs, modular transports (SSE/WebSockets), and integrations with React, Vue, Svelte, Angular, or external state stores.【F:README.md†L27-L31】

### Browser Automation Stack
- **Browser-Use Framework:** Browser-Use combines an LLM reasoning loop with DOM plus vision analysis and Playwright execution, offering resilient natural-language web automation, customizable tools, and a Gradio-based debugging UI.【F:README.md†L33-L38】
- **Playwright:** Provides cross-browser automation with automatic waits, multi-context isolation, and network interception across Chromium, Firefox, and WebKit, while warning against direct CDP usage unless low-level control is required.【F:README.md†L38-L42】
- **Chrome DevTools Protocol (Optional):** CDP enables fine-grained inspection and control (e.g., network tracing), requiring unique JSON-RPC IDs, `Target.attachToTarget` session management, and caution around experimental APIs.【F:README.md†L42-L46】

### Gemini Integration
- **Streaming Example:** The provided Node/TypeScript snippet demonstrates authenticating with `@google/genai`, configuring `thinkingBudget`, invoking the `gemini-2.5-pro` model via `generateContentStream`, and piping streamed chunks to logs—illustrating how to integrate Gemini responses into the agent's UI loop.【F:README.md†L48-L51】

### Implementation Blueprint
1. **Provider Setup:** Choose and authenticate an LLM provider (Gemini, GPT-4o, Claude 3, or local via Ollama) using environment variables for secrets.【F:README.md†L53-L56】
2. **AI SDK Agent:** Wrap LLM interactions with AI SDK, configure `Agent`, `stopWhen`, `prepareStep`, and define tool schemas for navigation, typing, extraction, or speech features.【F:README.md†L56-L61】
3. **Browser Control:** Leverage Browser-Use for high-level navigation; fall back to raw Playwright/CDP scripts for edge cases; register reusable browser tools accessible by the agent.【F:README.md†L61-L66】
4. **Reasoning Loop:** Iterate: observe browser state → decide tool call → execute → update context; stream outputs to the UI and optionally voice using AI SDK's experimental speech APIs.【F:README.md†L66-L70】
5. **Tooling & Safety:** Enforce sandboxing, prompt-injection safeguards, domain allow/deny lists, human oversight for high-stakes actions, and persistence layers for extracted data.【F:README.md†L70-L74】
6. **Testing & Deployment:** Start with simple automations, expand to multi-step flows, monitor via Browser-Use UI, then package as a service or bot once reliable.【F:README.md†L74-L78】

This synthesis highlights how AI SDK v5's agent loop control, Browser-Use's DOM+vision automation, Playwright/CDP's browser capabilities, and Gemini's streaming responses can be orchestrated to create robust human-AI browser agents tailored for no-cost launch workflows.
