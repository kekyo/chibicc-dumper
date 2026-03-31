import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperConditionalNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_COND', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperConditionalNode>();
  expect(node.cond).toBeDefined();
  expect(node.then).toBeDefined();
  expect(node.else).toBeDefined();
});
