#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const resultsRoot = process.env.TEST_RESULTS_DIR;

const fail = (message) => {
  throw new Error(message);
};

if (!process.argv[2]) fail('usage: self-parse.mjs <compiler>');
if (!resultsRoot) fail('TEST_RESULTS_DIR is required');

const compiler = path.resolve(process.argv[2]);

const runAst = (relpath) => {
  const outputPath = path.join(resultsRoot, 'self-parse', `${relpath}.json`);
  const args = ['--dump-ast', '-o', outputPath];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (relpath.startsWith('test/')) args.push('-Iinclude', '-Itest');

  args.push(relpath);

  const proc = spawnSync(compiler, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (proc.error) throw proc.error;
  if (proc.status !== 0)
    fail(
      `${relpath}: compiler failed with status ${proc.status}\n${proc.stderr}`
    );

  const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  if (!('ast' in data) || !('types' in data))
    fail(`${relpath}: invalid AST dump shape`);
};

const listSources = (dirpath) =>
  fs
    .readdirSync(dirpath)
    .filter((name) => name.endsWith('.c'))
    .map((name) =>
      path.relative(ROOT, path.join(dirpath, name)).split(path.sep).join('/')
    )
    .sort();

const repoSources = listSources(path.join(ROOT, 'chibicc'));
const testSources = listSources(path.join(ROOT, 'test'));
const extraSources = ['test/common'];

let checked = 0;
for (const relpath of [...repoSources, ...testSources, ...extraSources]) {
  runAst(relpath);
  checked++;
}

console.log(`testing self-parse coverage (${checked} files) ... passed`);
console.log('OK');
