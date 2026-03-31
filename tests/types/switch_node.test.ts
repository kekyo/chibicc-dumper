import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperSwitchNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_SWITCH', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperSwitchNode>();
  expect(node.cond).toBeDefined();
  expect(node.then).toBeDefined();
  expect(node.breakLabel.length).toBeGreaterThan(0);
});
