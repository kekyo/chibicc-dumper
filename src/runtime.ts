import {
  builtinFiles as embeddedBuiltinFiles,
  wasmBase64,
} from 'virtual:chibicc-dumper-assets';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const maxTimestampUnixSeconds = 2147483647;

export const compilerPath = '/__chibicc__/chibicc-dumper';
export const builtinIncludeRoot = '/__chibicc__/include';
export const workspaceRoot = '/workspace';

interface EmbeddedBuiltinFile {
  readonly content: string;
  readonly mtimeUnixSeconds: number;
}

export interface RuntimeTextFile {
  readonly content: string;
  readonly mtimeUnixSeconds?: number;
}

export type RuntimeFileSource = string | RuntimeTextFile;

export interface ResolvedFile {
  readonly content: string;
  readonly bytes: Uint8Array;
  readonly mtimeUnixSeconds: number;
}

export interface RuntimeCommandLineOptions {
  readonly argv: readonly string[];
  readonly files: ReadonlyMap<string, ResolvedFile> | undefined;
  readonly hostReadFile:
    | ((path: string) => RuntimeFileSource | undefined)
    | undefined;
  readonly hostWriteFile:
    | ((path: string, content: string) => boolean)
    | undefined;
  readonly hostGetFileTimestamp:
    | ((path: string) => number | undefined)
    | undefined;
  readonly hostEmitWarning: ((message: string) => void) | undefined;
}

export interface RuntimeExecutionResult {
  readonly output: string;
  readonly diagnostic: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | undefined;
}

interface FileResolver {
  readonly getFile: (path: string) => ResolvedFile | undefined;
  readonly writeFile:
    | ((path: string, content: string) => boolean)
    | undefined;
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

export const normalizeSlashes = (value: string): string =>
  value.split('\\').join('/');

export const normalizeVirtualPath = (value: string): string => {
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

export const clampTimestampUnixSeconds = (value: number): number => {
  const normalized = Number.isFinite(value) ? Math.floor(value) : 0;
  if (normalized < 0) {
    return 0;
  }
  if (normalized > maxTimestampUnixSeconds) {
    return maxTimestampUnixSeconds;
  }
  return normalized;
};

export const createResolvedFile = (
  source: RuntimeFileSource,
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

export const createBuiltinFileMap = (): Map<string, ResolvedFile> =>
  new Map(builtinFileMap);

const createFileResolver = (
  options: RuntimeCommandLineOptions,
  files: ReadonlyMap<string, ResolvedFile>
): FileResolver => {
  const cache = new Map<string, ResolvedFile | null>();

  const getFile = (path: string): ResolvedFile | undefined => {
    const existing = files.get(path);
    if (existing) {
      return existing;
    }

    if (cache.has(path)) {
      return cache.get(path) ?? undefined;
    }

    if (!options.hostReadFile) {
      cache.set(path, null);
      return undefined;
    }

    const source = options.hostReadFile(path);
    if (source === undefined) {
      cache.set(path, null);
      return undefined;
    }

    const fallbackTimestamp = clampTimestampUnixSeconds(
      options.hostGetFileTimestamp?.(path) ?? Date.now() / 1000
    );
    const file = createResolvedFile(source, fallbackTimestamp);
    cache.set(path, file);
    return file;
  };

  return {
    getFile,
    writeFile: options.hostWriteFile,
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
      chibicc_host_write_file: (
        pathPtr: number,
        bufferPtr: number,
        length: number
      ): number => {
        if (!fileResolver.writeFile) {
          return 0;
        }

        const memory = requireMemory();
        const path = readCString(memory, pathPtr);
        const content = textDecoder.decode(
          createUint8Array(memory).subarray(bufferPtr, bufferPtr + length)
        );
        return fileResolver.writeFile(path, content) ? 1 : 0;
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

export const executeEmbeddedCommandLine = async (
  options: RuntimeCommandLineOptions
): Promise<RuntimeExecutionResult> => {
  const wasmModule = await getWasmModule();
  const files = options.files ?? createBuiltinFileMap();
  const fileResolver = createFileResolver(options, files);
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

  const argv = createArgv(exports, exports.memory, options.argv);

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

    return {
      output: readUtf8(
        exports.memory,
        exports.chibicc_wasm_get_output_ptr(),
        exports.chibicc_wasm_get_output_len()
      ),
      diagnostic: readUtf8(
        exports.memory,
        exports.chibicc_wasm_get_error_ptr(),
        exports.chibicc_wasm_get_error_len()
      ),
      stdout: textDecoder.decode(concatenateBytes(capture.stdoutChunks)),
      stderr: textDecoder.decode(concatenateBytes(capture.stderrChunks)),
      exitCode,
    };
  } finally {
    argv.dispose();
  }
};
