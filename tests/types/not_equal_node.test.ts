import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperNotEqualNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_NE', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperNotEqualNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
