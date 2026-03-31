import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperMulNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_MUL', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperMulNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
