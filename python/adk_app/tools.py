"""Playwright research tools exposed to Google ADK agents."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from google.adk.tools.function_tool import FunctionTool

LOGGER = logging.getLogger(__name__)
REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class BrowserTaskDefaults:
    """Configuration for a browser research request."""

    url: str
    goal: str
    selector: Optional[str] = None
    max_characters: Optional[int] = None
    provider: str = 'google'
    model: Optional[str] = None
    headless: bool = True
    navigation_timeout_ms: Optional[int] = None


async def run_playwright_research(
    *,
    url: str,
    goal: str,
    selector: Optional[str] = None,
    max_characters: Optional[int] = None,
    provider: str = 'google',
    model: Optional[str] = None,
    headless: bool = True,
    navigation_timeout_ms: Optional[int] = None,
) -> dict[str, Any]:
    """Invoke the TypeScript Playwright agent and return its structured output."""

    env = os.environ.copy()
    env.update(
        {
            'TASK_URL': url,
            'TASK_GOAL': goal,
            'AI_PROVIDER': provider,
            'PLAYWRIGHT_HEADLESS': 'true' if headless else 'false',
        }
    )

    if selector:
        env['TASK_SELECTOR'] = selector
    if max_characters is not None:
        env['TASK_MAX_CHARS'] = str(max_characters)
    if model:
        env['AI_MODEL'] = model
    if navigation_timeout_ms is not None:
        env['NAVIGATION_TIMEOUT_MS'] = str(navigation_timeout_ms)

    process = await asyncio.create_subprocess_exec(
        'npx',
        '--yes',
        'tsx',
        'src/cli/index.ts',
        '--json',
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(REPO_ROOT),
        env=env,
    )

    stdout_bytes, stderr_bytes = await process.communicate()
    stdout_text = stdout_bytes.decode().strip()
    stderr_text = stderr_bytes.decode().strip()

    if stderr_text:
        LOGGER.debug('Playwright CLI stderr: %s', stderr_text)

    if process.returncode != 0:
        raise RuntimeError(
            'Playwright agent failed '
            f'(exit code {process.returncode}): {stderr_text or stdout_text}'
        )

    if not stdout_text:
        raise RuntimeError('Playwright agent produced no output.')

    last_line = stdout_text.splitlines()[-1]
    try:
        payload = json.loads(last_line)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            'Failed to decode Playwright agent output as JSON.'
        ) from exc

    if not isinstance(payload, dict):
        raise RuntimeError('Unexpected payload from Playwright agent.')

    return payload


def build_browser_tool(defaults: BrowserTaskDefaults) -> FunctionTool:
    """Create an ADK function tool seeded with repository defaults."""

    async def _browser_tool(
        url: str = defaults.url,
        goal: str = defaults.goal,
        selector: Optional[str] = defaults.selector,
        max_characters: Optional[int] = defaults.max_characters,
        provider: str = defaults.provider,
        model: Optional[str] = defaults.model,
        headless: bool = defaults.headless,
        navigation_timeout_ms: Optional[int] = defaults.navigation_timeout_ms,
    ) -> dict[str, Any]:
        """Delegate DOM exploration to the TypeScript Playwright agent."""

        return await run_playwright_research(
            url=url,
            goal=goal,
            selector=selector,
            max_characters=max_characters,
            provider=provider,
            model=model,
            headless=headless,
            navigation_timeout_ms=navigation_timeout_ms,
        )

    _browser_tool.__name__ = 'run_playwright_research'
    _browser_tool.__doc__ = (
        'Inspect a web page via the TypeScript Playwright agent and return its'
        ' structured summary.'
    )

    return FunctionTool(_browser_tool)


__all__ = ['BrowserTaskDefaults', 'build_browser_tool', 'run_playwright_research']
