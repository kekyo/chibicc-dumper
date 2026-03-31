import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperBitOrNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_BITOR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperBitOrNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
