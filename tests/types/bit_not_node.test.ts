import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperBitNotNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_BITNOT', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperBitNotNode>();
  expect(node.lhs).toBeDefined();
});
