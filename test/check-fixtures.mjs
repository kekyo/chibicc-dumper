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

const requireHeaderComment = (holder, relpath, label, text) => {
  if (!holder) fail(`${relpath}: missing holder for ${label}`);
  const comments = holder.headerComments ?? [];
  if (comments.length !== 1)
    fail(`${relpath}: expected exactly one header comment for ${label}`);
  if (comments[0].text !== text)
    fail(
      `${relpath}: unexpected header comment for ${label}: ${JSON.stringify(
        comments[0].text
      )}`
    );
};

const requireStructMemberHeaderComment = (
  data,
  relpath,
  structKind,
  memberName,
  text
) => {
  const ty = data.types.find(
    (candidate) =>
      candidate.kind === structKind &&
      (candidate.members ?? []).some((member) => member.name === memberName)
  );

  if (!ty)
    fail(`${relpath}: missing ${structKind} containing member ${memberName}`);

  const member = ty.members.find((candidate) => candidate.name === memberName);
  requireHeaderComment(member, relpath, `${structKind}.${memberName}`, text);
};

const requireParseMetadata = (data, relpath) => {
  if (!Array.isArray(data.scopes))
    fail(`${relpath}: missing scopes metadata array`);
  if (!Array.isArray(data.tags))
    fail(`${relpath}: missing tags metadata array`);
  if (!Array.isArray(data.typedefs))
    fail(`${relpath}: missing typedefs metadata array`);
};

const requireScopeKind = (data, relpath, kind) => {
  if (!data.scopes.some((scope) => scope.kind === kind))
    fail(`${relpath}: missing scope kind ${kind}`);
};

const findTypeById = (data, relpath, typeId) => {
  const ty = data.types.find((candidate) => candidate.id === typeId);
  if (!ty) fail(`${relpath}: missing type ${typeId}`);
  return ty;
};

