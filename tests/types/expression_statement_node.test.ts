import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperExpressionStatementNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_EXPR_STMT', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperExpressionStatementNode>();
  expect(node.lhs).toBeDefined();
});
