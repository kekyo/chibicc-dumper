import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperDoNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_DO', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperDoNode>();
  expect(node.cond).toBeDefined();
  expect(node.then).toBeDefined();
  expect(node.breakLabel.length).toBeGreaterThan(0);
  expect(node.continueLabel.length).toBeGreaterThan(0);
});
