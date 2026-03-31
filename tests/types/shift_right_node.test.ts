import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperShiftRightNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_SHR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperShiftRightNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
