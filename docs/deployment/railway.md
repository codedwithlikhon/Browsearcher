# Deploying Browsearcher to Railway

This guide describes how to deploy the Browsearcher automation agent to [Railway](https://railway.com) using the configuration files that live alongside the project source.

## Prerequisites

Before deploying you will need:

- A Railway account connected to GitHub.
- A fork or clone of the Browsearcher repository with the configuration files committed (`railway.json` or `railway.toml`, and `nixpacks.toml`).
- A Gemini API key that the agent can use to access the Google Generative AI APIs.
- Node.js 20+ if you want to verify the build locally before deploying.

## Configure the repository

1. Commit the deployment configuration files that ship with the repository root:
   - `railway.json` (JSON configuration) **or** `railway.toml` (TOML configuration). Both files describe the same deployment, so you can keep the format you prefer.
   - `nixpacks.toml` to ensure Railway installs Chromium and the Playwright runtime Browsearcher relies on.
2. Ensure the production scripts in `package.json` are intact:
   - `npm run build` compiles the TypeScript sources into `dist/`.
   - `npm run start` starts the HTTP interface from the compiled output.
3. Optionally run `npm ci && npm run build` locally to confirm the project builds successfully before pushing to GitHub.

## Create a Railway project

1. Log in to the Railway dashboard and create a **New Project**.
2. Choose **Deploy from GitHub repo** and select the Browsearcher repository.
3. Railway will detect the configuration files in the repository root and use the Nixpacks builder to set up the runtime environment.

## Set environment variables

The agent requires the following runtime configuration:

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Google Generative AI key used by the Gemini client. |
| `AI_MODEL` | ⛔️ (optional) | Override the default Gemini model (`models/gemini-2.0-flash`). |
| `PORT` | ⛔️ (optional) | Overrides Railway's assigned port. When omitted Railway injects the correct value. |
| `PLAYWRIGHT_HEADLESS` | ⛔️ (optional) | Set to `true` to guarantee headless browser runs in production. |

Add the variables through the **Variables** panel in Railway or via the CLI. Sensitive keys such as `GEMINI_API_KEY` should be sealed once they are saved.

## Deploy

1. Trigger a deployment from the Railway dashboard. Railway will:
   - Install dependencies with `npm ci`.
   - Install Chromium using Playwright (`npx playwright install --with-deps chromium`).
   - Build the project with `npm run build`.
   - Start the HTTP service with `npm run start`.
2. Watch the build logs to confirm each step succeeds. The service exposes a `/health` endpoint that Railway uses for health checks and you can visit to confirm the deployment is running.

## Verify and iterate

- Visit the service logs to monitor live sessions and diagnose issues.
- Push new commits to the tracked branch to trigger automatic redeployments.
- Use the Railway CLI (`npm install -g @railway/cli`) if you prefer managing deployments from the terminal.

For more advanced options, refer to the [Railway documentation](https://docs.railway.com) on configuration-as-code, variables, and observability.
