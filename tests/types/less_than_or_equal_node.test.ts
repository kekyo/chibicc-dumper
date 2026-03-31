import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLessThanOrEqualNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_LE', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperLessThanOrEqualNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
