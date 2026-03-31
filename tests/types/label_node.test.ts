import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLabelNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_LABEL', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperLabelNode>();
  expect(node.lhs).toBeDefined();
  expect(node.label.length).toBeGreaterThan(0);
  expect(node.uniqueLabel.length).toBeGreaterThan(0);
});
