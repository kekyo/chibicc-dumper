import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperNegNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_NEG', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperNegNode>();
  expect(node.lhs).toBeDefined();
});
