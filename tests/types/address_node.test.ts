import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperAddressNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_ADDR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperAddressNode>();
  expect(node.lhs).toBeDefined();
});
