import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperShiftLeftNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_SHL', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperShiftLeftNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
