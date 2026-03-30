import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type WasmApiModule = typeof import('../src/index');

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distModuleUrl = new URL('../dist/index.mjs', import.meta.url);
const tempDirectories: string[] = [];
let wasmApi: WasmApiModule;

const createTempProject = (
  files: Readonly<Record<string, string>>
): { readonly directory: string; readonly entryPath: string } => {
  const directory = mkdtempSync(join(tmpdir(), 'chibicc-dumper-wasm-'));
  tempDirectories.push(directory);

  for (const [relativePath, content] of Object.entries(files)) {
    const outputPath = join(directory, relativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, 'utf8');
  }

  return {
    directory,
    entryPath: join(directory, 'main.c'),
  };
};

const runNativeDump = (entryPath: string, args: readonly string[]): unknown => {
  const stdout = execFileSync('./chibicc-dumper', [...args, entryPath], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return JSON.parse(stdout);
};

beforeAll(async () => {
  execFileSync('make', ['chibicc-dumper'], {
    cwd: rootDir,
    stdio: 'pipe',
  });
  wasmApi = (await import(distModuleUrl.href)) as WasmApiModule;
});

afterAll(() => {
  for (const directory of tempDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('embedded chibicc-dumper wasm api', () => {
  it('returns JSON text and parsed JSON for a simple translation unit', async () => {
    const options = {
      inputPath: 'main.c',
      source: 'int main(void) { return 0; }',
      dumpTokens: true,
      dumpAst: true,
    } as const;
    const json = await wasmApi.dumpJson(options);
    const parsed = await wasmApi.dump<Record<string, unknown>>(options);

    expect(json.startsWith('{')).toBe(true);
    expect(parsed).toHaveProperty('tokens');
    expect(parsed).toHaveProperty('ast');
  });

  it('resolves builtin headers from the embedded include tree', async () => {
    const parsed = await wasmApi.dump<Record<string, unknown>>({
      inputPath: 'main.c',
      source:
        '#include <stddef.h>\nsize_t value;\nint main(void) { return 0; }\n',
      dumpTokens: false,
      dumpAst: true,
    });

    expect(parsed).toHaveProperty('ast.globals');
  });

  it('resolves include files through the host callback', async () => {
    const json = await wasmApi.dumpJson({
      inputPath: 'main.c',
      source: '#include "foo.h"\nint main(void) { return VALUE; }\n',
      dumpTokens: false,
      dumpAst: true,
      host: {
        readFile: (path) =>
          path === '/workspace/foo.h' ? '#define VALUE 7\n' : undefined,
      },
    });

    expect(json).toContain('"value":7');
  });

  it('surfaces compiler diagnostics as structured errors', async () => {
    await expect(
      wasmApi.dumpJson({
        inputPath: 'main.c',
        source: 'int main(void) { return 0 }\n',
        dumpTokens: false,
        dumpAst: true,
      })
    ).rejects.toMatchObject({
      name: 'ChibiccDumperRunError',
      diagnostic: expect.stringContaining('/workspace/main.c'),
    });
  });

  it('reuses the compiled module across 100 fresh instances', async () => {
    for (let index = 0; index < 100; index += 1) {
      const json = await wasmApi.dumpJson({
        inputPath: 'main.c',
        source: `int main(void) { return ${index}; }\n`,
        dumpTokens: false,
        dumpAst: true,
      });

      expect(json).toContain(`"value":${index}`);
    }
  });

  it('matches the native dumper output for a representative fixture', async () => {
    const project = createTempProject({
      'main.c': 'int add(int a, int b) { return a + b; }\n',
    });
    const nativeDump = runNativeDump(project.entryPath, [
      '--dump-tokens',
      '--dump-ast',
    ]);
    const wasmDump = await wasmApi.dump<Record<string, unknown>>({
      inputPath: project.entryPath,
      source: 'int add(int a, int b) { return a + b; }\n',
      dumpTokens: true,
      dumpAst: true,
    });

    expect(wasmDump).toEqual(nativeDump);
  });
});
