import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperBitXorNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_BITXOR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperBitXorNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
