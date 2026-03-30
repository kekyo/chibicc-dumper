import {
  builtinIncludeRoot,
  clampTimestampUnixSeconds,
  compilerPath,
  createBuiltinFileMap,
  createResolvedFile,
  executeEmbeddedCommandLine,
  normalizeVirtualPath,
  workspaceRoot,
} from './runtime';
import type { ResolvedFile } from './runtime';

interface NormalizedOptions {
  readonly inputPath: string;
  readonly files: ReadonlyMap<string, ResolvedFile>;
  readonly includePaths: readonly string[];
  readonly dumpTokens: boolean;
  readonly dumpAst: boolean;
  readonly hostReadFile:
    | ((path: string) => ChibiccDumperFileSource | undefined)
    | undefined;
  readonly hostGetFileTimestamp:
    | ((path: string) => number | undefined)
    | undefined;
  readonly hostEmitWarning: ((message: string) => void) | undefined;
}

/**
 * Virtual file contents passed into the embedded chibicc instance.
 *
 * @property content UTF-8 source text to expose at the virtual path.
 * @property mtimeUnixSeconds Timestamp used by `__TIMESTAMP__`.
 */
export interface ChibiccDumperFile {
  readonly content: string;
  readonly mtimeUnixSeconds?: number;
}

/**
 * Supported value shapes for virtual files.
 */
export type ChibiccDumperFileSource = string | ChibiccDumperFile;

/**
 * Host callbacks for virtual include and warning handling.
 *
 * @property readFile Synchronous callback used when a file is not found in `files`.
 * @property getFileTimestamp Optional timestamp provider for files returned as raw strings.
 * @property emitWarning Optional warning sink for non-fatal diagnostics.
 * @remarks Callback paths are normalized to absolute POSIX-style virtual paths.
 */
export interface ChibiccDumperHost {
  readonly readFile?: (path: string) => ChibiccDumperFileSource | undefined;
  readonly getFileTimestamp?: (path: string) => number | undefined;
  readonly emitWarning?: (message: string) => void;
}

/**
 * Options for one embedded chibicc-dumper execution.
 *
 * @property inputPath Virtual path of the primary translation unit.
 * @property source Source text of the primary translation unit.
 * @property files Additional virtual files keyed by path.
 * @property includePaths Extra `-I` search paths.
 * @property dumpTokens Enables token JSON output.
 * @property dumpAst Enables AST JSON output.
 * @property host Optional synchronous callbacks for file lookup and warnings.
 * @remarks Each call creates a fresh WASM instance and disposes it after use.
 */
export interface ChibiccDumperRunOptions {
  readonly inputPath: string;
  readonly source: string;
  readonly files?: Readonly<Record<string, ChibiccDumperFileSource>>;
  readonly includePaths?: readonly string[];
  readonly dumpTokens?: boolean;
  readonly dumpAst?: boolean;
  readonly host?: ChibiccDumperHost;
}

/**
 * Embedded runtime metadata.
 *
 * @property targetName emsdk-env target name used to build the raw WASM binary.
 * @property compilerPath Virtual executable path used inside the WASM instance.
 * @property builtinIncludeRoot Builtin include directory exposed to chibicc.
 * @property workspaceRoot Root used for relative user paths.
 * @property wasmEncoding Embedded binary encoding format.
 */
export interface ChibiccDumperBuildInfo {
  readonly targetName: 'chibiccDumper';
  readonly compilerPath: string;
  readonly builtinIncludeRoot: string;
  readonly workspaceRoot: string;
  readonly wasmEncoding: 'base64';
}

/**
 * Structured execution error returned by the embedded runtime.
 *
 * @property diagnostic Fatal diagnostic or trapped stderr text.
 * @property exitCode Exit code when the WASM instance terminated via WASI.
 */
export interface ChibiccDumperRunError extends Error {
  readonly diagnostic: string;
  readonly exitCode: number | undefined;
}

/**
 * Build metadata for the embedded runtime.
 */
export const buildInfo: ChibiccDumperBuildInfo = {
  targetName: 'chibiccDumper',
  compilerPath,
  builtinIncludeRoot,
  workspaceRoot,
  wasmEncoding: 'base64',
};

const normalizeOptions = (
  options: ChibiccDumperRunOptions
): NormalizedOptions => {
  const inputPath = normalizeVirtualPath(options.inputPath);
  const includePaths = (options.includePaths ?? []).map(normalizeVirtualPath);
  const dumpTokens = options.dumpTokens ?? true;
  const dumpAst = options.dumpAst ?? true;

  if (!dumpTokens && !dumpAst) {
    throw new Error('At least one of dumpTokens or dumpAst must be enabled.');
  }

  const overlayFiles = createBuiltinFileMap();
  const defaultTimestamp = clampTimestampUnixSeconds(Date.now() / 1000);

  for (const [path, file] of Object.entries(options.files ?? {})) {
    overlayFiles.set(
      normalizeVirtualPath(path),
      createResolvedFile(file, defaultTimestamp)
    );
  }

  overlayFiles.set(
    inputPath,
    createResolvedFile(
      { content: options.source, mtimeUnixSeconds: defaultTimestamp },
      defaultTimestamp
    )
  );

  return {
    inputPath,
    files: overlayFiles,
    includePaths,
    dumpTokens,
    dumpAst,
    hostReadFile: options.host?.readFile,
    hostGetFileTimestamp: options.host?.getFileTimestamp,
    hostEmitWarning: options.host?.emitWarning,
  };
};

const buildCliArgs = (options: NormalizedOptions): string[] => [
  compilerPath,
  ...(options.dumpTokens ? ['--dump-tokens'] : []),
  ...(options.dumpAst ? ['--dump-ast'] : []),
  ...options.includePaths.map((path) => `-I${path}`),
  options.inputPath,
];

const createRunError = (
  diagnostic: string,
  exitCode: number | undefined
): ChibiccDumperRunError => {
  const error = new Error(diagnostic) as ChibiccDumperRunError;
  error.name = 'ChibiccDumperRunError';
  Object.defineProperty(error, 'diagnostic', {
    value: diagnostic,
    enumerable: true,
  });
  Object.defineProperty(error, 'exitCode', {
    value: exitCode,
    enumerable: true,
  });
  return error;
};

const runEmbeddedCompiler = async (
  options: NormalizedOptions
): Promise<string> => {
  const result = await executeEmbeddedCommandLine({
    argv: buildCliArgs(options),
    files: options.files,
    hostReadFile: options.hostReadFile,
    hostWriteFile: undefined,
    hostGetFileTimestamp: options.hostGetFileTimestamp,
    hostEmitWarning: options.hostEmitWarning,
  });

  if (result.diagnostic) {
    throw createRunError(result.diagnostic, result.exitCode);
  }

  if (result.exitCode !== undefined && result.exitCode !== 0) {
    throw createRunError(
      result.stderr || `WASM exited with code ${result.exitCode}.`,
      result.exitCode
    );
  }

  return result.output || result.stdout;
};

/**
 * Runs the embedded WASM dumper and returns raw JSON text.
 *
 * @param options One-shot execution options.
 * @returns JSON text produced by chibicc-dumper.
 */
export const dumpJson = async (
  options: ChibiccDumperRunOptions
): Promise<string> => await runEmbeddedCompiler(normalizeOptions(options));

/**
 * Runs the embedded WASM dumper and parses the returned JSON.
 *
 * @param options One-shot execution options.
 * @returns Parsed JSON payload.
 */
export const dump = async <T = unknown>(
  options: ChibiccDumperRunOptions
): Promise<T> => JSON.parse(await dumpJson(options)) as T;
