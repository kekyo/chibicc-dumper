import { readdirSync, readFileSync, statSync } from 'fs';
import { posix, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import { Plugin, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import emsdkEnv from 'emsdk-env/vite';
import prettierMax from 'prettier-max';
import screwUp from 'screw-up';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const source = (path: string) => resolve(rootDir, path);
const embeddedAssetsVirtualId = 'virtual:chibicc-dumper-assets';
const embeddedAssetsResolvedVirtualId = `\0${embeddedAssetsVirtualId}`;
const embeddedBuiltinIncludeRoot = '/__chibicc__/include';
const cliShebang = '#!/usr/bin/env node';

interface EmbeddedBuiltinFile {
  readonly content: string;
  readonly mtimeUnixSeconds: number;
}

const walkFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }
    if (entry.isFile()) {
      return [entryPath];
    }
    return [];
  });

const createEmbeddedAssetsPlugin = (): Plugin => ({
  name: 'embedded-chibicc-dumper-assets',
  resolveId: (id) =>
    id === embeddedAssetsVirtualId ? embeddedAssetsResolvedVirtualId : null,
  load: (id) => {
    if (id !== embeddedAssetsResolvedVirtualId) {
      return null;
    }

    const wasmPath = source('src/wasm/chibicc-dumper.wasm');
    const includeDirectory = source('include');
    const builtinFiles = Object.fromEntries(
      walkFiles(includeDirectory).map((filePath) => {
        const relativePath = relative(includeDirectory, filePath)
          .split(sep)
          .join(posix.sep);
        const virtualPath = posix.join(
          embeddedBuiltinIncludeRoot,
          relativePath
        );
        const stats = statSync(filePath);
        const file: EmbeddedBuiltinFile = {
          content: readFileSync(filePath, 'utf8'),
          mtimeUnixSeconds: Math.floor(stats.mtimeMs / 1000),
        };
        return [virtualPath, file];
      })
    );

    return [
      `export const wasmBase64 = ${JSON.stringify(
        readFileSync(wasmPath).toString('base64')
      )};`,
      `export const builtinFiles = ${JSON.stringify(builtinFiles)};`,
    ].join('\n');
  },
});

const createCliShebangPlugin = (): Plugin => ({
  name: 'chibicc-dumper-cli-shebang',
  renderChunk: (code, chunk) => {
    if (!/^main\.(mjs|cjs)$/.test(chunk.fileName)) {
      return null;
    }

    return `${cliShebang}\n${code.replace(/^#![^\n]*\n/, '')}`;
  },
});

export default defineConfig({
  plugins: [
    prettierMax({
      typescript: 'tsconfig.tests.json',
    }),
    createEmbeddedAssetsPlugin(),
    createCliShebangPlugin(),
    emsdkEnv({
      srcDir: '.',
      common: {
        includeDirs: [],
        options: ['-std=c11', '-sSUPPORT_LONGJMP=wasm'],
        linkOptions: ['--no-entry'],
        linkDirectives: {
          STANDALONE_WASM: 1,
          ALLOW_MEMORY_GROWTH: 1,
          SUPPORT_LONGJMP: 'wasm',
        },
      },
      targets: {
        libchibiccdumpercore: {
          type: 'archive',
          sources: [
            source('chibicc/driver.c'),
            source('chibicc/dump.c'),
            source('chibicc/hashmap.c'),
            source('chibicc/host.c'),
            source('chibicc/parse.c'),
            source('chibicc/preprocess.c'),
            source('chibicc/strings.c'),
            source('chibicc/tokenize.c'),
            source('chibicc/type.c'),
            source('chibicc/unicode.c'),
          ],
        },
        chibiccDumper: {
          outFile: 'chibicc-dumper.wasm',
          linkOptions: ['-lchibiccdumpercore'],
          sources: [
            source('chibicc/wasm/wasm_api.c'),
            source('chibicc/wasm/wasm_host.c'),
          ],
          exports: [
            '_malloc',
            '_free',
            '_chibicc_wasm_run',
            '_chibicc_wasm_get_output_ptr',
            '_chibicc_wasm_get_output_len',
            '_chibicc_wasm_get_error_ptr',
            '_chibicc_wasm_get_error_len',
          ],
        },
      },
    }),
    screwUp({
      outputMetadataFile: true,
      checkWorkingDirectoryStatus: false,
    }),
    dts({
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: source('src/index.ts'),
        main: source('src/main.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    target: 'es2020',
    sourcemap: true,
    minify: false,
    emptyOutDir: false,
  },
});
