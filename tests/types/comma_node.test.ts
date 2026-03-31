import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperCommaNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_COMMA', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperCommaNode>();
  expect(node.lhs).toBeDefined();
  expect(node.rhs).toBeDefined();
});