const findTaggedType = (data, relpath, tag, kind) => {
  const ty = data.types.find(
    (candidate) => candidate.tag === tag && candidate.kind === kind
  );
  if (!ty) fail(`${relpath}: missing ${kind} tag ${tag}`);
  return ty;
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
  'test/comments.c': (data) => {
    const globals = new Map(data.ast.globals.map((obj) => [obj.name, obj]));
    requireHeaderComment(
      globals.get('global_value'),
      'test/comments.c',
      'global_value',
      ' global value '
    );
    requireHeaderComment(
      globals.get('documented_function'),
      'test/comments.c',
      'documented_function',
      ' function comment line 1\n function comment line 2'
    );
    requireStructMemberHeaderComment(
      data,
      'test/comments.c',
      'TY_STRUCT',
      'first',
      ' first member'
    );
    requireStructMemberHeaderComment(
      data,
      'test/comments.c',
      'TY_STRUCT',
      'second',
      ' second member '
    );
  },
  'test/type-meta.c': (data) => {
    requireParseMetadata(data, 'test/type-meta.c');
    requireScopeKind(data, 'test/type-meta.c', 'translation-unit');
    requireScopeKind(data, 'test/type-meta.c', 'function');
    requireScopeKind(data, 'test/type-meta.c', 'block');

    const rootScope = data.scopes.find(
      (scope) => scope.kind === 'translation-unit'
    );
    if (!rootScope) fail('test/type-meta.c: missing translation-unit scope');

    const forwardType = findTaggedType(
      data,
      'test/type-meta.c',
      'Forward',
      'TY_STRUCT'
    );
    if (!forwardType.tagToken || forwardType.tagToken.lexeme !== 'Forward')
      fail('test/type-meta.c: missing struct tag token for Forward');

    const forwardTags = data.tags.filter((entry) => entry.name === 'Forward');
    if (forwardTags.length !== 2)
      fail(
        'test/type-meta.c: expected forward declaration and definition for Forward'
      );
    if (!forwardTags.some((entry) => entry.isDefinition === false))
      fail('test/type-meta.c: missing non-defining Forward tag entry');
    if (!forwardTags.some((entry) => entry.isDefinition === true))
      fail('test/type-meta.c: missing defining Forward tag entry');
    if (!forwardTags.every((entry) => entry.typeId === forwardType.id))
      fail('test/type-meta.c: Forward tag entries must resolve to one type');

    const hiddenType = findTaggedType(
      data,
      'test/type-meta.c',
      'Hidden',
      'TY_STRUCT'
    );
    const hiddenTypedef = data.typedefs.find(
      (entry) => entry.name === 'Hidden'
    );
    if (!hiddenTypedef) fail('test/type-meta.c: missing Hidden typedef');
    if (hiddenTypedef.typeId !== hiddenType.id)
      fail('test/type-meta.c: Hidden typedef must resolve to Hidden struct');

    const boxType = findTaggedType(data, 'test/type-meta.c', 'Box', 'TY_UNION');
    const boxAlias = data.typedefs.find((entry) => entry.name === 'BoxAlias');
    if (!boxAlias || boxAlias.typeId !== boxType.id)
      fail('test/type-meta.c: missing BoxAlias typedef metadata');

    const colorType = findTaggedType(
      data,
      'test/type-meta.c',
      'Color',
      'TY_ENUM'
    );
    const colorAlias = data.typedefs.find(
      (entry) => entry.name === 'ColorAlias'
    );
    if (!colorAlias || colorAlias.typeId !== colorType.id)
      fail('test/type-meta.c: missing ColorAlias typedef metadata');

    const forwardAlias = data.typedefs.find(
      (entry) => entry.name === 'ForwardAlias'
    );
    if (!forwardAlias || forwardAlias.typeId !== forwardType.id)
      fail('test/type-meta.c: missing ForwardAlias typedef metadata');

    const valueAliases = data.typedefs.filter(
      (entry) => entry.name === 'ValueAlias'
    );
    if (valueAliases.length !== 2)
      fail('test/type-meta.c: expected global and local ValueAlias typedefs');

    const valueAliasKinds = new Set(
      valueAliases.map(
        (entry) => findTypeById(data, 'test/type-meta.c', entry.typeId).kind
      )
    );
    if (!valueAliasKinds.has('TY_INT') || !valueAliasKinds.has('TY_LONG'))
      fail('test/type-meta.c: ValueAlias typedefs must cover int and long');
    if (!valueAliases.some((entry) => entry.scopeId === rootScope.id))
      fail('test/type-meta.c: missing global ValueAlias typedef scope');
    if (!valueAliases.some((entry) => entry.scopeId !== rootScope.id))
      fail('test/type-meta.c: missing local ValueAlias typedef scope');

    const localTag = data.tags.find((entry) => entry.name === 'LocalTag');
    if (!localTag || localTag.scopeId === rootScope.id)
      fail('test/type-meta.c: LocalTag must belong to a nested scope');
    const localTagType = findTypeById(
      data,
      'test/type-meta.c',
      localTag.typeId
    );
    if (localTagType.tag !== 'LocalTag')
      fail('test/type-meta.c: missing LocalTag type metadata');

    const localTagAlias = data.typedefs.find(
      (entry) => entry.name === 'LocalTagAlias'
    );
    if (!localTagAlias || localTagAlias.scopeId !== localTag.scopeId)
      fail('test/type-meta.c: LocalTagAlias must match LocalTag scope');
    if (localTagAlias.typeId !== localTag.typeId)
      fail('test/type-meta.c: LocalTagAlias must resolve to LocalTag type');
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
  'test/comments.c': (data) => {
    requireTokenKind(data, 'test/comments.c', 'TK_COMMENT');

    const lineComment = data.tokens.find(
      (tok) => tok.kind === 'TK_COMMENT' && tok.commentStyle === 'line'
    );
    if (!lineComment) fail('test/comments.c: missing line comment token');
    if (lineComment.text !== ' ignored by blank line')
      fail(
        `test/comments.c: unexpected line comment text: ${JSON.stringify(
          lineComment.text
        )}`
      );

    const blockComment = data.tokens.find(
      (tok) => tok.kind === 'TK_COMMENT' && tok.commentStyle === 'block'
    );
    if (!blockComment) fail('test/comments.c: missing block comment token');
    if (blockComment.endLine !== blockComment.line)
      fail('test/comments.c: expected single-line block comment span');
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
