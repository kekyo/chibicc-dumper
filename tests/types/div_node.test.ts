import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperDivNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_DIV', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperDivNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
