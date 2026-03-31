import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperVariableLengthArrayPointerNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_VLA_PTR', (node) => {
  expectTypeOf(
    node
  ).toEqualTypeOf<ChibiccDumperVariableLengthArrayPointerNode>();
  expect(node.var.typeId).toBeGreaterThan(0);
});
