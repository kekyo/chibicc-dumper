import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperVariableNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_VAR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperVariableNode>();
  expect(node.var.name.length).toBeGreaterThanOrEqual(0);
});
