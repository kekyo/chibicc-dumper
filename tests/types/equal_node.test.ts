import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperEqualNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_EQ', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperEqualNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
