import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLogicalOrNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_LOGOR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperLogicalOrNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
