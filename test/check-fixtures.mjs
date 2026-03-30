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

if (!process.argv[2]) fail('usage: check-fixtures.mjs <compiler>');
if (!resultsRoot) fail('TEST_RESULTS_DIR is required');

const compiler = path.resolve(process.argv[2]);

const runDump = (mode, relpath) => {
  const args = [mode];
  const modeName = mode === '--dump-ast' ? 'ast' : 'tokens';
  const outputPath = path.join(
    resultsRoot,
    'fixtures',
    modeName,
    `${relpath}.json`
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  args.push('-o', outputPath);

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

  return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
};

function* walkNode(node) {
  if (!node) return;

  yield node;

  for (const key of [
    'lhs',
    'rhs',
    'cond',
    'then',
    'else',
    'init',
    'inc',
    'casAddr',
    'casOld',
    'casNew',
    'atomicExpr',
  ]) {
    const child = node[key];
    if (child) yield* walkNode(child);
  }

  for (const key of ['body', 'args']) {
    for (const child of node[key] ?? []) yield* walkNode(child);
  }
}

function* walkProgramNodes(data) {
  for (const obj of data.ast.globals) {
    if (obj.isFunction && obj.body) yield* walkNode(obj.body);
  }
}

const countAssertCalls = (data) => {
  let count = 0;

  for (const node of walkProgramNodes(data)) {
    if (node.kind !== 'ND_FUNCALL') continue;

    if (node.lhs?.var?.name === 'assert') count++;
  }

  return count;
};

const requireNodeKinds = (data, relpath, ...kinds) => {
  const present = new Set();

  for (const node of walkProgramNodes(data)) present.add(node.kind);

  const missing = kinds.filter((kind) => !present.has(kind));
  if (missing.length > 0)
    fail(`${relpath}: missing node kinds: ${missing.join(', ')}`);
};

const requireAssertCount = (data, relpath) => {
  const source = fs.readFileSync(path.join(ROOT, relpath), 'utf8');
  const expected = source.split('ASSERT(').length - 1;
  const actual = countAssertCalls(data);

  if (actual !== expected)
    fail(
      `${relpath}: ASSERT count mismatch: expected ${expected}, got ${actual}`
    );
};

const requireFunctions = (data, relpath, ...names) => {
  const funcs = new Set(
    data.ast.globals.filter((obj) => obj.isFunction).map((obj) => obj.name)
  );

  const missing = names.filter((name) => !funcs.has(name));
  if (missing.length > 0)
    fail(`${relpath}: missing functions: ${missing.join(', ')}`);
};

const requirePackedStruct = (data, relpath) => {
  const hasPackedStruct = data.types.some(
    (ty) => ty.kind === 'TY_STRUCT' && ty.isPacked
  );

  if (!hasPackedStruct)
    fail(`${relpath}: expected at least one packed struct type`);
};

const requireVlaSupport = (data, relpath) => {
  const hasVlaType = data.types.some((ty) => ty.kind === 'TY_VLA');
  const hasVlaNode = [...walkProgramNodes(data)].some(
    (node) => node.kind === 'ND_VLA_PTR'
  );

  if (!hasVlaType || !hasVlaNode)
    fail(`${relpath}: expected VLA type and VLA node`);
};

const requireGlobalInitializers = (data, relpath) => {
  const globals = data.ast.globals.filter((obj) => !obj.isFunction);
  const hasData = globals.some((obj) => obj.initDataBytes);
  const hasReloc = globals.some((obj) => obj.relocations);

  if (!hasData || !hasReloc)
    fail(`${relpath}: expected initialized globals and relocations`);
};

const requireToken = (data, relpath, lexeme, kind) => {
  const found = data.tokens.some(
    (tok) => tok.lexeme === lexeme && tok.kind === kind
  );
  if (!found)
    fail(`${relpath}: missing token ${JSON.stringify(lexeme)} (${kind})`);
};

const requireTokenKind = (data, relpath, kind) => {
  const found = data.tokens.some((tok) => tok.kind === kind);
  if (!found) fail(`${relpath}: missing token kind ${kind}`);
};

const astCases = {
  'test/arith.c': (data) => {
    requireAssertCount(data, 'test/arith.c');
    requireNodeKinds(
      data,
      'test/arith.c',
      'ND_ADD',
      'ND_SUB',
      'ND_MUL',
      'ND_DIV',
      'ND_MOD',
      'ND_SHL',
      'ND_SHR',
      'ND_COND',
      'ND_COMMA',
      'ND_CAST'
    );
  },
  'test/control.c': (data) => {
    requireAssertCount(data, 'test/control.c');
    requireNodeKinds(
      data,
      'test/control.c',
      'ND_IF',
      'ND_FOR',
      'ND_DO',
      'ND_SWITCH',
      'ND_CASE',
      'ND_GOTO',
      'ND_LABEL',
      'ND_GOTO_EXPR',
      'ND_LABEL_VAL'
    );
  },
  'test/initializer.c': (data) => {
    requireAssertCount(data, 'test/initializer.c');
    requireGlobalInitializers(data, 'test/initializer.c');
  },
  'test/function.c': (data) => {
    requireAssertCount(data, 'test/function.c');
    requireFunctions(data, 'test/function.c', 'main', 'add2', 'fib');
  },
  'test/attribute.c': (data) => {
    requireAssertCount(data, 'test/attribute.c');
    requirePackedStruct(data, 'test/attribute.c');
  },
  'test/atomic.c': (data) => {
    requireAssertCount(data, 'test/atomic.c');
    requireNodeKinds(data, 'test/atomic.c', 'ND_CAS', 'ND_EXCH');
  },
  'test/vla.c': (data) => {
    requireAssertCount(data, 'test/vla.c');
    requireVlaSupport(data, 'test/vla.c');
  },
};

const tokenCases = {
  'test/macro.c': (data) => {
    requireToken(data, 'test/macro.c', 'ASSERT', 'TK_IDENT');
    requireToken(data, 'test/macro.c', '__LINE__', 'TK_IDENT');
  },
  'test/unicode.c': (data) => {
    requireToken(data, 'test/unicode.c', 'π', 'TK_IDENT');
    requireTokenKind(data, 'test/unicode.c', 'TK_STR');
  },
  'test/literal.c': (data) => {
    requireToken(data, 'test/literal.c', '0b101111', 'TK_PP_NUM');
  },
};

for (const [relpath, check] of Object.entries(astCases)) {
  check(runDump('--dump-ast', relpath));
  console.log(`testing AST fixture ${relpath} ... passed`);
}

for (const [relpath, check] of Object.entries(tokenCases)) {
  check(runDump('--dump-tokens', relpath));
  console.log(`testing token fixture ${relpath} ... passed`);
}

console.log('OK');
