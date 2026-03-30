#!/usr/bin/env node

import fs from 'node:fs';

const fail = (message) => {
  throw new Error(message);
};

const expect = (condition, message) => {
  if (!condition) fail(message);
};

const mode = process.argv[2];
const jsonPath = process.argv[3];

if (!mode || !jsonPath)
  fail('usage: check-json-dump.mjs <tokens|ast|both> <json-path>');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (mode === 'tokens') {
  expect('types' in data, 'missing types');
  expect('tokens' in data, 'missing tokens');
  expect(!('ast' in data), 'unexpected ast');
  expect(data.tokens[0]?.kind === 'TK_COMMENT', 'unexpected first token kind');
  expect(data.tokens[0]?.text === ' sample main', 'unexpected first comment text');
  expect(
    data.tokens.some((tok) => tok.kind === 'TK_COMMENT' && tok.commentStyle === 'block'),
    'missing block comment token'
  );
  expect(data.tokens.at(-1)?.kind === 'TK_EOF', 'unexpected last token kind');
  process.exit(0);
}

if (mode === 'ast') {
  expect('types' in data, 'missing types');
  expect(!('tokens' in data), 'unexpected tokens');
  expect('ast' in data, 'missing ast');

  const globals = data.ast.globals ?? [];
  const mainFns = globals.filter(
    (obj) => obj.isFunction && obj.name === 'main'
  );
  expect(mainFns.length === 1, 'expected exactly one main function');

  const mainFn = mainFns[0];
  expect(mainFn.body?.kind === 'ND_BLOCK', 'main body must be ND_BLOCK');
  expect(
    mainFn.headerComments?.[0]?.text === ' sample main',
    'main function must contain a header comment'
  );
  expect(
    (mainFn.body?.body ?? []).some((node) => node.kind === 'ND_RETURN'),
    'main body must contain ND_RETURN'
  );
  process.exit(0);
}

if (mode === 'both') {
  expect('types' in data, 'missing types');
  expect('tokens' in data, 'missing tokens');
  expect('ast' in data, 'missing ast');
  expect((data.tokens ?? []).length >= 2, 'expected at least two tokens');
  expect(
    data.ast.globals.some((obj) => obj.headerComments?.length === 1),
    'expected at least one AST header comment'
  );
  expect(data.ast.kind === 'program', 'unexpected ast root kind');
  process.exit(0);
}

fail(`unknown mode: ${mode}`);
