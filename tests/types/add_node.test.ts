import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperAddNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_ADD', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperAddNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
