import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperCastNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_CAST', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperCastNode>();
  expect(node.lhs).toBeDefined();
  expect(node.typeId).toBeGreaterThan(0);
});
