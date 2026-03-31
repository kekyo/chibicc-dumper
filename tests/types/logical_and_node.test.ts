import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLogicalAndNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_LOGAND', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperLogicalAndNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
