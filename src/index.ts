import {
  builtinFiles as embeddedBuiltinFiles,
  wasmBase64,
} from 'virtual:chibicc-dumper-assets';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const maxTimestampUnixSeconds = 2147483647;
const compilerPath = '/__chibicc__/chibicc-dumper';
const builtinIncludeRoot = '/__chibicc__/include';
const workspaceRoot = '/workspace';

interface EmbeddedBuiltinFile {
  readonly content: string;
  readonly mtimeUnixSeconds: number;
}

interface ResolvedFile {
  readonly content: string;
  readonly bytes: Uint8Array;
  readonly mtimeUnixSeconds: number;
}

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

interface FileResolver {
  readonly getFile: (path: string) => ResolvedFile | undefined;
  readonly emitWarning: (message: string) => void;
}

interface WasmExports {
  readonly memory: WebAssembly.Memory;
  readonly malloc: (size: number) => number;
  readonly free: (ptr: number) => void;
  readonly chibicc_wasm_run: (argc: number, argvPtr: number) => number;
  readonly chibicc_wasm_get_output_ptr: () => number;
  readonly chibicc_wasm_get_output_len: () => number;
  readonly chibicc_wasm_get_error_ptr: () => number;
  readonly chibicc_wasm_get_error_len: () => number;
  readonly _initialize: (() => void) | undefined;
}

interface RuntimeCapture {
  readonly stdoutChunks: Uint8Array[];
  readonly stderrChunks: Uint8Array[];
}

interface AllocatedArgv {
  readonly argc: number;
  readonly argvPtr: number;
  readonly dispose: () => void;
}

interface WasiExitError extends Error {
  readonly code: number;
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

const normalizeSlashes = (value: string): string => value.split('\\').join('/');

const normalizeVirtualPath = (value: string): string => {
  const absolute = normalizeSlashes(value).startsWith('/')
    ? normalizeSlashes(value)
    : `${workspaceRoot}/${normalizeSlashes(value)}`;
  const segments = absolute.split('/');
  const normalizedSegments: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      normalizedSegments.pop();
      continue;
    }
    normalizedSegments.push(segment);
  }

  return `/${normalizedSegments.join('/')}`;
};

const clampTimestampUnixSeconds = (value: number): number => {
  const normalized = Number.isFinite(value) ? Math.floor(value) : 0;
  if (normalized < 0) {
    return 0;
  }
  if (normalized > maxTimestampUnixSeconds) {
    return maxTimestampUnixSeconds;
  }
  return normalized;
};

const createResolvedFile = (
  source: ChibiccDumperFileSource,
  fallbackTimestamp: number
): ResolvedFile => {
  const content = typeof source === 'string' ? source : source.content;
  const timestamp =
    typeof source === 'string'
      ? fallbackTimestamp
      : (source.mtimeUnixSeconds ?? fallbackTimestamp);

  return {
    content,
    bytes: textEncoder.encode(content),
    mtimeUnixSeconds: clampTimestampUnixSeconds(timestamp),
  };
};

const builtinFileMap = new Map(
  Object.entries(
    embeddedBuiltinFiles as Readonly<Record<string, EmbeddedBuiltinFile>>
  ).map(([path, file]) => [
    normalizeVirtualPath(path),
    createResolvedFile(file, file.mtimeUnixSeconds),
  ])
);

let wasmModulePromise: Promise<WebAssembly.Module> | undefined;

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

  const overlayFiles = new Map(builtinFileMap);
  const defaultTimestamp = clampTimestampUnixSeconds(Date.now() / 1000);

  for (const [path, file] of Object.entries(options.files ?? {})) {
    overlayFiles.set(
      normalizeVirtualPath(path),
      createResolvedFile(file, defaultTimestamp)
    );
  }

  const sourceFile = createResolvedFile(
    { content: options.source, mtimeUnixSeconds: defaultTimestamp },
    defaultTimestamp
  );
  overlayFiles.set(inputPath, sourceFile);

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

const createFileResolver = (options: NormalizedOptions): FileResolver => {
  const cache = new Map<string, ResolvedFile | null>();

  const getFile = (path: string): ResolvedFile | undefined => {
    const normalizedPath = normalizeVirtualPath(path);
    const existing = options.files.get(normalizedPath);
    if (existing) {
      return existing;
    }

    if (cache.has(normalizedPath)) {
      return cache.get(normalizedPath) ?? undefined;
    }

    if (!options.hostReadFile) {
      cache.set(normalizedPath, null);
      return undefined;
    }

    const source = options.hostReadFile(normalizedPath);
    if (source === undefined) {
      cache.set(normalizedPath, null);
      return undefined;
    }

    const fallbackTimestamp = clampTimestampUnixSeconds(
      options.hostGetFileTimestamp?.(normalizedPath) ?? Date.now() / 1000
    );
    const file = createResolvedFile(source, fallbackTimestamp);
    cache.set(normalizedPath, file);
    return file;
  };

  return {
    getFile,
    emitWarning: (message: string) => {
      options.hostEmitWarning?.(message);
    },
  };
};

