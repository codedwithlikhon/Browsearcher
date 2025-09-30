import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';

export class BrowserUseInvocationError extends Error {
  readonly executablePath: string;

  constructor(message: string, executablePath: string, options?: ErrorOptions) {
    super(`${message} (executable: ${executablePath})`, options);
    this.name = 'BrowserUseInvocationError';
    this.executablePath = executablePath;
  }
}

export type BrowserUseInvocation = {
  stdout: string;
  stderr: string;
};

export type BrowserUseInvocationOptions = SpawnOptionsWithoutStdio & {
  input?: string;
};

export async function invokeBrowserUse(
  executablePath: string,
  args: string[],
  options: BrowserUseInvocationOptions = {}
): Promise<BrowserUseInvocation> {
  const child = spawn(executablePath, args, {
    ...options,
    stdio: 'pipe'
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  if (options.input && child.stdin) {
    child.stdin.end(options.input);
  }

  const closePromise = new Promise<void>((resolve, reject) => {
    child.once('close', (code, signal) => {
      if (code !== 0) {
        reject(
          new BrowserUseInvocationError(
            `Browser-Use process exited with code ${code}${signal ? ` and signal ${signal}` : ''}`,
            executablePath
          )
        );
        return;
      }

      resolve();
    });
  });

  const errorPromise = new Promise<never>((_, reject) => {
    child.once('error', (error) => {
      reject(
        new BrowserUseInvocationError('Failed to start Browser-Use process', executablePath, {
          cause: error
        })
      );
    });
  });

  try {
    await Promise.race([closePromise, errorPromise]);
  } finally {
    await Promise.allSettled([closePromise, errorPromise]);
  }

  return { stdout, stderr };
}
