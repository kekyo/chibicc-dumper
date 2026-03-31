import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLabelValueNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_LABEL_VAL', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperLabelValueNode>();
  expect(node.label.length).toBeGreaterThan(0);
  expect(node.uniqueLabel.length).toBeGreaterThan(0);
});
