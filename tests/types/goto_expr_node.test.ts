import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperGotoExprNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_GOTO_EXPR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperGotoExprNode>();
  expect(node.lhs).toBeDefined();
});
