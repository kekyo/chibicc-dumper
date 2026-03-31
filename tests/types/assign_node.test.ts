import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperAssignNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_ASSIGN', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperAssignNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