const decodeBase64 = (value: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  }

  if (typeof atob === 'function') {
    const decoded = atob(value);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  }

  throw new Error('No base64 decoder is available in this runtime.');
};

const toArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  if (
    value.buffer instanceof ArrayBuffer &&
    value.byteOffset === 0 &&
    value.byteLength === value.buffer.byteLength
  ) {
    return value.buffer;
  }
  return value.slice().buffer;
};

const getWasmModule = async (): Promise<WebAssembly.Module> => {
  if (!wasmModulePromise) {
    wasmModulePromise = WebAssembly.compile(
      toArrayBuffer(decodeBase64(wasmBase64))
    );
  }
  return await wasmModulePromise;
};

const createUint8Array = (memory: WebAssembly.Memory): Uint8Array =>
  new Uint8Array(memory.buffer);

const createDataView = (memory: WebAssembly.Memory): DataView =>
  new DataView(memory.buffer);

const readCString = (memory: WebAssembly.Memory, ptr: number): string => {
  const bytes = createUint8Array(memory);
  let end = ptr;
  while (bytes[end] !== 0) {
    end += 1;
  }
  return textDecoder.decode(bytes.subarray(ptr, end));
};

const readUtf8 = (
  memory: WebAssembly.Memory,
  ptr: number,
  length: number
): string => {
  if (ptr === 0 || length === 0) {
    return '';
  }
  return textDecoder.decode(
    createUint8Array(memory).subarray(ptr, ptr + length)
  );
};

const writeUint32 = (
  memory: WebAssembly.Memory,
  ptr: number,
  value: number
): void => {
  createDataView(memory).setUint32(ptr, value >>> 0, true);
};

const writeBigUint64 = (
  memory: WebAssembly.Memory,
  ptr: number,
  value: bigint
): void => {
  createDataView(memory).setBigUint64(ptr, value, true);
};

const concatenateBytes = (chunks: readonly Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
};

const readIoVectors = (
  memory: WebAssembly.Memory,
  iovsPtr: number,
  iovsLen: number
): Uint8Array => {
  const view = createDataView(memory);
  const memoryBytes = createUint8Array(memory);
  const chunks: Uint8Array[] = [];

  for (let index = 0; index < iovsLen; index += 1) {
    const base = iovsPtr + index * 8;
    const ptr = view.getUint32(base, true);
    const length = view.getUint32(base + 4, true);
    chunks.push(memoryBytes.slice(ptr, ptr + length));
  }

  return concatenateBytes(chunks);
};

const createWasiExitError = (code: number): WasiExitError => {
  const error = new Error(`WASI proc_exit(${code})`) as WasiExitError;
  error.name = 'WasiExitError';
  Object.defineProperty(error, 'code', {
    value: code,
    enumerable: true,
  });
  return error;
};

const isWasiExitError = (value: unknown): value is WasiExitError =>
  value instanceof Error &&
  value.name === 'WasiExitError' &&
  typeof (value as Partial<WasiExitError>).code === 'number';

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

const createImports = (
  fileResolver: FileResolver,
  memoryRef: { current: WebAssembly.Memory | undefined },
  capture: RuntimeCapture
): WebAssembly.Imports => {
  const requireMemory = (): WebAssembly.Memory => {
    if (!memoryRef.current) {
      throw new Error('WASM memory is not available yet.');
    }
    return memoryRef.current;
  };

  const captureFdWrite = (fd: number, bytes: Uint8Array): void => {
    if (fd === 1) {
      capture.stdoutChunks.push(bytes);
      return;
    }
    if (fd === 2) {
      capture.stderrChunks.push(bytes);
    }
  };

  return {
    env: {
      chibicc_host_file_exists: (pathPtr: number): number => {
        const path = readCString(requireMemory(), pathPtr);
        return fileResolver.getFile(path) ? 1 : 0;
      },
      chibicc_host_read_file_size: (pathPtr: number): number => {
        const path = readCString(requireMemory(), pathPtr);
        const file = fileResolver.getFile(path);
        return file ? file.bytes.byteLength : -1;
      },
      chibicc_host_read_file: (
        pathPtr: number,
        bufferPtr: number,
        capacity: number
      ): number => {
        const memory = requireMemory();
        const path = readCString(memory, pathPtr);
        const file = fileResolver.getFile(path);

        if (!file || file.bytes.byteLength > capacity) {
          return -1;
        }

        createUint8Array(memory).set(file.bytes, bufferPtr);
        return file.bytes.byteLength;
      },
      chibicc_host_get_file_timestamp: (pathPtr: number): number => {
        const path = readCString(requireMemory(), pathPtr);
        const file = fileResolver.getFile(path);
        return file ? file.mtimeUnixSeconds : -1;
      },
      chibicc_host_emit_warning: (messagePtr: number): void => {
        fileResolver.emitWarning(readCString(requireMemory(), messagePtr));
      },
      emscripten_notify_memory_growth: (): void => {},
    },
    wasi_snapshot_preview1: {
      proc_exit: (code: number): never => {
        throw createWasiExitError(code);
      },
      clock_time_get: (
        _clockId: number,
        _precision: bigint,
        resultPtr: number
      ): number => {
        writeBigUint64(
          requireMemory(),
          resultPtr,
          BigInt(Date.now()) * 1000000n
        );
        return 0;
      },
      fd_close: (_fd: number): number => 0,
      fd_write: (
        fd: number,
        iovsPtr: number,
        iovsLen: number,
        writtenPtr: number
      ): number => {
        const memory = requireMemory();
        const bytes = readIoVectors(memory, iovsPtr, iovsLen);
        captureFdWrite(fd, bytes);
        writeUint32(memory, writtenPtr, bytes.byteLength);
        return 0;
      },
      fd_read: (
        _fd: number,
        _iovsPtr: number,
        _iovsLen: number,
        readPtr: number
      ): number => {
        writeUint32(requireMemory(), readPtr, 0);
        return 0;
      },
      environ_sizes_get: (countPtr: number, sizePtr: number): number => {
        const memory = requireMemory();
        writeUint32(memory, countPtr, 0);
        writeUint32(memory, sizePtr, 0);
        return 0;
      },
      environ_get: (_environPtr: number, _environBufPtr: number): number => 0,
      fd_seek: (
        _fd: number,
        _offset: bigint,
        _whence: number,
        newOffsetPtr: number
      ): number => {
        writeBigUint64(requireMemory(), newOffsetPtr, 0n);
        return 0;
      },
    },
  };
};

