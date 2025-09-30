import assert from 'node:assert/strict';

import { runAllowedCommand } from '../src/agents/generalAgent.js';

const run = async () => {
  await assert.rejects(
    () => runAllowedCommand('cat', ['/etc/passwd']),
    /outside of the workspace/i,
    'Accessing absolute system paths should be blocked.'
  );

  await assert.rejects(
    () => runAllowedCommand('cat', ['../secret']),
    /outside of the workspace/i,
    'Navigating above the workspace should be blocked.'
  );

  await assert.rejects(
    () => runAllowedCommand('rm', ['-rf', '../secret']),
    /workspace/i,
    'High-risk commands with unsafe paths should be blocked.'
  );

  const pwdResult = await runAllowedCommand('pwd', []);
  assert.equal(pwdResult.exitCode, 0, 'pwd should execute successfully');

  console.log('All generalAgent security tests passed.');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
