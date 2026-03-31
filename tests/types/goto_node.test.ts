import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperGotoNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_GOTO', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperGotoNode>();
  expect(node.uniqueLabel.length).toBeGreaterThan(0);
});
