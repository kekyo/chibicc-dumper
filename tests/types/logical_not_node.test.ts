import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLogicalNotNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_NOT', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperLogicalNotNode>();
  expect(node.lhs).toBeDefined();
});
