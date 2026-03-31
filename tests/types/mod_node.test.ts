import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperModNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_MOD', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperModNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
