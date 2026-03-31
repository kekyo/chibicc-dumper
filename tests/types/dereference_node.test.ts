import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperDereferenceNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_DEREF', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperDereferenceNode>();
  expect(node.lhs).toBeDefined();
});