const buildCliArgs = (options: NormalizedOptions): string[] => [
  compilerPath,
  ...(options.dumpTokens ? ['--dump-tokens'] : []),
  ...(options.dumpAst ? ['--dump-ast'] : []),
  ...options.includePaths.map((path) => `-I${path}`),
  options.inputPath,
];

const allocateCString = (
  exports: WasmExports,
  memory: WebAssembly.Memory,
  value: string
): number => {
  const bytes = textEncoder.encode(value);
  const ptr = exports.malloc(bytes.byteLength + 1);

  if (ptr === 0) {
    throw new Error(`malloc failed while allocating "${value}".`);
  }

  const view = createUint8Array(memory);
  view.set(bytes, ptr);
  view[ptr + bytes.byteLength] = 0;
  return ptr;
};

const createArgv = (
  exports: WasmExports,
  memory: WebAssembly.Memory,
  args: readonly string[]
): AllocatedArgv => {
  const stringPtrs: number[] = [];

  try {
    for (const arg of args) {
      stringPtrs.push(allocateCString(exports, memory, arg));
    }

    const argvPtr = exports.malloc((args.length + 1) * 4);
    if (argvPtr === 0) {
      throw new Error('malloc failed while allocating argv.');
    }

    const view = createDataView(memory);
    stringPtrs.forEach((ptr, index) => {
      view.setUint32(argvPtr + index * 4, ptr, true);
    });
    view.setUint32(argvPtr + args.length * 4, 0, true);

    return {
      argc: args.length,
      argvPtr,
      dispose: () => {
        for (const ptr of stringPtrs) {
          exports.free(ptr);
        }
        exports.free(argvPtr);
      },
    };
  } catch (error) {
    for (const ptr of stringPtrs) {
      exports.free(ptr);
    }
    throw error;
  }
};

const runEmbeddedCompiler = async (
  options: NormalizedOptions
): Promise<string> => {
  const wasmModule = await getWasmModule();
  const fileResolver = createFileResolver(options);
  const capture: RuntimeCapture = {
    stdoutChunks: [],
    stderrChunks: [],
  };
  const memoryRef: { current: WebAssembly.Memory | undefined } = {
    current: undefined,
  };
  const imports = createImports(fileResolver, memoryRef, capture);
  const instance = await WebAssembly.instantiate(wasmModule, imports);
  const exports = instance.exports as unknown as WasmExports;
  memoryRef.current = exports.memory;
  exports._initialize?.();

  const argv = createArgv(exports, exports.memory, buildCliArgs(options));

  try {
    let exitCode: number | undefined;

    try {
      exitCode = exports.chibicc_wasm_run(argv.argc, argv.argvPtr);
    } catch (error) {
      if (isWasiExitError(error)) {
        exitCode = error.code;
      } else {
        throw error;
      }
    }

    const output = readUtf8(
      exports.memory,
      exports.chibicc_wasm_get_output_ptr(),
      exports.chibicc_wasm_get_output_len()
    );
    const diagnostic = readUtf8(
      exports.memory,
      exports.chibicc_wasm_get_error_ptr(),
      exports.chibicc_wasm_get_error_len()
    );
    const stdoutText = textDecoder.decode(
      concatenateBytes(capture.stdoutChunks)
    );
    const stderrText = textDecoder.decode(
      concatenateBytes(capture.stderrChunks)
    );

    if (diagnostic) {
      throw createRunError(diagnostic, exitCode);
    }

    if (exitCode !== undefined && exitCode !== 0) {
      throw createRunError(
        stderrText || `WASM exited with code ${exitCode}.`,
        exitCode
      );
    }

    return output || stdoutText;
  } finally {
    argv.dispose();
  }
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
