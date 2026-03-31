import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperMemzeroNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_MEMZERO', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperMemzeroNode>();
  expect(node.var.typeId).toBeGreaterThan(0);
});
