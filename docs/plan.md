# Development Plan

This roadmap captures the staged approach for evolving Browsearcher from a minimal research agent into a production-ready
automation system.

## Milestones

1. **Environment foundation**
   - Finalise Node/TypeScript setup, AI SDK dependencies, and environment schema.
   - Provide reproducible documentation for Playwright MCP deployment (local `npx` and Docker/Termux workflows).
2. **Minimal agent loop**
   - Implement the AI SDK `Agent` with `navigate`, `extractText`, and `domSnapshot` tools.
   - Stream tool traces and usage metrics to the CLI for observability.
3. **Extended tooling**
   - Register additional actions (form filling, file download, structured extraction) as typed tools.
   - Surface Browser-Use workflows as optional external tools for DOM+vision reasoning.
4. **Reliability & safety**
   - Introduce `prepareStep` hooks for context compression, fallback model switching, and tool gating.
   - Add prompt-injection detection, domain allow/deny lists, and human-in-the-loop checkpoints for high-risk tasks.
5. **Deployment**
   - Package Docker images for the agent and the Playwright MCP server.
   - Integrate observability (logging, metrics) and CI pipelines for regression tests.

## Testing Strategy

- **Unit tests:** Cover configuration parsing, utility helpers, and Playwright controller methods.
- **Integration tests:** Use Playwright's test runner or mocked MCP endpoints to validate tool execution paths.
- **Smoke tests:** Run representative tasks against staging sites to verify the end-to-end reasoning loop.
- **Performance baselines:** Track token usage and wall-clock latency to detect regressions after prompt or tool changes.

## Future Enhancements

- Multi-model orchestration (e.g., use Gemini for planning and a faster model for tool repair).
- Speech capabilities via `experimental_generateSpeech`/`experimental_transcribe` for voice-driven agents.
- Persistent memory (file or database-backed) for long-running research campaigns.
- Richer MCP integrations (file systems, vector stores) to extend the agent's action space.
