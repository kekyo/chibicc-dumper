import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperStatementExpressionNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_STMT_EXPR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperStatementExpressionNode>();
  expect(Array.isArray(node.body)).toBe(true);
});
