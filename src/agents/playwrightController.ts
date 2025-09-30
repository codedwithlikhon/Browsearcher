import { chromium, firefox, webkit, type Browser, type BrowserType, type Page } from 'playwright';
import { sanitiseWhitespace, truncateText } from '../util/text.js';

export type SupportedBrowser = 'chromium' | 'firefox' | 'webkit';

const BROWSER_TYPES: Record<SupportedBrowser, BrowserType> = {
  chromium,
  firefox,
  webkit
};

export type PlaywrightControllerOptions = {
  browser: SupportedBrowser;
  headless: boolean;
  navigationTimeoutMs: number;
};

export type NavigationResult = {
  url: string;
  title: string;
};

export type ExtractionResult = {
  text: string;
  characters: number;
};

export class PlaywrightController {
  private readonly options: PlaywrightControllerOptions;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(options: PlaywrightControllerOptions) {
    this.options = options;
  }

  async navigate(url: string): Promise<NavigationResult> {
    const page = await this.ensurePage();
    await page.goto(url, { waitUntil: 'networkidle' });
    return { url: page.url(), title: await page.title() };
  }

  async extractText({ selector, maxCharacters }: { selector?: string; maxCharacters?: number }): Promise<ExtractionResult> {
    const page = await this.ensurePage();

    if (!page.url()) {
      throw new Error('Navigate to a page before requesting text extraction.');
    }

    let rawText: string;
    if (selector) {
      const locator = page.locator(selector);
      await locator.first().waitFor({ state: 'attached', timeout: this.options.navigationTimeoutMs });
      rawText = (await locator.allInnerTexts()).join('\n');
    } else {
      rawText = await page.evaluate(() => document.body?.innerText ?? '');
    }

    const cleaned = sanitiseWhitespace(rawText);
    const truncated = truncateText(cleaned, maxCharacters ?? Number.POSITIVE_INFINITY);

    return { text: truncated, characters: truncated.length };
  }

  async domSnapshot(): Promise<string> {
    const page = await this.ensurePage();
    if (!page.url()) {
      throw new Error('Navigate to a page before requesting a DOM snapshot.');
    }

    return page.content();
  }

  async close(): Promise<void> {
    await this.page?.context().close();
    await this.browser?.close();
    this.page = null;
    this.browser = null;
  }

  private async ensurePage(): Promise<Page> {
    if (this.page) {
      return this.page;
    }

    const browserType = BROWSER_TYPES[this.options.browser];
    this.browser = await browserType.launch({ headless: this.options.headless });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
    this.page.setDefaultNavigationTimeout(this.options.navigationTimeoutMs);
    return this.page;
  }
}
