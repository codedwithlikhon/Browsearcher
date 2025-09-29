import { runCli } from './cli/index.js';

runCli().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Agent run failed:', error);
  process.exitCode = 1;
});

export { runCli };
