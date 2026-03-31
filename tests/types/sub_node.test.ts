import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperSubNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_SUB', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperSubNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
