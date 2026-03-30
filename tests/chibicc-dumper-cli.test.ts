import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distCliPath = fileURLToPath(new URL('../dist/main.mjs', import.meta.url));
const nativeCliPath = resolve(rootDir, 'chibicc-dumper');
const tempDirectories: string[] = [];

const createTempProject = (
  files: Readonly<Record<string, string>>
): { readonly directory: string } => {
  const directory = mkdtempSync(join(tmpdir(), 'chibicc-dumper-cli-'));
  tempDirectories.push(directory);

  for (const [relativePath, content] of Object.entries(files)) {
    const outputPath = join(directory, relativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, 'utf8');
  }

  return {
    directory,
  };
};

const runNativeCli = (args: readonly string[], cwd: string): string =>
  execFileSync(nativeCliPath, [...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

const runNodeCli = (args: readonly string[], cwd: string): string =>
  execFileSync(process.execPath, [distCliPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

beforeAll(() => {
  execFileSync('make', ['chibicc-dumper'], {
    cwd: rootDir,
    stdio: 'pipe',
  });
});

afterAll(() => {
  for (const directory of tempDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('embedded chibicc-dumper cli', () => {
  it('matches the native cli JSON output', () => {
    const project = createTempProject({
      'main.c': 'int add(int a, int b) { return a + b; }\n',
    });

    const nativeOutput = runNativeCli(
      ['--dump-tokens', '--dump-ast', 'main.c'],
      project.directory
    );
    const nodeOutput = runNodeCli(
      ['--dump-tokens', '--dump-ast', 'main.c'],
      project.directory
    );

    expect(JSON.parse(nodeOutput)).toEqual(JSON.parse(nativeOutput));
  });

  it('accepts split -I arguments and matches native preprocessing output', () => {
    const project = createTempProject({
      'main.c': '#include <value.h>\nVALUE\n',
      'include/value.h': '#define VALUE 42\n',
    });

    const nativeOutput = runNativeCli(
      ['-E', '-Iinclude', 'main.c'],
      project.directory
    );
    const nodeOutput = runNodeCli(
      ['-E', '-I', 'include', 'main.c'],
      project.directory
    );

    expect(nodeOutput).toBe(nativeOutput);
  });

  it('writes dependency and main outputs like the native cli', () => {
    const project = createTempProject({
      'main.c': '#include "value.h"\nint value = VALUE;\n',
      'value.h': '#define VALUE 7\n',
    });

    runNativeCli(
      ['-MD', '-o', 'native.json', '--dump-ast', 'main.c'],
      project.directory
    );
    runNodeCli(
      ['-MD', '-o', 'cli.json', '--dump-ast', 'main.c'],
      project.directory
    );

    const nativeJson = readFileSync(
      join(project.directory, 'native.json'),
      'utf8'
    );
    const nodeJson = readFileSync(join(project.directory, 'cli.json'), 'utf8');
    const nativeDependencies = readFileSync(
      join(project.directory, 'native.d'),
      'utf8'
    );
    const nodeDependencies = readFileSync(
      join(project.directory, 'cli.d'),
      'utf8'
    );

    expect(JSON.parse(nodeJson)).toEqual(JSON.parse(nativeJson));
    expect(nodeDependencies).toBe(nativeDependencies);
  });
});
