import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, isAbsolute, normalize, relative } from 'node:path';

export type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
};

export type RunCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

const WORKSPACE_ROOT = normalize(
  resolve(process.env.WORKSPACE_ROOT ?? process.cwd())
);

export class CommandValidationError extends Error {}

export const ensureWorkspacePath = (candidate: string): string => {
  const trimmed = candidate.trim();
  if (!trimmed) {
    throw new CommandValidationError('Path argument cannot be empty.');
  }

  const absolutePath = normalize(
    isAbsolute(trimmed) ? trimmed : resolve(WORKSPACE_ROOT, trimmed)
  );

  const workspaceRelative = relative(WORKSPACE_ROOT, absolutePath);
  if (
    workspaceRelative === '' ||
    workspaceRelative === '.' ||
    workspaceRelative === undefined
  ) {
    return absolutePath;
  }

  if (workspaceRelative.startsWith('..') || isAbsolute(workspaceRelative)) {
    throw new CommandValidationError(
      `Path "${candidate}" resolves outside of the workspace.`
    );
  }

  return absolutePath;
};

const HIGH_RISK_COMMANDS = new Set(['rm', 'cp', 'mv', 'python', 'node']);

const DISALLOWED_FLAGS: Record<string, Set<string>> = {
  python: new Set(['-c', '--command', '-m', '-E', '-I', '-S']),
  node: new Set(['-e', '--eval', '-p', '--print', '-i', '--interactive'])
};

const checkDisallowedFlag = (command: string, arg: string) => {
  const flags = DISALLOWED_FLAGS[command];
  if (!flags) {
    return;
  }

  const flagKey = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
  if (flags.has(flagKey)) {
    throw new CommandValidationError(
      `${command} flag "${flagKey}" is not permitted.`
    );
  }
};

const looksLikePath = (value: string): boolean => {
  if (!value || value.startsWith('-')) {
    return false;
  }

  if (value === '.' || value === '..') {
    return true;
  }

  if (value.includes('/') || value.includes('\\')) {
    return true;
  }

  if (isAbsolute(value)) {
    return true;
  }

  if (/[^=]+=/.test(value)) {
    const [, possiblePath] = value.split(/=(.+)/);
    return looksLikePath(possiblePath ?? '');
  }

  if (/\.\w+$/.test(value)) {
    return true;
  }

  if (existsSync(resolve(WORKSPACE_ROOT, value))) {
    return true;
  }

  return false;
};

const sanitiseArgument = (command: string, arg: string): string => {
  checkDisallowedFlag(command, arg);

  if (/[^=]+=/.test(arg)) {
    const [key, rawValue] = arg.split(/=(.+)/);
    if (looksLikePath(rawValue ?? '')) {
      const safeValue = ensureWorkspacePath(rawValue ?? '');
      return `${key}=${safeValue}`;
    }
    if (HIGH_RISK_COMMANDS.has(command)) {
      throw new CommandValidationError(
        `Argument "${arg}" for ${command} cannot be safely validated.`
      );
    }
    return arg;
  }

  if (looksLikePath(arg)) {
    return ensureWorkspacePath(arg);
  }

  if (HIGH_RISK_COMMANDS.has(command) && !arg.startsWith('-')) {
    throw new CommandValidationError(
      `Argument "${arg}" for ${command} cannot be safely validated.`
    );
  }

  return arg;
};

const sanitiseArguments = (command: string, args: string[]): string[] => {
  const sanitised = args.map((arg) => sanitiseArgument(command, arg));

  if (HIGH_RISK_COMMANDS.has(command)) {
    const hasValidatedPath = sanitised.some((value, index) => {
      const original = args[index];
      if (original.startsWith('-')) {
        return false;
      }
      return looksLikePath(original);
    });

    if (!hasValidatedPath) {
      throw new CommandValidationError(
        `${command} requires at least one workspace-relative path argument.`
      );
    }
  }

  return sanitised;
};

export const runAllowedCommand = async (
  command: string,
  args: string[],
  options: RunCommandOptions = {}
): Promise<RunCommandResult> => {
  const sanitisedArgs = sanitiseArguments(command, args);

  return new Promise<RunCommandResult>((resolvePromise, rejectPromise) => {
    const child = spawn(command, sanitisedArgs, {
      cwd: options.cwd ?? WORKSPACE_ROOT,
      env: options.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: options.timeoutMs
    });

    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });

    child.on('close', (code) => {
      resolvePromise({
        stdout,
        stderr,
        exitCode: code
      });
    });
  });
};
