import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperForNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_FOR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperForNode>();
  expect(node.then).toBeDefined();
  expect(node.breakLabel.length).toBeGreaterThan(0);
  expect(node.continueLabel.length).toBeGreaterThan(0);
});
