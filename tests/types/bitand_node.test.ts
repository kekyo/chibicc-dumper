import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperBitAndNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_BITAND', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperBitAndNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
