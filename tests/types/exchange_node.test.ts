import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperExchangeNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_EXCH', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperExchangeNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
