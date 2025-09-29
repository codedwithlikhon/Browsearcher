import { BrowserAutomationAgent } from './agent/browserAutomationAgent.js';
import type { AutomationTask } from './agent/types.js';
import { loadConfig } from './config.js';
import { GeminiClient } from './llm/geminiClient.js';

const main = async () => {
  const config = loadConfig();

  const gemini = new GeminiClient({
    apiKey: config.geminiApiKey,
    model: config.geminiModel
  });

  const agent = new BrowserAutomationAgent({
    llm: gemini,
    browserName: config.browserName,
    headless: config.headless,
    navigationTimeoutMs: config.navigationTimeoutMs
  });

  const task: AutomationTask = {
    goal: config.taskGoal,
    url: config.taskUrl,
    selector: config.taskSelector,
    maxCharacters: config.taskMaxChars
  };

  const result = await agent.run(task);

  console.log('\n=== Automation Summary ===');
  console.log(result.summary);
};

main().catch((error) => {
  console.error('Automation failed:', error);
  process.exitCode = 1;
});
