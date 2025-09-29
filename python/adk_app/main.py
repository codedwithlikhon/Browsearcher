"""Command-line entry point for the Google ADK orchestration layer."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
from dataclasses import asdict
from typing import Any, Dict, List, Optional

from google.adk import Agent
from google.adk.models import Gemini
from google.adk.runners import InMemoryRunner
from google.genai import types

from .tools import BrowserTaskDefaults, build_browser_tool

LOGGER = logging.getLogger(__name__)


def configure_logging(verbose: bool) -> None:
    """Configure global logging based on a verbose flag."""

    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format='%(levelname)s %(name)s: %(message)s')


def content_to_text(content: Optional[types.Content]) -> str:
    """Collate textual parts from a Gemini content payload."""

    if not content or not getattr(content, 'parts', None):
        return ''

    pieces: List[str] = []
    for part in content.parts:
        text = getattr(part, 'text', None)
        if text:
            pieces.append(text)
    return '\n'.join(piece for piece in pieces if piece).strip()


def build_prompt(defaults: BrowserTaskDefaults, extra_instruction: Optional[str]) -> str:
    """Assemble the user-facing instruction for the ADK agent."""

    lines = [
        'Leverage the `run_playwright_research` tool to inspect the configured page '
        'before drafting any conclusions.',
        'After receiving the tool response, produce a concise Markdown summary '
        'with actionable, zero-cost launch steps.',
        "Finish with a line that begins with 'DONE:' summarising the next move.",
        '',
        'Task data:',
        f'- url: {defaults.url}',
        f'- goal: {defaults.goal}',
    ]

    if defaults.selector:
        lines.append(f'- selector: {defaults.selector}')
    if defaults.max_characters is not None:
        lines.append(f'- max_characters: {defaults.max_characters}')
    lines.append(f'- provider: {defaults.provider}')
    if defaults.model:
        lines.append(f'- model: {defaults.model}')

    if extra_instruction:
        lines.extend(['', extra_instruction])

    return '\n'.join(lines)


async def run_adk_session(
    *,
    prompt: str,
    defaults: BrowserTaskDefaults,
    model_name: str,
) -> Dict[str, Any]:
    """Run a single ADK session and return structured diagnostics."""

    tool = build_browser_tool(defaults)
    agent = Agent(
        name='adk-orchestrator',
        instruction=(
            'You coordinate the Browsearcher Playwright research worker. '
            'Always call `run_playwright_research` before replying. '
            "Produce Markdown guidance that keeps the launch free and end with 'DONE:'."
        ),
        model=Gemini(model=model_name),
        tools=[tool],
    )

    runner = InMemoryRunner(agent=agent)
    await runner.session_service.create_session(
        app_name=runner.app_name,
        user_id='user',
        session_id='session',
    )

    user_message = types.Content(role='user', parts=[types.Part(text=prompt)])
    events: List[Any] = []

    async with runner:
        async for event in runner.run_async(
            user_id='user', session_id='session', new_message=user_message
        ):
            events.append(event)

    final_text = ''
    for event in events:
        if event.author == agent.name and event.is_final_response():
            final_text = content_to_text(event.content)
            break

    tool_results: List[Any] = []
    for event in events:
        content = getattr(event, 'content', None)
        if not content or not getattr(content, 'parts', None):
            continue
        for part in content.parts:
            response = getattr(part, 'function_response', None)
            if response and response.name == 'run_playwright_research':
                if response.response is not None:
                    tool_results.append(response.response)

    events_dump = [event.model_dump(mode='json') for event in events]

    return {
        'final_text': final_text,
        'tool_results': tool_results,
        'events': events_dump,
        'prompt': prompt,
        'defaults': asdict(defaults),
        'model': model_name,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Run the Google ADK Browsearcher orchestrator.')
    parser.add_argument('--url', required=True, help='Target URL for the Playwright agent.')
    parser.add_argument('--goal', required=True, help='Research objective for the launch assistant.')
    parser.add_argument('--selector', help='Optional CSS selector for focused extraction.')
    parser.add_argument('--max-chars', type=int, help='Optional character budget for text extraction.')
    parser.add_argument(
        '--provider',
        default=os.environ.get('AI_PROVIDER', 'google'),
        help='LLM provider to use for the Playwright layer (default: google).',
    )
    parser.add_argument(
        '--model',
        default=os.environ.get('ADK_GEMINI_MODEL') or os.environ.get('AI_MODEL'),
        help='Gemini model name for ADK (defaults to gemini-1.5-flash).',
    )
    parser.add_argument(
        '--navigation-timeout-ms',
        type=int,
        help='Override the Playwright navigation timeout.',
    )
    headless_group = parser.add_mutually_exclusive_group()
    headless_group.add_argument('--headless', dest='headless', action='store_true', help='Force headless mode.')
    headless_group.add_argument('--headed', dest='headless', action='store_false', help='Disable headless mode.')
    parser.add_argument('--format', choices=['human', 'json'], default='human', help='Output format (default: human).')
    parser.add_argument('--extra-instruction', help='Additional instruction appended to the user prompt.')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging for debugging.')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    configure_logging(args.verbose)

    headless = True if args.headless is None else args.headless
    model_name = args.model or 'gemini-1.5-flash'

    defaults = BrowserTaskDefaults(
        url=args.url,
        goal=args.goal,
        selector=args.selector,
        max_characters=args.max_chars,
        provider=args.provider,
        model=model_name,
        headless=headless,
        navigation_timeout_ms=args.navigation_timeout_ms,
    )

    prompt = build_prompt(defaults, args.extra_instruction)

    try:
        result = asyncio.run(
            run_adk_session(
                prompt=prompt,
                defaults=defaults,
                model_name=model_name,
            )
        )
    except Exception as exc:  # noqa: BLE001 - surface root cause
        LOGGER.exception('ADK session failed: %s', exc)
        raise SystemExit(1) from exc

    if args.format == 'json':
        print(json.dumps(result, indent=2))
        return

    print('\n=== ADK Agent Summary ===')
    print(result['final_text'] or '<no final response>')

    if result['tool_results']:
        print('\n=== Browser Agent Output ===')
        print(json.dumps(result['tool_results'][-1], indent=2))


if __name__ == '__main__':
    main()
