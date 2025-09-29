import { chromium, firefox, webkit, type Browser, type BrowserType } from 'playwright';
import type { LlmClient } from '../llm/types.js';
import { sanitiseWhitespace, truncateText } from '../util/text.js';
import type { AutomationResult, AutomationTask } from './types.js';

export type BrowserAutomationAgentOptions = {
  llm: LlmClient;
  browserName: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  navigationTimeoutMs: number;
  systemPrompt?: string;
  onToken?: (chunk: string) => void;
};

const BROWSERS: Record<'chromium' | 'firefox' | 'webkit', BrowserType> = {
  chromium,
  firefox,
  webkit
};

export class BrowserAutomationAgent {
  private readonly options: BrowserAutomationAgentOptions;

  constructor(options: BrowserAutomationAgentOptions) {
    this.options = options;
  }

  async run(task: AutomationTask): Promise<AutomationResult> {
    const browser = await this.launchBrowser();

    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(this.options.navigationTimeoutMs);
      await page.goto(task.url, { waitUntil: 'networkidle' });

      let rawText: string;
      if (task.selector) {
        const locator = page.locator(task.selector);
        await locator.first().waitFor({ state: 'visible', timeout: this.options.navigationTimeoutMs });
        rawText = await locator.allInnerTexts().then((values) => values.join('\n'));
      } else {
        rawText = await page.evaluate(() => document.body?.innerText ?? '');
      }

      const cleaned = sanitiseWhitespace(rawText);
      const trimmed = truncateText(cleaned, task.maxCharacters ?? 4000);

      const summary = await this.options.llm.generate({
        systemPrompt:
          this.options.systemPrompt ??
          'You are an assistant that extracts structured insight from web pages for product launch research.',
        userPrompt: this.buildPrompt(task, trimmed),
        onChunk: this.options.onToken
      });

      return {
        url: page.url(),
        summary,
        extractedText: trimmed
      };
    } finally {
      await browser.close();
    }
  }

  private async launchBrowser(): Promise<Browser> {
    const browserType = BROWSERS[this.options.browserName] ?? chromium;
    return browserType.launch({ headless: this.options.headless });
  }

  private buildPrompt(task: AutomationTask, extracted: string): string {
    return [
      `Goal: ${task.goal}`,
      '---',
      'Extracted content snippet:',
      extracted,
      '---',
      'Provide a concise summary (max 6 bullet points) and highlight any actionable next steps for the launch team.'
    ].join('\n');
  }
}
