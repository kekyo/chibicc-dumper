import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLessThanNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_LT', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperLessThanNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
