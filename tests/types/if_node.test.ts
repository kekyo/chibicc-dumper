import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperIfNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_IF', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperIfNode>();
  expect(node.cond).toBeDefined();
  expect(node.then).toBeDefined();
});
