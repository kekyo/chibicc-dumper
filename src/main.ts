#!/usr/bin/env node

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import {
  compilerPath,
  createBuiltinFileMap,
  executeEmbeddedCommandLine,
} from './runtime';

const usageText =
  'chibicc-dumper [--dump-tokens] [--dump-ast] [ -E ] [ -M | -MD ] [ -o <path> ] <file>\n';

interface ParsedCliOptions {
  readonly argv: readonly string[];
  readonly showHelp: boolean;
}

interface CliError extends Error {
  readonly code: number;
}

const createCliError = (message: string): CliError => {
  const error = new Error(message) as CliError;
  error.name = 'CliError';
  Object.defineProperty(error, 'code', {
    value: 1,
    enumerable: true,
  });
  return error;
};

const isIgnoredCompilerOption = (arg: string): boolean =>
  arg.startsWith('-O') ||
  arg.startsWith('-W') ||
  arg.startsWith('-g') ||
  arg.startsWith('-std=') ||
  arg === '-ffreestanding' ||
  arg === '-fno-builtin' ||
  arg === '-fno-omit-frame-pointer' ||
  arg === '-fno-stack-protector' ||
  arg === '-fno-strict-aliasing' ||
  arg === '-m64' ||
  arg === '-mno-red-zone' ||
  arg === '-w';

const writeStderrLine = (value: string): void => {
  process.stderr.write(value.endsWith('\n') ? value : `${value}\n`);
};

const takeValue = (
  args: readonly string[],
  index: number,
  option: string
): { readonly value: string; readonly nextIndex: number } => {
  const value = args[index + 1];
  if (value === undefined) {
    throw createCliError(`missing argument for ${option}`);
  }
  return {
    value,
    nextIndex: index + 1,
  };
};

const validateOptX = (value: string): void => {
  if (value === 'c' || value === 'none') {
    return;
  }
  throw createCliError(`<command line>: unknown argument for -x: ${value}`);
};

const parseCliArgs = (args: readonly string[]): ParsedCliOptions => {
  if (args.includes('--help')) {
    return {
      argv: [],
      showHelp: true,
    };
  }

  const argv: string[] = [];
  const inputPaths: string[] = [];
  let optE = false;
  let optM = false;
  let optMD = false;
  let dumpTokens = false;
  let dumpAst = false;
  let hashmapTest = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--dump-tokens') {
      dumpTokens = true;
      argv.push(arg);
      continue;
    }

    if (arg === '--dump-ast') {
      dumpAst = true;
      argv.push(arg);
      continue;
    }

    if (arg === '-o') {
      const { value, nextIndex } = takeValue(args, index, arg);
      argv.push(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('-o') && arg.length > 2) {
      argv.push(arg);
      continue;
    }

    if (arg === '-E') {
      optE = true;
      argv.push(arg);
      continue;
    }

    if (arg === '-I') {
      const { value, nextIndex } = takeValue(args, index, arg);
      argv.push(`-I${value}`);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('-I') && arg.length > 2) {
      argv.push(arg);
      continue;
    }

    if (arg === '-D') {
      const { value, nextIndex } = takeValue(args, index, arg);
      argv.push(`-D${value}`);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('-D') && arg.length > 2) {
      argv.push(arg);
      continue;
    }

    if (arg === '-U') {
      const { value, nextIndex } = takeValue(args, index, arg);
      argv.push(`-U${value}`);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('-U') && arg.length > 2) {
      argv.push(arg);
      continue;
    }

    if (arg === '-include' || arg === '-idirafter') {
      const { value, nextIndex } = takeValue(args, index, arg);
      argv.push(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg === '-x') {
      const { value, nextIndex } = takeValue(args, index, arg);
      validateOptX(value);
      argv.push(`-x${value}`);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('-x') && arg.length > 2) {
      validateOptX(arg.slice(2));
      argv.push(arg);
      continue;
    }

    if (arg === '-M') {
      optM = true;
      argv.push(arg);
      continue;
    }

    if (arg === '-MF' || arg === '-MT' || arg === '-MQ') {
      const { value, nextIndex } = takeValue(args, index, arg);
      argv.push(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg === '-MP') {
      argv.push(arg);
      continue;
    }

    if (arg === '-MD') {
      optMD = true;
      argv.push(arg);
      continue;
    }

    if (arg === '-MMD') {
      optMD = true;
      argv.push(arg);
      continue;
    }

    if (arg === '-hashmap-test') {
      hashmapTest = true;
      argv.push(arg);
      continue;
    }

    if (isIgnoredCompilerOption(arg)) {
      argv.push(arg);
      continue;
    }

    if (arg.startsWith('-') && arg !== '-') {
      throw createCliError(`unknown argument: ${arg}`);
    }

    inputPaths.push(arg);
    argv.push(arg);
  }

  if (!hashmapTest) {
    if (inputPaths.length === 0) {
      throw createCliError('no input files');
    }

    if (inputPaths.length > 1) {
      throw createCliError('multiple input files are not supported');
    }

    if (!optE && !optM && !optMD && !dumpTokens && !dumpAst) {
      throw createCliError(
        'no output mode specified; use -E, -M, --dump-tokens or --dump-ast'
      );
    }
  }

  return {
    argv,
    showHelp: false,
  };
};

const createHostReadFile = (): ((path: string) => string | undefined) => {
  let stdinContent: string | undefined;
  let stdinRead = false;

  return (path: string): string | undefined => {
    if (path === '-') {
      if (!stdinRead) {
        stdinContent = readFileSync(0, 'utf8');
        stdinRead = true;
      }
      return stdinContent;
    }

    try {
      return readFileSync(path, 'utf8');
    } catch {
      return undefined;
    }
  };
};

const createHostWriteFile = (): ((
  path: string,
  content: string
) => boolean) => {
  return (path: string, content: string): boolean => {
    try {
      writeFileSync(path, content, 'utf8');
      return true;
    } catch {
      return false;
    }
  };
};

const createHostGetFileTimestamp = (): ((
  path: string
) => number | undefined) => {
  return (path: string): number | undefined => {
    if (path === '-') {
      return Math.floor(Date.now() / 1000);
    }

    try {
      return Math.floor(statSync(path).mtimeMs / 1000);
    } catch {
      return undefined;
    }
  };
};

const runCli = async (): Promise<number> => {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (parsed.showHelp) {
    process.stderr.write(usageText);
    return 0;
  }

  const result = await executeEmbeddedCommandLine({
    argv: [compilerPath, ...parsed.argv],
    files: createBuiltinFileMap(),
    hostReadFile: createHostReadFile(),
    hostWriteFile: createHostWriteFile(),
    hostGetFileTimestamp: createHostGetFileTimestamp(),
    hostEmitWarning: (message: string): void => {
      writeStderrLine(message);
    },
  });

  if (result.output) {
    process.stdout.write(result.output);
  }
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.diagnostic) {
    writeStderrLine(result.diagnostic);
  }

  if (result.diagnostic) {
    return result.exitCode ?? 1;
  }
  if (result.exitCode !== undefined) {
    return result.exitCode;
  }
  return 0;
};

void runCli()
  .then((status) => {
    process.exitCode = status;
  })
  .catch((error: unknown) => {
    if (error instanceof Error) {
      writeStderrLine(error.message);
    } else {
      writeStderrLine(String(error));
    }
    process.exitCode = 1;
  });
