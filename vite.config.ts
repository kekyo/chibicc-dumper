import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import emsdkEnv from 'emsdk-env/vite';
import prettierMax from 'prettier-max';
import screwUp from 'screw-up';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const source = (path: string) => resolve(rootDir, path);

export default defineConfig({
  plugins: [
    prettierMax({
      typescript: 'tsconfig.tests.json',
    }),
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
            source('driver.c'),
            source('dump.c'),
            source('hashmap.c'),
            source('host.c'),
            source('parse.c'),
            source('preprocess.c'),
            source('strings.c'),
            source('tokenize.c'),
            source('type.c'),
            source('unicode.c'),
          ],
        },
        chibiccDumper: {
          outFile: 'chibicc-dumper.wasm',
          linkOptions: ['-lchibiccdumpercore'],
          sources: [source('wasm/wasm_api.c'), source('wasm/wasm_host.c')],
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
    }),
    dts({
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: source('src/index.ts'),
      name: 'chibicc-dumper-wasm',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    target: 'es2020',
    sourcemap: true,
    minify: false,
    emptyOutDir: false,
  },
});
